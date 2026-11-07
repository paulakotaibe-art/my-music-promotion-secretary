-- Apply ONLY to the isolated Sandbox database. No public publishing or billing gate is opened.
begin;
do $$ begin
 if not exists(select 1 from app_private.app_owners where user_id='e0ac3cbe-0806-4031-bc07-7066ba82cb07'::uuid)
 or exists(select 1 from app_private.app_owners where user_id='d933f707-f948-410d-b107-9ba32b37274c'::uuid)
 then raise exception 'This script is restricted to the verified isolated Sandbox';end if;
 if (select subscriber_launch from app_private.billing_config limit 1) then raise exception 'Sandbox launch must remain closed';end if;
end $$;
create table app_private.youtube_private_testers(user_id uuid primary key references auth.users(id) on delete cascade,expires_at timestamptz not null);
alter table app_private.youtube_private_testers enable row level security;
revoke all on app_private.youtube_private_testers from public,anon,authenticated;
create function app_private.youtube_private_test_access() returns jsonb language plpgsql security definer set search_path='' as $$
declare u jsonb;ok boolean;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 u:=app_private.promotion_usage();
 ok:=exists(select 1 from app_private.youtube_private_testers where user_id=auth.uid() and expires_at>now())
  and not coalesce((u->>'owner')::boolean,true) and u->>'plan'='trial'
  and (u->>'periodEnd')::timestamptz>now() and (u->>'remaining')::int>0 and (u->>'queued')::int<(u->>'queueLimit')::int;
 return jsonb_build_object('enabled',ok,'allowance',u);
end $$;
revoke all on function app_private.youtube_private_test_access() from public,anon;
grant execute on function app_private.youtube_private_test_access() to authenticated;
create function public.youtube_private_test_access() returns jsonb language sql security invoker set search_path='' as $$select app_private.youtube_private_test_access()$$;
revoke all on function public.youtube_private_test_access() from public,anon;
grant execute on function public.youtube_private_test_access() to authenticated;
create table public.youtube_uploads(
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 draft_id uuid not null references public.campaign_drafts(id), channel_id text not null,
 mode text not null check(mode in ('private','public','scheduled')), expected jsonb not null,
 created_at timestamptz not null default now(), outcome jsonb, outcome_signature text,
 unique(user_id,draft_id,mode)
);
alter table public.youtube_uploads enable row level security;
revoke all on public.youtube_uploads from public,anon,authenticated;
grant select,insert on public.youtube_uploads to authenticated;
grant update(outcome,outcome_signature) on public.youtube_uploads to authenticated;
create policy youtube_uploads_select on public.youtube_uploads for select to authenticated using ((select auth.uid())=user_id);
create policy youtube_uploads_insert on public.youtube_uploads for insert to authenticated with check ((select auth.uid())=user_id);
create policy youtube_uploads_update on public.youtube_uploads for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create or replace function app_private.claim_promotion() returns trigger
language plpgsql security definer set search_path='' as $$
declare u jsonb;private_test boolean;
begin
 if auth.uid() is null or auth.uid()<>new.user_id then raise exception 'Sign in required';end if;
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
 new.quota_exempt:=false;new.quota_released:=false;new.created_at:=now();
 if exists(select 1 from app_private.app_owners where user_id=new.user_id) then new.quota_exempt:=true;return new;end if;
 u:=app_private.promotion_usage((new.snapshot->>'planned_at')::timestamptz);
 private_test:=pg_trigger_depth()>1 and new.snapshot->>'provider'='sandbox_youtube_private'
 and exists(select 1 from public.youtube_uploads y where y.id=new.id and y.user_id=new.user_id and y.draft_id=new.draft_id and y.mode='private' and y.expected->>'privacyStatus'='private' and not(y.expected?'publishAt'))
 and coalesce((app_private.youtube_private_test_access()->>'enabled')::boolean,false);
 if not coalesce((u->>'canPublish')::boolean,false) and not private_test then raise exception '%',u->>'reason';end if;
 if coalesce(new.snapshot->>'brand_id','')='' then raise exception 'Connect your artist profile';end if;
 insert into app_private.artist_profiles values(new.user_id,new.snapshot->>'brand_id') on conflict(user_id) do nothing;
 if not exists(select 1 from app_private.artist_profiles where user_id=new.user_id and brand_id=new.snapshot->>'brand_id') then raise exception 'Your plan includes one artist profile';end if;
 return new;
end $$;
revoke all on function app_private.claim_promotion() from public,anon,authenticated;
create function app_private.claim_sandbox_youtube_private() returns trigger
language plpgsql security definer set search_path='' as $$
declare d public.campaign_drafts%rowtype;brand text;
begin
 if auth.uid() is null or auth.uid()<>new.user_id then raise exception 'Sign in required';end if;
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
 if new.mode<>'private' or new.expected->>'privacyStatus' is distinct from 'private' or new.expected?'publishAt' then raise exception 'Sandbox YouTube permits private tests only';end if;
 if not exists(select 1 from public.youtube_connections where user_id=new.user_id and channel_id=new.channel_id) then raise exception 'Connect your own channel';end if;
 select * into d from public.campaign_drafts where id=new.draft_id and user_id=new.user_id;
 if not found then raise exception 'Choose your own draft';end if;
 if exists(select 1 from app_private.app_owners where user_id=new.user_id) then return new;end if;
 if not coalesce((app_private.youtube_private_test_access()->>'enabled')::boolean,false) then raise exception 'Private Sandbox test access or allowance is unavailable';end if;
 brand:=app_private.bind_direct_destination(new.user_id,'youtube',new.channel_id);
 insert into public.campaign_submissions(id,user_id,draft_id,snapshot)
 values(new.id,new.user_id,new.draft_id,jsonb_build_object('provider','sandbox_youtube_private','title',d.title,'platforms',jsonb_build_array('youtube'),'planned_at',now(),'brand_id',brand));
 return new;
end $$;
revoke all on function app_private.claim_sandbox_youtube_private() from public,anon,authenticated;
create trigger enforce_sandbox_youtube_private after insert on public.youtube_uploads for each row execute function app_private.claim_sandbox_youtube_private();
create index youtube_uploads_draft_id_idx on public.youtube_uploads(draft_id);
insert into app_private.youtube_private_testers(user_id,expires_at)
 select id,created_at+interval '7 days' from auth.users where id='3c07d762-d97a-42c5-86cd-6caa5377f20b'::uuid;
commit;
