create table public.facebook_releases (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 upload_id uuid not null unique references public.facebook_uploads(id),
 page_id text not null check(page_id ~ '^[0-9]+$'),
 video_id text not null unique check(video_id ~ '^[0-9]+$'),
 mode text not null check(mode in ('public','scheduled')),
 publish_at timestamptz,
 created_at timestamptz not null default now(),outcome jsonb,outcome_signature text,
 check((mode='public' and publish_at is null) or (mode='scheduled' and publish_at is not null))
);
create index facebook_releases_user_idx on public.facebook_releases(user_id);
alter table public.facebook_releases enable row level security;
revoke all on public.facebook_releases from public,anon,authenticated;
grant select,insert on public.facebook_releases to authenticated;
grant update(outcome,outcome_signature) on public.facebook_releases to authenticated;
create policy facebook_releases_select on public.facebook_releases for select to authenticated
 using ((select auth.uid())=user_id and user_id='d933f707-f948-410d-b107-9ba32b37274c'::uuid);
create policy facebook_releases_insert on public.facebook_releases for insert to authenticated
 with check ((select auth.uid())=user_id and user_id='d933f707-f948-410d-b107-9ba32b37274c'::uuid
 and exists(select 1 from public.facebook_uploads u where u.id=upload_id and u.user_id=(select auth.uid()) and u.page_id=facebook_releases.page_id));
create policy facebook_releases_update on public.facebook_releases for update to authenticated
 using ((select auth.uid())=user_id and user_id='d933f707-f948-410d-b107-9ba32b37274c'::uuid)
 with check ((select auth.uid())=user_id and user_id='d933f707-f948-410d-b107-9ba32b37274c'::uuid);
