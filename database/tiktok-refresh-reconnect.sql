-- A renewed token must never overwrite a newer OAuth reconnect.
alter table app_private.tiktok_refresh add column connection_hash text not null;
create or replace function app_private.claim_tiktok_refresh(p_user uuid,p_run_token text default null)returns jsonb language plpgsql security definer set search_path=''as $$
declare connection text;lease_id uuid:=gen_random_uuid();
begin
 if not coalesce(auth.uid()=p_user,false)and not exists(select 1 from app_private.tiktok_runs k join public.tiktok_posts p on p.id=k.post_id where p.user_id=p_user and k.token_hash=encode(extensions.digest(p_run_token,'sha256'),'hex')and k.expires_at>now())then raise exception 'Invalid refresh authentication';end if;
 select encrypted_connection into connection from public.social_connections where user_id=p_user and provider='tiktok'for update;if not found then raise exception 'Connect TikTok first';end if;
 if exists(select 1 from app_private.tiktok_refresh where user_id=p_user and expires_at>now())then return '{}'::jsonb;end if;
 insert into app_private.tiktok_refresh(user_id,lease,expires_at,connection_hash)values(p_user,lease_id,now()+interval '2 minutes',encode(extensions.digest(connection,'sha256'),'hex'))on conflict(user_id)do update set lease=excluded.lease,expires_at=excluded.expires_at,connection_hash=excluded.connection_hash;
 return jsonb_build_object('lease',lease_id,'connection',connection);
end $$;
create or replace function app_private.finish_tiktok_refresh(p_user uuid,p_lease uuid,p_connection text)returns boolean language plpgsql security definer set search_path=''as $$
declare n int;original_hash text;
begin
 delete from app_private.tiktok_refresh where user_id=p_user and lease=p_lease and expires_at>now()returning connection_hash into original_hash;get diagnostics n=row_count;if n<>1 then return false;end if;
 if p_connection is not null then
  update public.social_connections set encrypted_connection=p_connection where user_id=p_user and provider='tiktok'and encode(extensions.digest(encrypted_connection,'sha256'),'hex')=original_hash;get diagnostics n=row_count;return n=1;
 end if;return true;
end $$;
