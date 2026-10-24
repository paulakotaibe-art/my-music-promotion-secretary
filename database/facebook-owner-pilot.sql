create table public.facebook_uploads (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 draft_id uuid not null references public.campaign_drafts(id),
 page_id text not null check(page_id ~ '^[0-9]+$'),
 title text not null,
 created_at timestamptz not null default now(),
 outcome jsonb,
 outcome_signature text,
 unique(user_id,draft_id)
);
create index facebook_uploads_draft_idx on public.facebook_uploads(draft_id);
alter table public.facebook_uploads enable row level security;
revoke all on public.facebook_uploads from public,anon,authenticated;
grant select,insert on public.facebook_uploads to authenticated;
grant update(outcome,outcome_signature) on public.facebook_uploads to authenticated;
create policy facebook_pilot_select on public.facebook_uploads for select to authenticated
 using ((select auth.uid())=user_id and user_id='d933f707-f948-410d-b107-9ba32b37274c'::uuid);
create policy facebook_pilot_insert on public.facebook_uploads for insert to authenticated
 with check ((select auth.uid())=user_id and user_id='d933f707-f948-410d-b107-9ba32b37274c'::uuid
 and exists(select 1 from public.campaign_drafts d where d.id=draft_id and d.user_id=(select auth.uid())));
create policy facebook_pilot_update on public.facebook_uploads for update to authenticated
 using ((select auth.uid())=user_id and user_id='d933f707-f948-410d-b107-9ba32b37274c'::uuid)
 with check ((select auth.uid())=user_id and user_id='d933f707-f948-410d-b107-9ba32b37274c'::uuid);
