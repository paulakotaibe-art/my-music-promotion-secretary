-- Run as a single transaction. All fixtures and changes are rolled back.
begin;
do $$
declare uid uuid:=gen_random_uuid();draft uuid;result jsonb;i int;blocked boolean:=false;old_exempt int; claim1 jsonb; claim2 jsonb;
begin
 select count(*) into old_exempt from public.campaign_submissions where quota_exempt;
 insert into auth.users(id,email,created_at) values(uid,uid::text||'@billing-test.invalid',now());
 perform set_config('request.jwt.claim.sub',uid::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
 result:=public.promotion_usage(now()+interval '2 minutes');
 if (result->>'canPublish')::boolean then raise exception 'Launch gate bypass';end if;
 begin perform public.billing_bridge('wrong-token','config');raise exception 'Bridge bypass';exception when raise_exception then if sqlerrm='Bridge bypass' then raise;end if;end;
 update app_private.billing_config set subscriber_launch=true;
 for i in 1..3 loop
  draft:=gen_random_uuid();
  insert into public.campaign_drafts(id,user_id,title,caption,platforms)values(draft,uid,'Test','Test',array['youtube','facebook','tiktok']);
  insert into public.campaign_submissions(id,user_id,draft_id,snapshot,quota_exempt,quota_released) values(gen_random_uuid(),uid,draft,jsonb_build_object('planned_at',now()+interval '1 hour','brand_id','test-profile'),true,true);
 end loop;
 result:=public.promotion_usage(now()+interval '2 minutes');
 if (result->>'remaining')::int<>0 or (result->>'used')::int<>3 then raise exception 'Trial count or spoofed exemption bypass';end if;
 begin
  draft:=gen_random_uuid();insert into public.campaign_drafts(id,user_id,title,caption,platforms)values(draft,uid,'Fourth','Test',array['youtube']);
  insert into public.campaign_submissions(id,user_id,draft_id,snapshot)values(gen_random_uuid(),uid,draft,jsonb_build_object('planned_at',now()+interval '1 hour','brand_id','test-profile'));
 exception when raise_exception then blocked:=sqlerrm like '%allowance%';end;
 if not blocked then raise exception 'Fourth trial promotion was allowed';end if;
 if has_column_privilege('authenticated','public.campaign_submissions','quota_exempt','UPDATE') or has_table_privilege('authenticated','app_private.subscriptions','UPDATE') then raise exception 'Client billing privilege leak';end if;
 insert into app_private.billing_customers(user_id,customer_id,livemode) values(uid,'cus_fixture',true);
 update app_private.billing_config set bridge_hash=encode(extensions.digest('fixture-only-token','sha256'),'hex');
 perform public.billing_bridge('fixture-only-token','set_hook','{"livemode":true,"secret":"live-fixture"}');
 perform public.billing_bridge('fixture-only-token','set_hook','{"livemode":false,"secret":"test-fixture"}');
 perform public.billing_bridge('fixture-only-token','set_portal','{"livemode":true,"id":"live-portal"}');
 perform public.billing_bridge('fixture-only-token','set_portal','{"livemode":false,"id":"test-portal"}');
 result:=public.billing_bridge('fixture-only-token','config','{"livemode":true}');
 if result->>'webhookSecret'<>'live-fixture' or result->>'portalConfiguration'<>'live-portal' then raise exception 'Test setup changed live configuration';end if;
 result:=public.billing_bridge('fixture-only-token','config','{"livemode":false}');
 if result->>'webhookSecret'<>'test-fixture' or result->>'portalConfiguration'<>'test-portal' then raise exception 'Sandbox configuration missing';end if;
 claim1:=public.billing_bridge('fixture-only-token','checkout_claim',jsonb_build_object('userId',uid,'livemode',true,'plan','starter'));
 claim2:=public.billing_bridge('fixture-only-token','checkout_claim',jsonb_build_object('userId',uid,'livemode',true,'plan','growth'));
 if claim1->>'nonce'<>claim2->>'nonce' or claim2->>'plan'<>'starter' then raise exception 'Parallel plan selection bypassed single checkout';end if;
 perform public.billing_bridge('fixture-only-token','checkout_saved',jsonb_build_object('userId',uid,'livemode',true,'nonce',claim1->>'nonce','id','cs_fixture'));
 claim2:=public.billing_bridge('fixture-only-token','checkout_claim',jsonb_build_object('userId',uid,'livemode',true,'plan','starter'));
 if claim2->>'id'<>'cs_fixture' then raise exception 'Existing checkout session was not reused';end if;
 insert into app_private.subscriptions values('sub_fixture',uid,'cus_fixture','growth','active',now()+interval '1 year',false,1);
 result:=public.promotion_usage(now()+interval '2 minutes');
 if result->>'plan'<>'trial' then raise exception 'Test payment granted live allowance';end if;
 update app_private.subscriptions set livemode=true;
 result:=public.promotion_usage(now()+interval '2 minutes');
 if result->>'plan'<>'growth' or (result->>'remaining')::int<>7 then raise exception 'Paid weekly allowance not applied';end if;
 update app_private.subscriptions set status='past_due';
 result:=public.promotion_usage(now()+interval '2 minutes');
 if result->>'plan'='growth' then raise exception 'Failed payment kept paid allowance';end if;
 update app_private.subscriptions set status='active',period_end=now()+interval '30 minutes';
 result:=public.promotion_usage(now()+interval '2 hours');
 if (result->>'canPublish')::boolean then raise exception 'Scheduled beyond paid term';end if;
 if extract(epoch from ((timestamp '2027-03-29' at time zone 'Europe/London')-(timestamp '2027-03-22' at time zone 'Europe/London')))/3600<>167 then raise exception 'DST week boundary incorrect';end if;
 perform set_config('request.jwt.claim.sub','d933f707-f948-410d-b107-9ba32b37274c',true);
 perform set_config('request.jwt.claims','{"sub":"d933f707-f948-410d-b107-9ba32b37274c","role":"authenticated"}',true);
 result:=public.promotion_usage();if not (result->>'owner')::boolean then raise exception 'Owner exemption missing';end if;
 if old_exempt<>(select count(*) from public.campaign_submissions where quota_exempt) then raise exception 'Existing reservation changed';end if;
end $$;
rollback;

