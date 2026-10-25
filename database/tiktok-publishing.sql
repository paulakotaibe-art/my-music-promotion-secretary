-- TikTok stays closed until credentials, verified URL and live tests exist.
create table app_private.tiktok_config(id boolean primary key default true check(id),enabled boolean not null default false,audited boolean not null default false,url_verified boolean not null default false);
insert into app_private.tiktok_config(id)values(true);
alter table app_private.tiktok_config enable row level security;
revoke all on app_private.tiktok_config from public,anon,authenticated;
alter table app_private.direct_destinations drop constraint direct_destinations_provider_check;
alter table app_private.direct_destinations add constraint direct_destinations_provider_check check(provider in ('facebook','youtube','tiktok'));
create or replace function app_private.bind_direct_destination(uid uuid,platform text,destination text) returns text language plpgsql security definer set search_path='' as $$
declare brand text;
begin
 if auth.uid() is null or uid<>auth.uid() or platform not in ('facebook','youtube','tiktok') or coalesce(destination,'')='' then raise exception 'Invalid destination';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 insert into app_private.direct_destinations values(uid,platform,destination) on conflict(user_id,provider) do nothing;
 if not exists(select 1 from app_private.direct_destinations where user_id=uid and provider=platform and destination_id=destination) then raise exception 'Your plan includes one destination per platform';end if;
 select brand_id into brand from app_private.artist_profiles where user_id=uid;
 return coalesce(brand,'artist:'||uid::text);
end $$;
revoke all on function app_private.bind_direct_destination(uuid,text,text) from public,anon,authenticated;

create table public.tiktok_posts(
 id uuid primary key,user_id uuid not null references auth.users(id),draft_id uuid not null references public.campaign_drafts(id),open_id text not null,
 publish_at timestamptz,state text not null check(state in ('reserved','queued','claimed','processing','published','nonpublic','failed','blocked','unconfirmed','missed','cancelled')),
 expected jsonb not null,expected_signature text not null,publish_id text check(length(publish_id)<=64),outcome jsonb,outcome_signature text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),claimed_at timestamptz,unique(user_id,draft_id),check(state not in ('processing','published','nonpublic')or publish_id is not null)
);
alter table public.tiktok_posts enable row level security;
revoke all on public.tiktok_posts from public,anon,authenticated;
grant select on public.tiktok_posts to authenticated;
create policy tiktok_posts_own on public.tiktok_posts for select to authenticated using((select auth.uid())=user_id);
create index tiktok_posts_due on public.tiktok_posts(publish_at)where state='queued';
create index tiktok_posts_poll on public.tiktok_posts(updated_at)where state='processing';
create table app_private.tiktok_nonces(token_hash text primary key,expires_at timestamptz not null);
create table app_private.tiktok_runs(post_id uuid primary key references public.tiktok_posts(id),token_hash text not null,expires_at timestamptz not null);
create table app_private.tiktok_refresh(user_id uuid primary key references auth.users(id),lease uuid not null,expires_at timestamptz not null);
alter table app_private.tiktok_nonces enable row level security;
alter table app_private.tiktok_runs enable row level security;
alter table app_private.tiktok_refresh enable row level security;
revoke all on app_private.tiktok_nonces,app_private.tiktok_runs,app_private.tiktok_refresh from public,anon,authenticated;

create function app_private.tiktok_publishing_access() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();u jsonb;c app_private.tiktok_config%rowtype;owner boolean;enabled boolean;
begin
 if uid is null then raise exception 'Sign in required';end if;
 u:=app_private.promotion_usage();owner:=exists(select 1 from app_private.app_owners where user_id=uid);select * into c from app_private.tiktok_config where id;
 enabled:=c.enabled and c.url_verified and(owner or(c.audited and coalesce((u->>'launch')::boolean,false)));
 return jsonb_build_object('owner',owner,'enabled',coalesce(enabled,false),'audited',c.audited,'urlVerified',c.url_verified,'allowance',u,'reason',case when not c.enabled then 'TikTok integration is being prepared for testing.' when not c.url_verified then 'The app media URL must be verified with TikTok.' when not owner and not c.audited then 'TikTok customer publishing awaits the platform audit.' when not enabled then 'Subscriber publishing is not open yet.' else u->>'reason' end);
