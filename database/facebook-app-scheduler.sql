-- Owner pilot only. Existing Meta schedule attempts are retained, never auto-enqueued.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;
revoke all on schema cron,net from public,anon,authenticated;
revoke all on all functions in schema net from public,anon,authenticated;
revoke all on all tables in schema net from public,anon,authenticated;
alter table public.facebook_releases add column strategy text not null default 'meta' check(strategy in ('meta','app'));
alter table public.facebook_releases add column dispatch_state text check(dispatch_state in ('queued','claimed','done','unconfirmed','missed'));
alter table public.facebook_releases add column claimed_at timestamptz;
create index facebook_releases_due_idx on public.facebook_releases(publish_at) where strategy='app' and dispatch_state='queued';
create table app_private.facebook_dispatch_nonces(token_hash text primary key,expires_at timestamptz not null);
create table app_private.facebook_dispatch_keys(release_id uuid primary key references public.facebook_releases(id),token_hash text not null);
alter table app_private.facebook_dispatch_nonces enable row level security;
alter table app_private.facebook_dispatch_keys enable row level security;
revoke all on app_private.facebook_dispatch_nonces,app_private.facebook_dispatch_keys from public,anon,authenticated;

create function app_private.queue_facebook_release(p_id uuid,p_upload uuid,p_time timestamptz,p_outcome jsonb,p_signature text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u public.facebook_uploads%rowtype;r public.facebook_releases%rowtype;uid uuid:=auth.uid();
begin
 if uid is null or uid<>'d933f707-f948-410d-b107-9ba32b37274c'::uuid then raise exception 'Owner pilot only';end if;
 if p_time<now()+interval '10 minutes' or p_time>now()+interval '28 days' or p_time is null then raise exception 'Choose a date 10 minutes to 28 days ahead';end if;
 if not exists(select 1 from cron.job where jobname='facebook-owner-dispatch' and active) then raise exception 'Scheduler is unavailable';end if;
 select * into u from public.facebook_uploads where id=p_upload and user_id=uid for update;
 if not found then raise exception 'Upload not found';end if;
 select * into r from public.facebook_releases where upload_id=p_upload for update;
 if found and (r.id<>p_id or r.mode<>'scheduled' or (r.strategy='app' and r.dispatch_state<>'queued')) then raise exception 'Release cannot be rescheduled safely';end if;
 if not coalesce(p_outcome @> jsonb_build_object('id',p_id,'uploadId',p_upload,'userId',uid,'pageId',u.page_id,'videoId',u.outcome->>'videoId','mode','scheduled'),false) or (p_outcome->>'publishAt')::timestamptz is distinct from p_time or coalesce(p_signature,'')='' then raise exception 'Invalid schedule receipt';end if;
 insert into public.facebook_releases(id,user_id,upload_id,page_id,video_id,mode,publish_at,outcome,outcome_signature,strategy,dispatch_state)
 values(p_id,uid,p_upload,u.page_id,u.outcome->>'videoId','scheduled',p_time,p_outcome,p_signature,'app','queued')
 on conflict(upload_id) do update set publish_at=excluded.publish_at,outcome=excluded.outcome,outcome_signature=excluded.outcome_signature,strategy='app',dispatch_state='queued',claimed_at=null;
 return jsonb_build_object('id',p_id,'state','queued');
end $$;
revoke all on function app_private.queue_facebook_release(uuid,uuid,timestamptz,jsonb,text) from public,anon;
grant execute on function app_private.queue_facebook_release(uuid,uuid,timestamptz,jsonb,text) to authenticated;
create function public.queue_facebook_release(p_id uuid,p_upload uuid,p_time timestamptz,p_outcome jsonb,p_signature text) returns jsonb language sql security invoker set search_path='' as $$select app_private.queue_facebook_release(p_id,p_upload,p_time,p_outcome,p_signature)$$;
revoke all on function public.queue_facebook_release(uuid,uuid,timestamptz,jsonb,text) from public,anon;
grant execute on function public.queue_facebook_release(uuid,uuid,timestamptz,jsonb,text) to authenticated;

create function app_private.claim_facebook_dispatch(p_nonce text) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.facebook_releases%rowtype;secret text;connection text;jobs jsonb:='[]'::jsonb;n int;
begin
 if p_nonce is null or length(p_nonce)<>64 then raise exception 'Invalid dispatch authentication';end if;
 delete from app_private.facebook_dispatch_nonces where token_hash=encode(extensions.digest(p_nonce,'sha256'),'hex') and expires_at>now();get diagnostics n=row_count;
 if n<>1 then raise exception 'Invalid dispatch authentication';end if;
 for r in select * from public.facebook_releases where strategy='app' and dispatch_state='queued' and publish_at<=now() and publish_at>now()-interval '10 minutes' and user_id='d933f707-f948-410d-b107-9ba32b37274c'::uuid order by publish_at limit 2 for update skip locked loop
  secret:=encode(extensions.gen_random_bytes(32),'hex');
  insert into app_private.facebook_dispatch_keys values(r.id,encode(extensions.digest(secret,'sha256'),'hex')) on conflict(release_id) do update set token_hash=excluded.token_hash;
  update public.facebook_releases set dispatch_state='claimed',claimed_at=now() where id=r.id;
  select encrypted_connection into connection from public.social_connections where user_id=r.user_id and provider='facebook';
  jobs:=jobs||jsonb_build_array(jsonb_build_object('release',to_jsonb(r),'connection',connection,'runToken',secret));
 end loop;
 return jobs;
end $$;
revoke all on function app_private.claim_facebook_dispatch(text) from public;
grant execute on function app_private.claim_facebook_dispatch(text) to anon,authenticated;
create function public.claim_facebook_dispatch(p_nonce text) returns jsonb language sql security invoker set search_path='' as $$select app_private.claim_facebook_dispatch(p_nonce)$$;
revoke all on function public.claim_facebook_dispatch(text) from public;
grant execute on function public.claim_facebook_dispatch(text) to anon,authenticated;

create function app_private.finish_facebook_dispatch(p_id uuid,p_token text,p_outcome jsonb,p_signature text) returns boolean language plpgsql security definer set search_path='' as $$
declare n int;
begin
 if not exists(select 1 from app_private.facebook_dispatch_keys where release_id=p_id and token_hash=encode(extensions.digest(p_token,'sha256'),'hex')) then raise exception 'Invalid dispatch authentication';end if;
 if p_outcome->>'id'<>p_id::text or coalesce(p_signature,'')='' then raise exception 'Invalid receipt';end if;
 update public.facebook_releases set outcome=p_outcome,outcome_signature=p_signature,dispatch_state=case when p_outcome->>'state'='published' and (p_outcome->>'verified')::boolean then 'done' else 'unconfirmed' end
 where id=p_id and dispatch_state='claimed';get diagnostics n=row_count;
 delete from app_private.facebook_dispatch_keys where release_id=p_id;
 return n=1;
end $$;
revoke all on function app_private.finish_facebook_dispatch(uuid,text,jsonb,text) from public;
grant execute on function app_private.finish_facebook_dispatch(uuid,text,jsonb,text) to anon,authenticated;
create function public.finish_facebook_dispatch(p_id uuid,p_token text,p_outcome jsonb,p_signature text) returns boolean language sql security invoker set search_path='' as $$select app_private.finish_facebook_dispatch(p_id,p_token,p_outcome,p_signature)$$;
revoke all on function public.finish_facebook_dispatch(uuid,text,jsonb,text) from public;
grant execute on function public.finish_facebook_dispatch(uuid,text,jsonb,text) to anon,authenticated;

create function app_private.wake_facebook_dispatch() returns bigint language plpgsql security definer set search_path='' as $$
declare nonce text;request_id bigint;
begin
 delete from app_private.facebook_dispatch_nonces where expires_at<now();
 update public.facebook_releases set dispatch_state='missed' where strategy='app' and dispatch_state='queued' and publish_at<=now()-interval '10 minutes';
 update public.facebook_releases set dispatch_state='unconfirmed' where strategy='app' and dispatch_state='claimed' and claimed_at<now()-interval '5 minutes';
 if not exists(select 1 from public.facebook_releases where strategy='app' and dispatch_state='queued' and publish_at<=now()) then return null;end if;
 nonce:=encode(extensions.gen_random_bytes(32),'hex');
 insert into app_private.facebook_dispatch_nonces values(encode(extensions.digest(nonce,'sha256'),'hex'),now()+interval '2 minutes');
 select net.http_post(url:='https://my-music-promotion-secretary-x96x.vercel.app/api/facebook/dispatch',body:=jsonb_build_object('nonce',nonce),headers:='{"Content-Type":"application/json"}'::jsonb,timeout_milliseconds:=55000) into request_id;
 return request_id;
end $$;
revoke all on function app_private.wake_facebook_dispatch() from public,anon,authenticated;
select cron.schedule('facebook-owner-dispatch','* * * * *','select app_private.wake_facebook_dispatch()');
