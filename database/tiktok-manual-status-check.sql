-- A signed-in owner may claim only an existing submission for a synchronous status check.
create or replace function app_private.claim_tiktok_check(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.tiktok_posts%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into r from public.tiktok_posts where id=p_id and user_id=auth.uid() for update;
 if not found or r.publish_id is null or r.state='claimed' then
  raise exception 'An existing submission is required and must not already be claimed';
 end if;
 return app_private.tiktok_job(r,true);
end $$;
revoke all on function app_private.claim_tiktok_check(uuid) from public,anon;
grant execute on function app_private.claim_tiktok_check(uuid) to authenticated;
create or replace function public.claim_tiktok_check(p_id uuid) returns jsonb
language sql security invoker set search_path='' as $$select app_private.claim_tiktok_check(p_id)$$;
revoke all on function public.claim_tiktok_check(uuid) from public,anon;
grant execute on function public.claim_tiktok_check(uuid) to authenticated;
