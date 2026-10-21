create table public.campaign_submissions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  draft_id uuid not null,
  snapshot jsonb not null,
  evidence jsonb,
  evidence_signature text,
  created_at timestamptz not null default now(),
  unique(user_id,draft_id)
);
create index campaign_submissions_owner on public.campaign_submissions(user_id,created_at desc);
alter table public.campaign_submissions enable row level security;
revoke all on public.campaign_submissions from anon,authenticated;
grant select,insert on public.campaign_submissions to authenticated;
grant update(evidence,evidence_signature) on public.campaign_submissions to authenticated;
create policy submissions_read on public.campaign_submissions for select to authenticated using((select auth.uid())=user_id);
create policy submissions_insert on public.campaign_submissions for insert to authenticated with check((select auth.uid())=user_id);
create policy submissions_update on public.campaign_submissions for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
-- No client deletion or reassignment: one external submission attempt per draft.
-- Results are signed by the server; unverified/modified evidence is shown as unknown.
