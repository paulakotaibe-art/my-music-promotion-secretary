-- Run as postgres on a staging database (or reviewed rollback-only production check).
-- No external API calls; all fixture rows and temporary rollout changes roll back.
begin;
insert into auth.users(id,email,created_at)values('00000000-0000-4000-8000-000000000071','tiktok-rollback-71@example.invalid',now()),('00000000-0000-4000-8000-000000000072','tiktok-rollback-72@example.invalid',now());
insert into public.campaign_drafts(id,user_id,title,caption,media_url,media_kind,platforms)
select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'00000000-0000-4000-8000-000000000071','Test video','Test caption','https://example.invalid/test.mp4','video',array['tiktok']from generate_series(101,105)n;
insert into public.social_connections(user_id,provider,account_id,account_name,encrypted_connection)values('00000000-0000-4000-8000-000000000071','tiktok','rollback-creator','Test creator','not-a-real-connection');
update app_private.tiktok_config set enabled=true,audited=true,url_verified=true;
update app_private.billing_config set subscriber_launch=true;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000071',true);
do $$
declare i int;e jsonb;r jsonb;failed boolean;sid uuid;did uuid;
begin
 assert(public.tiktok_publishing_access()->>'enabled')::boolean,'Expected trial access in isolated transaction';
 for i in 101..103 loop
  did:=('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;sid:=('00000000-0000-4000-8000-'||lpad((i+100)::text,12,'0'))::uuid;
  e:=jsonb_build_object('id',sid,'userId',auth.uid(),'draftId',did,'mediaUrl','https://example.invalid/test.mp4','openId','rollback-creator','rightsConfirmed',true,'musicConsent',true,'confirmed',true,'privacy','PUBLIC_TO_EVERYONE','publishAt',now()+interval '1 hour','reviewedAt',now());
  perform public.reserve_tiktok_post(sid,did,e,'fixture-signature-not-valid-for-worker');
 end loop;
 assert(public.promotion_usage()->>'remaining')::int=0,'Trial cap must be shared';
 assert(select count(*)=3 from public.tiktok_posts),'Expected three own posts';
 -- Full allowance cannot be bypassed by rescheduling, but an existing reservation can move.
 e:=e||jsonb_build_object('publishAt',now()+interval '2 hours');perform public.reserve_tiktok_post(sid,did,e,'fixture');
 assert(public.promotion_usage()->>'remaining')::int=0,'Rescheduling cannot reserve a second credit';
 did:='00000000-0000-4000-8000-000000000104';sid:='00000000-0000-4000-8000-000000000204';e:=e||jsonb_build_object('id',sid,'draftId',did);
 failed:=false;begin perform public.reserve_tiktok_post(sid,did,e,'fixture');exception when raise_exception then failed:=true;end;assert failed,'Fourth trial post should fail';
 perform public.control_tiktok_post('00000000-0000-4000-8000-000000000201','cancel');assert(public.promotion_usage()->>'remaining')::int=1,'Cancellation must release one credit';
 e:=e||jsonb_build_object('publishAt',null);perform public.reserve_tiktok_post(sid,did,e,'fixture');r:=public.claim_tiktok_now(sid);
 assert r->>'runToken' is not null,'Immediate attempt must have a run capability';
 failed:=false;begin perform public.claim_tiktok_now(sid);exception when raise_exception then failed:=true;end;assert failed,'A publication may be claimed only once';
 failed:=false;begin perform public.control_tiktok_post(sid,'cancel');exception when raise_exception then failed:=true;end;assert failed,'A claimed attempt cannot be cancelled';
 assert public.save_tiktok_run(sid,r->>'runToken','existing-publish-id',jsonb_build_object('id',sid,'state','processing'),'fixture-receipt',true),'Worker should save existing identity';
 failed:=false;begin perform public.save_tiktok_run(sid,r->>'runToken',null,jsonb_build_object('id',sid,'state','processing'),'fixture',true);exception when raise_exception then failed:=true;end;assert failed,'A completion capability must be single-use';
 -- Refresh capabilities cannot be requested for another app user.
 failed:=false;begin perform public.claim_tiktok_refresh('00000000-0000-4000-8000-000000000072',null);exception when raise_exception then failed:=true;end;assert failed,'Cross-user refresh must fail';
 r:=public.claim_tiktok_refresh(auth.uid(),null);assert r->>'lease' is not null,'Refresh lease expected';assert(public.claim_tiktok_refresh(auth.uid(),null)='{}'::jsonb),'Second refresh must wait';assert public.finish_tiktok_refresh(auth.uid(),(r->>'lease')::uuid,null),'Release own refresh lease';assert not public.finish_tiktok_refresh(auth.uid(),(r->>'lease')::uuid,null),'Refresh lease must be single-use';
 -- Authenticated clients cannot directly change publication or allowance fields.
 failed:=false;begin update public.tiktok_posts set state='queued';exception when insufficient_privilege then failed:=true;end;assert failed,'Direct state update must fail';
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000072',true);
do $$declare failed boolean;begin
 assert(select count(*)=0 from public.tiktok_posts),'RLS must hide another users posts';
 failed:=false;begin perform public.control_tiktok_post('00000000-0000-4000-8000-000000000202','cancel');exception when raise_exception then failed:=true;end;assert failed,'Cross-user cancellation must fail';
end $$;
reset role;
-- Close access after reservation; status reads remain possible but new dispatch is blocked.
update app_private.tiktok_config set enabled=false;
do $$declare r public.tiktok_posts%rowtype;begin select * into r from public.tiktok_posts where id='00000000-0000-4000-8000-000000000202';assert not app_private.tiktok_dispatch_allowed(r),'Closed integration must block dispatch';end $$;
-- A one-time dispatch nonce can only claim read-only status for the existing publish ID.
update public.tiktok_posts set updated_at=now()-interval '2 minutes' where id='00000000-0000-4000-8000-000000000204';
insert into app_private.tiktok_nonces values(encode(extensions.digest(repeat('a',64),'sha256'),'hex'),now()+interval '2 minutes');
set local role anon;
do $$declare j jsonb;failed boolean;begin
 j:=public.claim_tiktok_dispatch(repeat('a',64));assert jsonb_array_length(j)=1,'Only processing post should be claimed';assert(j->0->>'statusOnly')::boolean,'Existing ID must get a status-only job';
 failed:=false;begin perform public.claim_tiktok_dispatch(repeat('a',64));exception when raise_exception then failed:=true;end;assert failed,'Dispatch nonce cannot be replayed';
 failed:=false;begin perform public.claim_tiktok_refresh('00000000-0000-4000-8000-000000000071',repeat('f',64));exception when raise_exception then failed:=true;end;assert failed,'Invalid capability cannot access a connection';
end $$;
reset role;
rollback;
select 'TikTok rollback-only database assertions passed' as result;
