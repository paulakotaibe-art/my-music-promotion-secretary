create or replace function app_private.claim_youtube_promotion() returns trigger
language plpgsql security definer set search_path='' as $$
declare d public.campaign_drafts%rowtype; at_time timestamptz;
begin
 if auth.uid() is null or auth.uid()<>new.user_id then raise exception 'Sign in required';end if;
 if exists(select 1 from app_private.app_owners where user_id=new.user_id) then return new;end if;
 if new.mode='private' then raise exception 'Private tests are limited to the owner pilot';end if;
 if not exists(select 1 from public.youtube_connections where user_id=new.user_id and channel_id=new.channel_id) then raise exception 'Connect your own YouTube channel first';end if;
 select * into d from public.campaign_drafts where id=new.draft_id and user_id=new.user_id;
 if not found then raise exception 'Choose your own saved draft';end if;
 if new.mode='scheduled' then
 at_time:=(new.expected->>'publishAt')::timestamptz;
 if at_time is null or at_time<now()+interval '10 minutes' then raise exception 'Choose a future publication date';end if;
 else at_time:=now();end if;
 insert into public.campaign_submissions(id,user_id,draft_id,snapshot)
 values(new.id,new.user_id,new.draft_id,jsonb_build_object('provider','direct_youtube','title',d.title,'platforms',jsonb_build_array('youtube'),'planned_at',at_time,'brand_id','youtube:'||new.channel_id));
 return new;
end $$;
revoke all on function app_private.claim_youtube_promotion() from public,anon,authenticated;
create trigger enforce_youtube_allowance before insert on public.youtube_uploads for each row execute function app_private.claim_youtube_promotion();
