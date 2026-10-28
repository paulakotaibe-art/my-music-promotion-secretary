-- Apply only to isolated Sandbox project slvhnpagtsprmivaujav.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create or replace function app_private.wake_tiktok_dispatch()returns bigint language plpgsql security definer set search_path=''as $$
declare nonce text;request_id bigint;
begin
 delete from app_private.tiktok_nonces where expires_at<now();delete from app_private.tiktok_runs where expires_at<now();delete from app_private.tiktok_refresh where expires_at<now();
 update public.tiktok_posts set state='missed',updated_at=now()where state='queued'and publish_at<=now()-interval '10 minutes';
 update public.tiktok_posts set state=case when publish_id is null then 'unconfirmed'else 'processing'end,updated_at=now()where state in ('claimed','reserved')and updated_at<now()-interval '5 minutes';
 update public.tiktok_posts set state='unconfirmed',updated_at=now()where state='processing'and coalesce(publish_at,created_at)<now()-interval '24 hours';
 if not exists(select 1 from public.tiktok_posts where(state='queued'and publish_at<=now())or(state='processing'and publish_id is not null and updated_at<now()-interval '50 seconds'))then return null;end if;
 nonce:=encode(extensions.gen_random_bytes(32),'hex');insert into app_private.tiktok_nonces values(encode(extensions.digest(nonce,'sha256'),'hex'),now()+interval '2 minutes');
 select net.http_post(url:='https://music-promotion-secretary-tiktok-sa.vercel.app/api/tiktok/dispatch',body:=jsonb_build_object('nonce',nonce),headers:='{"Content-Type":"application/json"}'::jsonb,timeout_milliseconds:=55000)into request_id;return request_id;
end $$;
revoke all on function app_private.wake_tiktok_dispatch()from public,anon,authenticated;
select cron.schedule('sandbox-tiktok-dispatch','* * * * *','select app_private.wake_tiktok_dispatch()');
