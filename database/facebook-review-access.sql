-- Scoped Meta review accounts. Empty by default; no public rollout is enabled.
create table app_private.facebook_reviewers (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default false,
 expires_at timestamptz not null,
 promotion_limit integer not null default 10 check (promotion_limit between 1 and 25),
 created_at timestamptz not null default now()
);
alter table app_private.facebook_reviewers enable row level security;
revoke all on app_private.facebook_reviewers from public,anon,authenticated;
create function app_private.facebook_review_usage(uid uuid, at_time timestamptz)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r app_private.facebook_reviewers%rowtype;used int;queued int;reason text;
begin
 select * into r from app_private.facebook_reviewers where user_id=uid and enabled and expires_at>now();
 if not found then return null;end if;
 if at_time is null or at_time<now()-interval '1 minute' then raise exception 'Choose a future publication date';end if;
 select count(*) into used from public.campaign_submissions
 where user_id=uid and snapshot->>'provider'='direct_facebook' and not quota_released;
 select count(*) into queued from public.campaign_submissions
 where user_id=uid and snapshot->>'provider'='direct_facebook' and not quota_released and (snapshot->>'planned_at')::timestamptz>=now();
 reason:=case when at_time>=r.expires_at then 'Choose a date within the review access period.'
 when used>=r.promotion_limit then 'The dedicated review promotion allowance is used.'
 when queued>=3 then 'The dedicated review queue is full.' else null end;
 return jsonb_build_object('plan','review','owner',false,'reviewer',true,'limit',r.promotion_limit,'used',used,
 'remaining',greatest(0,r.promotion_limit-used),'queueLimit',3,'queued',queued,'periodEnd',r.expires_at,
 'canPublish',reason is null,'reason',reason,'launch',false,'testSubscription',false);
end $$;
revoke all on function app_private.facebook_review_usage(uuid,timestamptz) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION app_private.facebook_publishing_access()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u jsonb;is_open boolean;review jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 review:=app_private.facebook_review_usage(auth.uid(),now());
 if review is not null then return jsonb_build_object('owner',false,'reviewer',true,'enabled',true,'allowance',review);end if;
 u:=app_private.promotion_usage();
 if auth.uid()='d933f707-f948-410d-b107-9ba32b37274c'::uuid then return jsonb_build_object('owner',true,'enabled',true,'allowance',u);end if;
 select enabled and meta_approved into is_open from app_private.facebook_rollout where id;
 is_open:=coalesce(is_open,false) and coalesce((u->>'launch')::boolean,false);
 return jsonb_build_object('owner',false,'enabled',is_open,'allowance',u,'reason',case when not is_open then 'Facebook customer publishing is awaiting platform approval and the verified launch test.' else u->>'reason' end);
end $function$
;
CREATE OR REPLACE FUNCTION app_private.claim_promotion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u jsonb;
begin
 if auth.uid() is null or auth.uid()<>new.user_id then raise exception 'Sign in required';end if;
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
 new.quota_exempt:=false;new.quota_released:=false;new.created_at:=now();
 if exists(select 1 from app_private.app_owners where user_id=new.user_id) then new.quota_exempt:=true;return new;end if;
 if new.snapshot->>'provider'='direct_facebook' then u:=app_private.facebook_review_usage(new.user_id,(new.snapshot->>'planned_at')::timestamptz);end if;
 if u is null then u:=app_private.promotion_usage((new.snapshot->>'planned_at')::timestamptz);end if;
 if not (u->>'canPublish')::boolean then raise exception '%',u->>'reason';end if;
 if coalesce(new.snapshot->>'brand_id','')='' then raise exception 'Connect your artist profile';end if;
 insert into app_private.artist_profiles values(new.user_id,new.snapshot->>'brand_id') on conflict(user_id) do nothing;
 if not exists(select 1 from app_private.artist_profiles where user_id=new.user_id and brand_id=new.snapshot->>'brand_id') then raise exception 'Your plan includes one artist profile';end if;
 return new;
end $function$
;
CREATE OR REPLACE FUNCTION app_private.facebook_dispatch_allowed(uid uuid, at_time timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare ends timestamptz;
begin
 if uid='d933f707-f948-410d-b107-9ba32b37274c'::uuid then return true;end if;
 if exists(select 1 from app_private.facebook_reviewers where user_id=uid and enabled and expires_at>now() and at_time<expires_at) then return true;end if;
 if not exists(select 1 from app_private.facebook_rollout where enabled and meta_approved) or not exists(select 1 from app_private.billing_config where subscriber_launch) then return false;end if;
 select max(period_end) into ends from app_private.subscriptions where user_id=uid and livemode and status='active' and period_end>now();
 if ends is null then select created_at+interval '7 days' into ends from auth.users where id=uid;end if;
 return coalesce(ends>now() and at_time<ends,false);
end $function$
;
create function app_private.facebook_promotion_usage(at_time timestamptz default now())
returns jsonb language plpgsql security definer set search_path='' as $$
declare u jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 if not coalesce((app_private.facebook_publishing_access()->>'enabled')::boolean,false) then raise exception 'Facebook publishing access is not enabled';end if;
 u:=app_private.facebook_review_usage(auth.uid(),at_time);
 if u is null then u:=app_private.promotion_usage(at_time);end if;
 return u;
end $$;
revoke all on function app_private.facebook_promotion_usage(timestamptz) from public,anon;
grant execute on function app_private.facebook_promotion_usage(timestamptz) to authenticated;
create function public.facebook_promotion_usage(at_time timestamptz default now())
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.facebook_promotion_usage(at_time)
$$;
revoke all on function public.facebook_promotion_usage(timestamptz) from public,anon;
grant execute on function public.facebook_promotion_usage(timestamptz) to authenticated;
notify pgrst,'reload schema';
