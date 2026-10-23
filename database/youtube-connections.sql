-- Owner pilot connection storage. Tokens are encrypted by the application server.
create table public.youtube_connections (
 user_id uuid primary key references auth.users(id) on delete cascade,
 channel_id text not null,
 channel_title text not null,
 encrypted_tokens text not null,
 connected_at timestamptz not null default now()
);
alter table public.youtube_connections enable row level security;
revoke all on public.youtube_connections from anon,authenticated;
grant select,insert,update,delete on public.youtube_connections to authenticated;
create policy youtube_own_select on public.youtube_connections for select to authenticated using ((select auth.uid())=user_id);
create policy youtube_own_insert on public.youtube_connections for insert to authenticated with check ((select auth.uid())=user_id);
create policy youtube_own_update on public.youtube_connections for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy youtube_own_delete on public.youtube_connections for delete to authenticated using ((select auth.uid())=user_id);
