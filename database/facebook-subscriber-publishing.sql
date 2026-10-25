-- Subscriber Facebook implementation, shipped closed. No owner release is altered.
create table app_private.facebook_rollout(id boolean primary key default true check(id),enabled boolean not null default false,meta_approved boolean not null default false);
insert into app_private.facebook_rollout(id) values(true);
alter table app_private.facebook_rollout enable row level security;
revoke all on app_private.facebook_rollout from public,anon,authenticated;
create table app_private.direct_destinations(user_id uuid not null references auth.users(id),provider text not null check(provider in ('facebook','youtube')),destination_id text not null,primary key(user_id,provider));
alter table app_private.direct_destinations enable row level security;
revoke all on app_private.direct_destinations from public,anon,authenticated;

create function app_private.facebook_publishing_access() returns jsonb language plpgsql security definer set search_path='' as $$
declare u jsonb;is_open boolean;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 u:=app_private.promotion_usage();
 if auth.uid()='d933f707-f948-410d-b107-9ba32b37274c'::uuid then return jsonb_build_object('owner',true,'enabled',true,'allowance',u);end if;
 select enabled and meta_approved into is_open from app_private.facebook_rollout where id;
 is_open:=coalesce(is_open,false) and coalesce((u->>'launch')::boolean,false);
 return jsonb_build_object('owner',false,'enabled',is_open,'allowance',u,'reason',case when not is_open then 'Facebook customer publishing is awaiting platform approval and the verified launch test.' else u->>'reason' end);
end $$;
revoke all on function app_private.facebook_publishing_access() from public,anon;
grant execute on function app_private.facebook_publishing_access() to authenticated;
create function public.facebook_publishing_access() returns jsonb language sql security invoker set search_path='' as $$select app_private.facebook_publishing_access()$$;
revoke all on function public.facebook_publishing_access() from public,anon;
grant execute on function public.facebook_publishing_access() to authenticated;

-- Called only by guarded triggers. A customer can bind one destination on each direct platform.
create function app_private.bind_direct_destination(uid uuid,platform text,destination text) returns text language plpgsql security definer set search_path='' as $$
declare brand text;
begin
 if auth.uid() is null or uid<>auth.uid() or platform not in ('facebook','youtube') or coalesce(destination,'')='' then raise exception 'Invalid destination';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 insert into app_private.direct_destinations values(uid,platform,destination) on conflict(user_id,provider) do nothing;
 if not exists(select 1 from app_private.direct_destinations where user_id=uid and provider=platform and destination_id=destination) then raise exception 'Your plan includes one destination per platform';end if;
 select brand_id into brand from app_private.artist_profiles where user_id=uid;
 return coalesce(brand,'artist:'||uid::text);
end $$;
revoke all on function app_private.bind_direct_destination(uuid,text,text) from public,anon,authenticated;

create function app_private.guard_facebook_upload() returns trigger language plpgsql security definer set search_path='' as $$
declare access jsonb;
begin
 if auth.uid() is null or auth.uid()<>new.user_id then raise exception 'Sign in required';end if;
 if new.user_id='d933f707-f948-410d-b107-9ba32b37274c'::uuid then return new;end if;
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
 access:=app_private.facebook_publishing_access();
 if not coalesce((access->>'enabled')::boolean,false) then raise exception 'Facebook customer publishing is not enabled';end if;
 if not coalesce((access->'allowance'->>'canPublish')::boolean,false) then raise exception '%',access->'allowance'->>'reason';end if;
 if not exists(select 1 from public.campaign_drafts where id=new.draft_id and user_id=new.user_id) then raise exception 'Choose your own draft';end if;
 if not exists(select 1 from public.social_connections where user_id=new.user_id and provider='facebook') then raise exception 'Connect your own Facebook Page';end if;
 if (select count(*) from public.facebook_uploads f where f.user_id=new.user_id and not exists(select 1 from public.facebook_releases r where r.upload_id=f.id))>=3 then raise exception 'Finish one of your three prepared videos before preparing another';end if;
 perform app_private.bind_direct_destination(new.user_id,'facebook',new.page_id);
 new.created_at:=now();return new;
end $$;
revoke all on function app_private.guard_facebook_upload() from public,anon,authenticated;
create trigger guard_facebook_upload before insert on public.facebook_uploads for each row execute function app_private.guard_facebook_upload();

