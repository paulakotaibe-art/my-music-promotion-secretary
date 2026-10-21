-- Campaign planning only. Publishing status will be server managed separately.
create table public.campaign_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 100),
  caption text not null default '' check (length(caption) <= 5000),
  media_url text not null default '' check (media_url = '' or media_url ~ '^https://'),
  platforms text[] not null check (cardinality(platforms) between 1 and 3 and platforms <@ array['youtube','facebook','tiktok']::text[]),
  planned_at timestamptz,
  created_at timestamptz not null default now()
);
create index campaign_drafts_owner on public.campaign_drafts(user_id, created_at desc);
alter table public.campaign_drafts enable row level security;
revoke all on public.campaign_drafts from anon, authenticated;
grant select, insert, update, delete on public.campaign_drafts to authenticated;
create policy drafts_read on public.campaign_drafts for select to authenticated using ((select auth.uid()) = user_id);
create policy drafts_create on public.campaign_drafts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy drafts_edit on public.campaign_drafts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy drafts_delete on public.campaign_drafts for delete to authenticated using ((select auth.uid()) = user_id);
