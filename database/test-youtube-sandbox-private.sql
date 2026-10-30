begin;
insert into auth.users(id,email,created_at) values
 ('aa109c71-bc31-4444-9000-000000000001','private-quota-a@tests.invalid',now()),
 ('aa109c71-bc31-4444-9000-000000000002','private-quota-b@tests.invalid',now());
insert into app_private.youtube_private_testers values('aa109c71-bc31-4444-9000-000000000001',now()+interval '1 day');
set local role authenticated;
select set_config('request.jwt.claim.sub','aa109c71-bc31-4444-9000-000000000001',true);
do $$
declare uid uuid:=auth.uid();did uuid;rid uuid;i int;u jsonb;blocked boolean;
begin
 insert into public.youtube_connections(user_id,channel_id,channel_title,encrypted_tokens)values(uid,'fixture-channel','Fixture','not-a-token');
 u:=public.youtube_private_test_access();
 if not (u->>'enabled')::boolean or (u->'allowance'->>'remaining')::int<>3 then raise exception 'Initial access incorrect';end if;
 for i in 1..3 loop
  did:=gen_random_uuid();rid:=gen_random_uuid();
  insert into public.campaign_drafts(id,user_id,title,caption,platforms)values(did,uid,'Fixture','Caption',array['youtube']);
  if i=1 then
   blocked:=false;begin insert into public.youtube_uploads(id,user_id,draft_id,channel_id,mode,expected)values(rid,uid,did,'fixture-channel','public','{"privacyStatus":"public"}');exception when raise_exception then blocked:=sqlerrm like '%private tests only%';end;
   if not blocked then raise exception 'Public publishing bypass';end if;
   blocked:=false;begin insert into public.campaign_submissions(id,user_id,draft_id,snapshot)values(rid,uid,did,jsonb_build_object('provider','sandbox_youtube_private','planned_at',now(),'brand_id','artist:'||uid::text));exception when raise_exception then blocked:=sqlerrm like '%Subscriber publishing%';end;
   if not blocked then raise exception 'Forged private receipt bypass';end if;
  end if;
  insert into public.youtube_uploads(id,user_id,draft_id,channel_id,mode,expected)values(rid,uid,did,'fixture-channel','private','{"privacyStatus":"private"}');
  if not exists(select 1 from public.campaign_submissions where id=rid and not quota_exempt and not quota_released) then raise exception 'Missing quota reservation';end if;
  u:=public.promotion_usage();
  if (u->>'remaining')::int<>3-i or (u->>'canPublish')::boolean or (u->>'launch')::boolean then raise exception 'Counters or closed launch incorrect';end if;
 end loop;
 if (public.youtube_private_test_access()->>'enabled')::boolean then raise exception 'Exhausted allowance stayed enabled';end if;
 did:=gen_random_uuid();insert into public.campaign_drafts(id,user_id,title,caption,platforms)values(did,uid,'Fourth','Caption',array['youtube']);
 blocked:=false;begin insert into public.youtube_uploads(id,user_id,draft_id,channel_id,mode,expected)values(gen_random_uuid(),uid,did,'fixture-channel','private','{"privacyStatus":"private"}');exception when raise_exception then blocked:=sqlerrm like '%allowance%';end;
 if not blocked then raise exception 'Fourth private attempt allowed';end if;
end $$;
select set_config('request.jwt.claim.sub','aa109c71-bc31-4444-9000-000000000002',true);
do $$ declare did uuid:=gen_random_uuid();blocked boolean:=false; begin
 if exists(select 1 from public.youtube_uploads) then raise exception 'Another account can see private attempts';end if;
 update public.youtube_uploads set outcome='{}';if found then raise exception 'Another account can modify private attempts';end if;
 insert into public.youtube_connections(user_id,channel_id,channel_title,encrypted_tokens)values(auth.uid(),'other-fixture','Fixture','not-a-token');
 insert into public.campaign_drafts(id,user_id,title,caption,platforms)values(did,auth.uid(),'Uninvited','Caption',array['youtube']);
 begin insert into public.youtube_uploads(id,user_id,draft_id,channel_id,mode,expected)values(gen_random_uuid(),auth.uid(),did,'other-fixture','private','{"privacyStatus":"private"}');exception when raise_exception then blocked:=sqlerrm like '%test access%';end;
 if not blocked then raise exception 'Uninvited customer was enabled';end if;
end $$;
rollback;
