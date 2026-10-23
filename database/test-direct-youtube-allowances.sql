begin;

do $$
declare uid uuid:=gen_random_uuid();did uuid;rid uuid;u jsonb;i int;blocked boolean;owners_before int;
begin
 select count(*) into owners_before from public.youtube_uploads where user_id in(select user_id from app_private.app_owners);
 insert into auth.users(id,email,created_at)values(uid,uid||'@quota.invalid',now());
 perform set_config('request.jwt.claim.sub',uid::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
 insert into public.youtube_connections(user_id,channel_id,channel_title,encrypted_tokens)values(uid,'fixture-channel','Fixture','unused-encrypted-fixture');
 did:=gen_random_uuid();insert into public.campaign_drafts(id,user_id,title,caption,platforms)values(did,uid,'Fixture','Caption',array['youtube']);
 blocked:=false;
 begin insert into public.youtube_uploads values(gen_random_uuid(),uid,did,'fixture-channel','public','{"privacyStatus":"public"}',now(),null,null);
 exception when raise_exception then blocked:=sqlerrm like '%Subscriber publishing%';end;
 if not blocked then raise exception 'Launch gate bypass';end if;
 update app_private.billing_config set subscriber_launch=true;
 blocked:=false;
 begin insert into public.youtube_uploads values(gen_random_uuid(),uid,did,'fixture-channel','private','{"privacyStatus":"private"}',now(),null,null);
 exception when raise_exception then blocked:=sqlerrm like '%Private tests%';end;
 if not blocked then raise exception 'Unlimited private uploads allowed';end if;
 for i in 1..3 loop
 did:=gen_random_uuid();rid:=gen_random_uuid();
 insert into public.campaign_drafts(id,user_id,title,caption,platforms)values(did,uid,'Fixture','Caption',array['youtube']);
 insert into public.youtube_uploads values(rid,uid,did,'fixture-channel','scheduled',jsonb_build_object('publishAt',now()+interval '1 hour'),now(),null,null);
 if not exists(select 1 from public.campaign_submissions where id=rid and not quota_exempt and not quota_released) then raise exception 'Missing reservation';end if;
 end loop;
 u:=public.promotion_usage(now()+interval '1 hour');
 if (u->>'remaining')::int<>0 or (u->>'queued')::int<>3 then raise exception 'Direct counters incorrect';end if;
 blocked:=false;
 begin
 did:=gen_random_uuid();insert into public.campaign_drafts(id,user_id,title,caption,platforms)values(did,uid,'Fourth','Caption',array['youtube']);
 insert into public.youtube_uploads values(gen_random_uuid(),uid,did,'fixture-channel','public','{"privacyStatus":"public"}',now(),null,null);
 exception when raise_exception then blocked:=sqlerrm like '%allowance%';end;
 if not blocked then raise exception 'Direct allowance bypass';end if;
 blocked:=false;
 begin insert into public.campaign_submissions(id,user_id,draft_id,snapshot)values(gen_random_uuid(),uid,did,jsonb_build_object('planned_at',now()+interval '1 hour','brand_id','youtube:fixture-channel'));
 exception when raise_exception then blocked:=sqlerrm like '%allowance%';end;
 if not blocked then raise exception 'Shared allowance bypass';end if;
 if owners_before<>(select count(*) from public.youtube_uploads where user_id in(select user_id from app_private.app_owners)) then raise exception 'Owner uploads changed';end if;
end $$;
rollback;