end $$;
revoke all on function app_private.tiktok_publishing_access() from public,anon;
grant execute on function app_private.tiktok_publishing_access() to authenticated;
create function public.tiktok_publishing_access() returns jsonb language sql security invoker set search_path='' as $$select app_private.tiktok_publishing_access()$$;
revoke all on function public.tiktok_publishing_access() from public,anon;
grant execute on function public.tiktok_publishing_access() to authenticated;

create function app_private.reserve_tiktok_post(p_id uuid,p_draft uuid,p_expected jsonb,p_signature text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();a jsonb;d public.campaign_drafts%rowtype;old public.tiktok_posts%rowtype;at_time timestamptz;release_at timestamptz;brand text;u jsonb;
begin
 if uid is null then raise exception 'Sign in required';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 a:=app_private.tiktok_publishing_access();if not coalesce((a->>'enabled')::boolean,false)then raise exception 'TikTok publishing is not enabled';end if;
 select * into d from public.campaign_drafts where id=p_draft and user_id=uid for update;if not found then raise exception 'Choose your own saved video';end if;
 if coalesce(p_signature,'')='' or not coalesce(p_expected @> jsonb_build_object('id',p_id,'userId',uid,'draftId',p_draft,'mediaUrl',d.media_url,'rightsConfirmed',true,'musicConsent',true,'confirmed',true),false)then raise exception 'Invalid publishing review';end if;
 if not exists(select 1 from public.social_connections where user_id=uid and provider='tiktok' and account_id=p_expected->>'openId')then raise exception 'TikTok account mismatch';end if;
 if (p_expected->>'reviewedAt')::timestamptz<now()-interval '10 minutes' or (p_expected->>'reviewedAt')::timestamptz>now()+interval '1 minute' or p_expected->>'reviewedAt' is null then raise exception 'Review your post again';end if;
 if not (a->>'audited')::boolean and p_expected->>'privacy'<>'SELF_ONLY' then raise exception 'Unaudited TikTok tests must be Only me';end if;
 release_at:=(p_expected->>'publishAt')::timestamptz;at_time:=coalesce(release_at,now());
 if release_at is not null and(release_at<now()+interval '10 minutes' or release_at>now()+interval '28 days')then raise exception 'Choose a date 10 minutes to 28 days ahead';end if;
 select * into old from public.tiktok_posts where user_id=uid and draft_id=p_draft for update;
 if found and(old.id<>p_id or old.state not in ('queued','cancelled')or old.publish_id is not null)then raise exception 'This video already has a publication attempt; check its result';end if;
 if not (a->>'owner')::boolean then
  brand:=app_private.bind_direct_destination(uid,'tiktok',p_expected->>'openId');
  if old.id is null then
   insert into public.campaign_submissions(id,user_id,draft_id,snapshot)values(p_id,uid,p_draft,jsonb_build_object('provider','direct_tiktok','title',d.title,'platforms',jsonb_build_array('tiktok'),'planned_at',at_time,'brand_id',brand,'open_id',p_expected->>'openId'));
  else
   if not exists(select 1 from public.campaign_submissions where id=p_id and user_id=uid and snapshot->>'provider'='direct_tiktok')then raise exception 'Reservation missing';end if;
   update public.campaign_submissions set quota_released=true where id=p_id and user_id=uid;
   u:=app_private.promotion_usage(at_time);if not coalesce((u->>'canPublish')::boolean,false)then raise exception '%',u->>'reason';end if;
   update public.campaign_submissions set quota_released=false,snapshot=jsonb_set(snapshot,'{planned_at}',to_jsonb(at_time))where id=p_id and user_id=uid;
  end if;
 end if;
 insert into public.tiktok_posts(id,user_id,draft_id,open_id,publish_at,state,expected,expected_signature)values(p_id,uid,p_draft,p_expected->>'openId',release_at,case when release_at is null then 'reserved' else 'queued' end,p_expected,p_signature)
 on conflict(user_id,draft_id)do update set publish_at=excluded.publish_at,state=excluded.state,expected=excluded.expected,expected_signature=excluded.expected_signature,outcome=null,outcome_signature=null,updated_at=now(),claimed_at=null;
 return jsonb_build_object('id',p_id,'state',case when release_at is null then 'reserved' else 'queued' end);
end $$;
revoke all on function app_private.reserve_tiktok_post(uuid,uuid,jsonb,text) from public,anon;
grant execute on function app_private.reserve_tiktok_post(uuid,uuid,jsonb,text) to authenticated;
create function public.reserve_tiktok_post(p_id uuid,p_draft uuid,p_expected jsonb,p_signature text)returns jsonb language sql security invoker set search_path=''as $$select app_private.reserve_tiktok_post(p_id,p_draft,p_expected,p_signature)$$;
revoke all on function public.reserve_tiktok_post(uuid,uuid,jsonb,text) from public,anon;
grant execute on function public.reserve_tiktok_post(uuid,uuid,jsonb,text) to authenticated;

create function app_private.tiktok_dispatch_allowed(r public.tiktok_posts)returns boolean language plpgsql security definer set search_path=''as $$
declare ends timestamptz;c app_private.tiktok_config%rowtype;
begin
 select * into c from app_private.tiktok_config where id;
 if not c.enabled or not c.url_verified then return false;end if;
 if exists(select 1 from app_private.app_owners where user_id=r.user_id)then return c.audited or r.expected->>'privacy'='SELF_ONLY';end if;
 if not c.audited or not exists(select 1 from app_private.billing_config where subscriber_launch)then return false;end if;
 select max(period_end)into ends from app_private.subscriptions where user_id=r.user_id and livemode and status='active'and period_end>now();
 if ends is null then select created_at+interval '7 days'into ends from auth.users where id=r.user_id;end if;
 return coalesce(ends>now()and coalesce(r.publish_at,now())<ends,false)and exists(select 1 from public.campaign_submissions s where s.id=r.id and s.user_id=r.user_id and not s.quota_released and not s.quota_exempt and s.snapshot->>'provider'='direct_tiktok'and s.snapshot->>'open_id'=r.open_id and(r.publish_at is null or(s.snapshot->>'planned_at')::timestamptz=r.publish_at));
end $$;
revoke all on function app_private.tiktok_dispatch_allowed(public.tiktok_posts)from public,anon,authenticated;
create function app_private.tiktok_job(r public.tiktok_posts,status_only boolean)returns jsonb language plpgsql security definer set search_path=''as $$
declare token text;connection text;c app_private.tiktok_config%rowtype;
begin
 token:=encode(extensions.gen_random_bytes(32),'hex');
 insert into app_private.tiktok_runs values(r.id,encode(extensions.digest(token,'sha256'),'hex'),now()+interval '5 minutes')on conflict(post_id)do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at;
 update public.tiktok_posts set state='claimed',claimed_at=now(),updated_at=now()where id=r.id;
 select encrypted_connection into connection from public.social_connections where user_id=r.user_id and provider='tiktok';select * into c from app_private.tiktok_config where id;
 return jsonb_build_object('post',to_jsonb(r),'connection',connection,'runToken',token,'statusOnly',status_only,'authorized',status_only or app_private.tiktok_dispatch_allowed(r),'audited',c.audited);
end $$;
revoke all on function app_private.tiktok_job(public.tiktok_posts,boolean)from public,anon,authenticated;
create function app_private.claim_tiktok_now(p_id uuid)returns jsonb language plpgsql security definer set search_path=''as $$
declare r public.tiktok_posts%rowtype;
begin
 select * into r from public.tiktok_posts where id=p_id and user_id=auth.uid()and state='reserved'and publish_at is null for update;
 if not found then raise exception 'Publication already claimed or unavailable';end if;return app_private.tiktok_job(r,false);
end $$;
revoke all on function app_private.claim_tiktok_now(uuid)from public,anon;grant execute on function app_private.claim_tiktok_now(uuid)to authenticated;
create function public.claim_tiktok_now(p_id uuid)returns jsonb language sql security invoker set search_path=''as $$select app_private.claim_tiktok_now(p_id)$$;
revoke all on function public.claim_tiktok_now(uuid)from public,anon;grant execute on function public.claim_tiktok_now(uuid)to authenticated;

create function app_private.claim_tiktok_dispatch(p_nonce text)returns jsonb language plpgsql security definer set search_path=''as $$
declare r public.tiktok_posts%rowtype;n int;jobs jsonb:='[]';
begin
 if length(coalesce(p_nonce,''))<>64 then raise exception 'Invalid dispatch authentication';end if;
 delete from app_private.tiktok_nonces where token_hash=encode(extensions.digest(p_nonce,'sha256'),'hex')and expires_at>now();get diagnostics n=row_count;if n<>1 then raise exception 'Invalid dispatch authentication';end if;
 for r in select * from public.tiktok_posts where(state='queued'and publish_at<=now()and publish_at>now()-interval '10 minutes')or(state='processing'and publish_id is not null and updated_at<now()-interval '50 seconds')order by updated_at limit 2 for update skip locked loop
  jobs:=jobs||jsonb_build_array(app_private.tiktok_job(r,r.publish_id is not null));
 end loop;return jobs;
end $$;
revoke all on function app_private.claim_tiktok_dispatch(text)from public;grant execute on function app_private.claim_tiktok_dispatch(text)to anon,authenticated;
create function public.claim_tiktok_dispatch(p_nonce text)returns jsonb language sql security invoker set search_path=''as $$select app_private.claim_tiktok_dispatch(p_nonce)$$;
revoke all on function public.claim_tiktok_dispatch(text)from public;grant execute on function public.claim_tiktok_dispatch(text)to anon,authenticated;

create function app_private.save_tiktok_run(p_id uuid,p_token text,p_publish_id text,p_outcome jsonb,p_signature text,p_done boolean)returns boolean language plpgsql security definer set search_path=''as $$
declare n int;next_state text;
begin
 if not exists(select 1 from app_private.tiktok_runs where post_id=p_id and token_hash=encode(extensions.digest(p_token,'sha256'),'hex')and expires_at>now())then raise exception 'Invalid job authentication';end if;
 if p_outcome->>'id' is distinct from p_id::text or coalesce(p_signature,'')=''or(p_publish_id is not null and(length(p_publish_id)<1 or length(p_publish_id)>64))then raise exception 'Invalid receipt';end if;
 next_state:=p_outcome->>'state';if next_state not in ('processing','published','nonpublic','failed','blocked','unconfirmed')then raise exception 'Invalid job state';end if;
 update public.tiktok_posts set publish_id=coalesce(publish_id,p_publish_id),outcome=p_outcome,outcome_signature=p_signature,state=case when p_done then next_state else 'claimed'end,updated_at=now()where id=p_id and state='claimed';get diagnostics n=row_count;
 if p_done then delete from app_private.tiktok_runs where post_id=p_id;end if;return n=1;
end $$;
revoke all on function app_private.save_tiktok_run(uuid,text,text,jsonb,text,boolean)from public;grant execute on function app_private.save_tiktok_run(uuid,text,text,jsonb,text,boolean)to anon,authenticated;
create function public.save_tiktok_run(p_id uuid,p_token text,p_publish_id text,p_outcome jsonb,p_signature text,p_done boolean)returns boolean language sql security invoker set search_path=''as $$select app_private.save_tiktok_run(p_id,p_token,p_publish_id,p_outcome,p_signature,p_done)$$;
revoke all on function public.save_tiktok_run(uuid,text,text,jsonb,text,boolean)from public;grant execute on function public.save_tiktok_run(uuid,text,text,jsonb,text,boolean)to anon,authenticated;

create function app_private.claim_tiktok_refresh(p_user uuid,p_run_token text default null)returns jsonb language plpgsql security definer set search_path=''as $$
declare connection text;lease_id uuid:=gen_random_uuid();
begin
 if not coalesce(auth.uid()=p_user,false)and not exists(select 1 from app_private.tiktok_runs k join public.tiktok_posts p on p.id=k.post_id where p.user_id=p_user and k.token_hash=encode(extensions.digest(p_run_token,'sha256'),'hex')and k.expires_at>now())then raise exception 'Invalid refresh authentication';end if;
 select encrypted_connection into connection from public.social_connections where user_id=p_user and provider='tiktok'for update;if not found then raise exception 'Connect TikTok first';end if;
 if exists(select 1 from app_private.tiktok_refresh where user_id=p_user and expires_at>now())then return '{}'::jsonb;end if;
 insert into app_private.tiktok_refresh values(p_user,lease_id,now()+interval '2 minutes')on conflict(user_id)do update set lease=excluded.lease,expires_at=excluded.expires_at;
 return jsonb_build_object('lease',lease_id,'connection',connection);
end $$;
revoke all on function app_private.claim_tiktok_refresh(uuid,text)from public;grant execute on function app_private.claim_tiktok_refresh(uuid,text)to anon,authenticated;
create function public.claim_tiktok_refresh(p_user uuid,p_run_token text default null)returns jsonb language sql security invoker set search_path=''as $$select app_private.claim_tiktok_refresh(p_user,p_run_token)$$;
revoke all on function public.claim_tiktok_refresh(uuid,text)from public;grant execute on function public.claim_tiktok_refresh(uuid,text)to anon,authenticated;
create function app_private.finish_tiktok_refresh(p_user uuid,p_lease uuid,p_connection text)returns boolean language plpgsql security definer set search_path=''as $$
declare n int;
begin
 delete from app_private.tiktok_refresh where user_id=p_user and lease=p_lease and expires_at>now();get diagnostics n=row_count;if n<>1 then return false;end if;
 if p_connection is not null then update public.social_connections set encrypted_connection=p_connection where user_id=p_user and provider='tiktok';end if;return true;
end $$;
revoke all on function app_private.finish_tiktok_refresh(uuid,uuid,text)from public;grant execute on function app_private.finish_tiktok_refresh(uuid,uuid,text)to anon,authenticated;
create function public.finish_tiktok_refresh(p_user uuid,p_lease uuid,p_connection text)returns boolean language sql security invoker set search_path=''as $$select app_private.finish_tiktok_refresh(p_user,p_lease,p_connection)$$;
revoke all on function public.finish_tiktok_refresh(uuid,uuid,text)from public;grant execute on function public.finish_tiktok_refresh(uuid,uuid,text)to anon,authenticated;

create function app_private.control_tiktok_post(p_id uuid,p_action text)returns boolean language plpgsql security definer set search_path=''as $$
declare r public.tiktok_posts%rowtype;
begin
 if auth.uid()is null then raise exception 'Sign in required';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into r from public.tiktok_posts where id=p_id and user_id=auth.uid()for update;if not found then raise exception 'Post not found';end if;
 if p_action='cancel'and r.state in ('queued','reserved')and r.publish_id is null then
  update public.tiktok_posts set state='cancelled',updated_at=now()where id=r.id;
  update public.campaign_submissions set quota_released=true where id=r.id and user_id=auth.uid();return true;
 elsif p_action='check'and r.publish_id is not null and r.state<>'claimed'then
  update public.tiktok_posts set state='processing',updated_at=now()-interval '1 minute'where id=r.id;return true;
 end if;raise exception 'This action is unavailable while a post is being dispatched or its outcome is uncertain';
end $$;
revoke all on function app_private.control_tiktok_post(uuid,text)from public,anon;grant execute on function app_private.control_tiktok_post(uuid,text)to authenticated;
create function public.control_tiktok_post(p_id uuid,p_action text)returns boolean language sql security invoker set search_path=''as $$select app_private.control_tiktok_post(p_id,p_action)$$;
revoke all on function public.control_tiktok_post(uuid,text)from public,anon;grant execute on function public.control_tiktok_post(uuid,text)to authenticated;

create function app_private.wake_tiktok_dispatch()returns bigint language plpgsql security definer set search_path=''as $$
declare nonce text;request_id bigint;
begin
 delete from app_private.tiktok_nonces where expires_at<now();delete from app_private.tiktok_runs where expires_at<now();delete from app_private.tiktok_refresh where expires_at<now();
 update public.tiktok_posts set state='missed',updated_at=now()where state='queued'and publish_at<=now()-interval '10 minutes';
 update public.tiktok_posts set state=case when publish_id is null then 'unconfirmed'else 'processing'end,updated_at=now()where state in ('claimed','reserved')and updated_at<now()-interval '5 minutes';
 update public.tiktok_posts set state='unconfirmed',updated_at=now()where state='processing'and coalesce(publish_at,created_at)<now()-interval '24 hours';
 if not exists(select 1 from public.tiktok_posts where(state='queued'and publish_at<=now())or(state='processing'and publish_id is not null and updated_at<now()-interval '50 seconds'))then return null;end if;
 nonce:=encode(extensions.gen_random_bytes(32),'hex');insert into app_private.tiktok_nonces values(encode(extensions.digest(nonce,'sha256'),'hex'),now()+interval '2 minutes');
 select net.http_post(url:='https://my-music-promotion-secretary-x96x.vercel.app/api/tiktok/dispatch',body:=jsonb_build_object('nonce',nonce),headers:='{"Content-Type":"application/json"}'::jsonb,timeout_milliseconds:=55000)into request_id;return request_id;
end $$;
revoke all on function app_private.wake_tiktok_dispatch()from public,anon,authenticated;
select cron.schedule('tiktok-dispatch','* * * * *','select app_private.wake_tiktok_dispatch()');
