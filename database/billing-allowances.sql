-- Private billing state; no service-role key or client-writable entitlement.
create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to anon, authenticated;
create table app_private.billing_config (id boolean primary key default true check(id), bridge_hash text not null, webhook_secret text, portal_configuration text, test_webhook_secret text, test_portal_configuration text, subscriber_launch boolean not null default false);
alter table app_private.billing_config enable row level security;
-- Provision bridge_hash out of band; never commit the bridge token.
create table app_private.app_owners(user_id uuid primary key references auth.users(id));
alter table app_private.app_owners enable row level security;
create table app_private.billing_customers(user_id uuid references auth.users(id), customer_id text unique not null, livemode boolean not null, checkout_plan text, checkout_id text, checkout_nonce uuid, checkout_expires timestamptz, primary key(user_id,livemode));
alter table app_private.billing_customers enable row level security;
create table app_private.subscriptions(subscription_id text primary key,user_id uuid not null references auth.users(id),customer_id text not null,plan text not null check(plan in ('starter','growth','executive')),status text not null,period_end timestamptz not null,livemode boolean not null,event_created bigint not null);
alter table app_private.subscriptions enable row level security;
create index on app_private.subscriptions(user_id);
create table app_private.artist_profiles(user_id uuid primary key references auth.users(id),brand_id text unique not null);
alter table app_private.artist_profiles enable row level security;
alter table public.campaign_submissions add column quota_exempt boolean not null default false;
alter table public.campaign_submissions add column quota_released boolean not null default false;
-- Preserve every pre-existing reservation, including the owner's queued pilot.
update public.campaign_submissions set quota_exempt=true;
create function app_private.billing_bridge(token text,op text,payload jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb; c app_private.billing_customers%rowtype;
begin
 if not exists(select 1 from app_private.billing_config where bridge_hash=encode(extensions.digest(token,'sha256'),'hex')) then raise exception 'Invalid billing authentication'; end if;
 if op='config' then select jsonb_build_object('webhookSecret',case when coalesce((payload->>'livemode')::boolean,true) then webhook_secret else test_webhook_secret end,'launch',subscriber_launch,'portalConfiguration',case when coalesce((payload->>'livemode')::boolean,true) then portal_configuration else test_portal_configuration end) into r from app_private.billing_config; return r;
 elsif op='set_portal' then if coalesce((payload->>'livemode')::boolean,true) then update app_private.billing_config set portal_configuration=payload->>'id';else update app_private.billing_config set test_portal_configuration=payload->>'id';end if;return '{}'::jsonb;
 elsif op='checkout_claim' then
   select * into c from app_private.billing_customers where user_id=(payload->>'userId')::uuid and livemode=(payload->>'livemode')::boolean for update;
   if not found then raise exception 'Customer missing';end if;
   if c.checkout_nonce is null or c.checkout_expires<now() then
    update app_private.billing_customers set checkout_plan=payload->>'plan',checkout_id=null,checkout_nonce=gen_random_uuid(),checkout_expires=now()+interval '25 hours' where user_id=c.user_id and livemode=c.livemode returning * into c;
   end if;
   return jsonb_build_object('id',c.checkout_id,'nonce',c.checkout_nonce,'plan',c.checkout_plan);
 elsif op='checkout_saved' then update app_private.billing_customers set checkout_id=payload->>'id' where user_id=(payload->>'userId')::uuid and livemode=(payload->>'livemode')::boolean and checkout_nonce=(payload->>'nonce')::uuid;return '{}'::jsonb;
 elsif op='checkout_clear' then update app_private.billing_customers set checkout_nonce=null,checkout_id=null where user_id=(payload->>'userId')::uuid and livemode=(payload->>'livemode')::boolean and checkout_nonce=(payload->>'nonce')::uuid;return '{}'::jsonb;
 elsif op='set_hook' then if coalesce((payload->>'livemode')::boolean,true) then update app_private.billing_config set webhook_secret=payload->>'secret';else update app_private.billing_config set test_webhook_secret=payload->>'secret';end if;return '{}'::jsonb;
 elsif op='customer' then select jsonb_build_object('id',customer_id) into r from app_private.billing_customers where user_id=(payload->>'userId')::uuid and livemode=(payload->>'livemode')::boolean;return coalesce(r,'{}'::jsonb);
 elsif op='set_customer' then insert into app_private.billing_customers(user_id,customer_id,livemode) values((payload->>'userId')::uuid,payload->>'id',(payload->>'livemode')::boolean) on conflict(user_id,livemode) do nothing;return '{}'::jsonb;
 elsif op='subscription' then
   if not exists(select 1 from app_private.billing_customers where user_id=(payload->>'userId')::uuid and customer_id=payload->>'customerId' and livemode=(payload->>'livemode')::boolean) then raise exception 'Customer mismatch';end if;
   insert into app_private.subscriptions values(payload->>'id',(payload->>'userId')::uuid,payload->>'customerId',payload->>'plan',payload->>'status',(payload->>'periodEnd')::timestamptz,(payload->>'livemode')::boolean,(payload->>'eventCreated')::bigint)
   on conflict(subscription_id) do update set status=excluded.status,plan=excluded.plan,period_end=excluded.period_end,event_created=excluded.event_created
   where app_private.subscriptions.user_id=excluded.user_id and app_private.subscriptions.livemode=excluded.livemode and app_private.subscriptions.event_created<=excluded.event_created;
   return '{}'::jsonb;
 elsif op='release' then update public.campaign_submissions set quota_released=true where id=(payload->>'id')::uuid and user_id=(payload->>'userId')::uuid;return '{}'::jsonb;
 else raise exception 'Unknown billing operation';end if;
end $$;
revoke all on function app_private.billing_bridge(text,text,jsonb) from public;
grant execute on function app_private.billing_bridge(text,text,jsonb) to anon,authenticated;
create function public.billing_bridge(token text,op text,payload jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select app_private.billing_bridge(token,op,payload)$$;
revoke all on function public.billing_bridge(text,text,jsonb) from public;
grant execute on function public.billing_bridge(text,text,jsonb) to anon,authenticated;
create function app_private.promotion_usage(at_time timestamptz default now()) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();s app_private.subscriptions%rowtype; pname text:='trial';lim int:=3;qlim int:=3;used int;queued int;ends timestamptz;week_start timestamptz;week_end timestamptz;live boolean;reason text;
begin
 if uid is null then raise exception 'Sign in required';end if;
 if exists(select 1 from app_private.app_owners where user_id=uid) then return jsonb_build_object('plan','owner','owner',true,'testSubscription',exists(select 1 from app_private.subscriptions where user_id=uid and not livemode and status='active'),'canPublish',true,'remaining',null,'limit',null,'queueLimit',null);end if;
 if at_time is null or at_time<now()-interval '1 minute' then raise exception 'Choose a future publication date';end if;
 select subscriber_launch into live from app_private.billing_config;
 select * into s from app_private.subscriptions where user_id=uid and livemode and status='active' and period_end>now() order by period_end desc limit 1;
 if found then pname:=s.plan;ends:=s.period_end;lim:=case pname when 'starter' then 3 when 'growth' then 10 else 25 end;qlim:=case pname when 'starter' then 12 when 'growth' then 40 else 100 end;
 else select created_at+interval '7 days' into ends from auth.users where id=uid;end if;
 week_start:=date_trunc('week',at_time at time zone 'Europe/London') at time zone 'Europe/London';
 week_end:=((week_start at time zone 'Europe/London')+interval '7 days') at time zone 'Europe/London';
 select count(*) into used from public.campaign_submissions where user_id=uid and not quota_exempt and not quota_released and (pname='trial' or ((snapshot->>'planned_at')::timestamptz>=week_start and (snapshot->>'planned_at')::timestamptz<week_end));
 select count(*) into queued from public.campaign_submissions where user_id=uid and not quota_exempt and not quota_released and (snapshot->>'planned_at')::timestamptz>=now();
 reason:=case when not coalesce(live,false) then 'Subscriber publishing is being prepared for launch.' when ends<=now() then 'Choose an active subscription to publish.' when at_time>=ends then 'Choose a date within your current paid period or trial.' when used>=lim then 'Your promotion allowance for this period is used.' when queued>=qlim then 'Your scheduled promotion queue is full.' else null end;
 return jsonb_build_object('plan',pname,'owner',false,'limit',lim,'used',used,'remaining',greatest(0,lim-used),'queueLimit',qlim,'queued',queued,'periodEnd',ends,'weekStart',week_start,'weekEnd',week_end,'canPublish',reason is null,'reason',reason,'launch',coalesce(live,false),'testSubscription',exists(select 1 from app_private.subscriptions where user_id=uid and not livemode and status='active'));
end $$;
revoke all on function app_private.promotion_usage(timestamptz) from public;
grant execute on function app_private.promotion_usage(timestamptz) to authenticated;
create function public.promotion_usage(at_time timestamptz default now()) returns jsonb language sql security invoker set search_path='' as $$select app_private.promotion_usage(at_time)$$;
revoke all on function public.promotion_usage(timestamptz) from public;
grant execute on function public.promotion_usage(timestamptz) to authenticated;
create function app_private.claim_promotion() returns trigger language plpgsql security definer set search_path='' as $$
declare u jsonb;
begin
 if auth.uid() is null or auth.uid()<>new.user_id then raise exception 'Sign in required';end if;
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
 new.quota_exempt:=false;new.quota_released:=false;new.created_at:=now();
 if exists(select 1 from app_private.app_owners where user_id=new.user_id) then new.quota_exempt:=true;return new;end if;
 u:=app_private.promotion_usage((new.snapshot->>'planned_at')::timestamptz);
 if not (u->>'canPublish')::boolean then raise exception '%',u->>'reason';end if;
 if coalesce(new.snapshot->>'brand_id','')='' then raise exception 'Connect your artist profile';end if;
 insert into app_private.artist_profiles values(new.user_id,new.snapshot->>'brand_id') on conflict(user_id) do nothing;
 if not exists(select 1 from app_private.artist_profiles where user_id=new.user_id and brand_id=new.snapshot->>'brand_id') then raise exception 'Your plan includes one artist profile';end if;
 return new;
end $$;
revoke all on function app_private.claim_promotion() from public,anon,authenticated;
create trigger enforce_promotion_allowance before insert on public.campaign_submissions for each row execute function app_private.claim_promotion();
-- Only the publishing receipt columns can be changed by a client.
revoke update on public.campaign_submissions from authenticated;
grant update(evidence,evidence_signature) on public.campaign_submissions to authenticated;