create function app_private.claim_facebook_promotion() returns trigger language plpgsql security definer set search_path='' as $$
declare access jsonb;f public.facebook_uploads%rowtype;d public.campaign_drafts%rowtype;at_time timestamptz;brand text;
begin
 if auth.uid() is null or auth.uid()<>new.user_id then raise exception 'Sign in required';end if;
 if new.user_id='d933f707-f948-410d-b107-9ba32b37274c'::uuid then return new;end if;
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
 access:=app_private.facebook_publishing_access();
 if not coalesce((access->>'enabled')::boolean,false) then raise exception 'Facebook customer publishing is not enabled';end if;
 select * into f from public.facebook_uploads where id=new.upload_id and user_id=new.user_id and page_id=new.page_id;
 if not found or f.outcome->>'videoId' is distinct from new.video_id then raise exception 'Choose your own prepared video';end if;
 select * into d from public.campaign_drafts where id=f.draft_id and user_id=new.user_id;
 if not found then raise exception 'Choose your own draft';end if;
 if new.mode='scheduled' then
  at_time:=new.publish_at;
  if new.strategy<>'app' or new.dispatch_state<>'queued' or at_time is null or at_time<now()+interval '10 minutes' or at_time>now()+interval '28 days' then raise exception 'Choose a date 10 minutes to 28 days ahead';end if;
 else at_time:=now();end if;
 brand:=app_private.bind_direct_destination(new.user_id,'facebook',new.page_id);
 insert into public.campaign_submissions(id,user_id,draft_id,snapshot) values(new.id,new.user_id,d.id,jsonb_build_object('provider','direct_facebook','title',d.title,'platforms',jsonb_build_array('facebook'),'planned_at',at_time,'brand_id',brand,'page_id',new.page_id,'video_id',new.video_id));
 new.created_at:=now();return new;
end $$;
revoke all on function app_private.claim_facebook_promotion() from public,anon,authenticated;
create trigger enforce_facebook_allowance before insert on public.facebook_releases for each row execute function app_private.claim_facebook_promotion();

-- Preserve the existing ledger identity when another direct platform has already bound it.
create or replace function app_private.claim_youtube_promotion() returns trigger language plpgsql security definer set search_path='' as $$
declare d public.campaign_drafts%rowtype;at_time timestamptz;brand text;
begin
 if auth.uid() is null or auth.uid()<>new.user_id then raise exception 'Sign in required';end if;
 if exists(select 1 from app_private.app_owners where user_id=new.user_id) then return new;end if;
 if new.mode='private' then raise exception 'Private tests are limited to the owner pilot';end if;
 if not exists(select 1 from public.youtube_connections where user_id=new.user_id and channel_id=new.channel_id) then raise exception 'Connect your own YouTube channel first';end if;
 select * into d from public.campaign_drafts where id=new.draft_id and user_id=new.user_id;
 if not found then raise exception 'Choose your own saved draft';end if;
 if new.mode='scheduled' then at_time:=(new.expected->>'publishAt')::timestamptz;if at_time is null or at_time<now()+interval '10 minutes' then raise exception 'Choose a future publication date';end if;
 else at_time:=now();end if;
 brand:=app_private.bind_direct_destination(new.user_id,'youtube',new.channel_id);
 insert into public.campaign_submissions(id,user_id,draft_id,snapshot) values(new.id,new.user_id,new.draft_id,jsonb_build_object('provider','direct_youtube','title',d.title,'platforms',jsonb_build_array('youtube'),'planned_at',at_time,'brand_id',brand));
 return new;
end $$;
revoke all on function app_private.claim_youtube_promotion() from public,anon,authenticated;

