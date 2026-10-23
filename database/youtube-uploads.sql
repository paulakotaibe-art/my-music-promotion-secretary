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