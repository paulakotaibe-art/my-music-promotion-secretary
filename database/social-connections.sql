create table public.social_connections(
user_id uuid not null references auth.users(id) on delete cascade,
provider text not null check(provider in ('facebook','tiktok')),
account_id text not null,account_name text not null,encrypted_connection text not null,
connected_at timestamptz not null default now(),primary key(user_id,provider));
alter table public.social_connections enable row level security;
revoke all on public.social_connections from public,anon,authenticated;
grant select,insert,update,delete on public.social_connections to authenticated;
create policy social_own on public.social_connections for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);