-- Read and receipt updates remain account-scoped even after access expires.
alter policy facebook_pilot_select on public.facebook_uploads using ((select auth.uid())=user_id);
alter policy facebook_pilot_insert on public.facebook_uploads with check ((select auth.uid())=user_id and exists(select 1 from public.campaign_drafts d where d.id=draft_id and d.user_id=(select auth.uid())));
alter policy facebook_pilot_update on public.facebook_uploads using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
alter policy facebook_releases_select on public.facebook_releases using ((select auth.uid())=user_id);
alter policy facebook_releases_insert on public.facebook_releases with check ((select auth.uid())=user_id and exists(select 1 from public.facebook_uploads f where f.id=upload_id and f.user_id=(select auth.uid()) and f.page_id=facebook_releases.page_id));
alter policy facebook_releases_update on public.facebook_releases using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create or replace function app_private.queue_facebook_release(p_id uuid,p_upload uuid,p_time timestamptz,p_outcome jsonb,p_signature text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u public.facebook_uploads%rowtype;r public.facebook_releases%rowtype;uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Sign in required';end if;
 if uid<>'d933f707-f948-410d-b107-9ba32b37274c'::uuid and not coalesce((app_private.facebook_publishing_access()->>'enabled')::boolean,false) then raise exception 'Facebook customer publishing is not enabled';end if;
 if p_time<now()+interval '10 minutes' or p_time>now()+interval '28 days' or p_time is null then raise exception 'Choose a date 10 minutes to 28 days ahead';end if;
 if not exists(select 1 from cron.job where jobname='facebook-owner-dispatch' and active) then raise exception 'Scheduler is unavailable';end if;
 select * into u from public.facebook_uploads where id=p_upload and user_id=uid for update;
 if not found then raise exception 'Upload not found';end if;
 select * into r from public.facebook_releases where upload_id=p_upload for update;
 if found and uid<>'d933f707-f948-410d-b107-9ba32b37274c'::uuid then raise exception 'This video already has a publication reservation';end if;
 if found and (r.id<>p_id or r.mode<>'scheduled' or (r.strategy='app' and r.dispatch_state<>'queued')) then raise exception 'Release cannot be rescheduled safely';end if;
 if not coalesce(p_outcome @> jsonb_build_object('id',p_id,'uploadId',p_upload,'userId',uid,'pageId',u.page_id,'videoId',u.outcome->>'videoId','mode','scheduled'),false) or (p_outcome->>'publishAt')::timestamptz is distinct from p_time or coalesce(p_signature,'')='' then raise exception 'Invalid schedule receipt';end if;
 insert into public.facebook_releases(id,user_id,upload_id,page_id,video_id,mode,publish_at,outcome,outcome_signature,strategy,dispatch_state)
 values(p_id,uid,p_upload,u.page_id,u.outcome->>'videoId','scheduled',p_time,p_outcome,p_signature,'app','queued')
 on conflict(upload_id) do update set publish_at=excluded.publish_at,outcome=excluded.outcome,outcome_signature=excluded.outcome_signature,strategy='app',dispatch_state='queued',claimed_at=null;
 return jsonb_build_object('id',p_id,'state','queued');
end $$;

-- Recheck entitlement and platform access at execution; quota was already reserved once.
create function app_private.facebook_dispatch_allowed(uid uuid,at_time timestamptz) returns boolean language plpgsql security definer set search_path='' as $$
declare ends timestamptz;
begin
 if uid='d933f707-f948-410d-b107-9ba32b37274c'::uuid then return true;end if;
 if not exists(select 1 from app_private.facebook_rollout where enabled and meta_approved) or not exists(select 1 from app_private.billing_config where subscriber_launch) then return false;end if;
 select max(period_end) into ends from app_private.subscriptions where user_id=uid and livemode and status='active' and period_end>now();
 if ends is null then select created_at+interval '7 days' into ends from auth.users where id=uid;end if;
 return coalesce(ends>now() and at_time<ends,false);
end $$;
revoke all on function app_private.facebook_dispatch_allowed(uuid,timestamptz) from public,anon,authenticated;

create or replace function app_private.claim_facebook_dispatch(p_nonce text) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.facebook_releases%rowtype;secret text;connection text;jobs jsonb:='[]'::jsonb;n int;
begin
 if p_nonce is null or length(p_nonce)<>64 then raise exception 'Invalid dispatch authentication';end if;
 delete from app_private.facebook_dispatch_nonces where token_hash=encode(extensions.digest(p_nonce,'sha256'),'hex') and expires_at>now();get diagnostics n=row_count;
 if n<>1 then raise exception 'Invalid dispatch authentication';end if;
 for r in select * from public.facebook_releases where strategy='app' and dispatch_state='queued' and publish_at<=now() and publish_at>now()-interval '10 minutes' order by publish_at limit 2 for update skip locked loop
  secret:=encode(extensions.gen_random_bytes(32),'hex');
  insert into app_private.facebook_dispatch_keys values(r.id,encode(extensions.digest(secret,'sha256'),'hex')) on conflict(release_id) do update set token_hash=excluded.token_hash;
  update public.facebook_releases set dispatch_state='claimed',claimed_at=now() where id=r.id;
  select encrypted_connection into connection from public.social_connections where user_id=r.user_id and provider='facebook';
  jobs:=jobs||jsonb_build_array(jsonb_build_object('release',to_jsonb(r),'connection',connection,'runToken',secret,'subscriberAuthorized',app_private.facebook_dispatch_allowed(r.user_id,r.publish_at) and (r.user_id='d933f707-f948-410d-b107-9ba32b37274c'::uuid or exists(select 1 from public.campaign_submissions c where c.id=r.id and c.user_id=r.user_id and not c.quota_released and not c.quota_exempt and c.snapshot->>'provider'='direct_facebook' and c.snapshot->>'page_id'=r.page_id and c.snapshot->>'video_id'=r.video_id and (c.snapshot->>'planned_at')::timestamptz=r.publish_at))));
 end loop;
 return jobs;
end $$;

