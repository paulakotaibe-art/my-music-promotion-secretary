-- OAuth tokens are encrypted by the application before storage.
create table public.metricool_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_tokens text not null check(length(encrypted_tokens) between 32 and 65536),
  connected_at timestamptz not null default now()
);
alter table public.metricool_connections enable row level security;
revoke all on public.metricool_connections from anon, authenticated;
grant select,insert,update,delete on public.metricool_connections to authenticated;
create policy metricool_read on public.metricool_connections for select to authenticated using ((select auth.uid())=user_id);
create policy metricool_insert on public.metricool_connections for insert to authenticated with check ((select auth.uid())=user_id);
create policy metricool_update on public.metricool_connections for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy metricool_delete on public.metricool_connections for delete to authenticated using ((select auth.uid())=user_id);
