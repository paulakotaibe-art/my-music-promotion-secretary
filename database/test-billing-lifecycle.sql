-- Local disposable database only. The runner creates fixture roles/configuration.
begin;
do $$
declare uid uuid:=gen_random_uuid();u jsonb;p jsonb;
begin
 insert into auth.users(id,email,created_at)values(uid,uid::text||'@lifecycle.invalid',now());
 perform set_config('request.jwt.claim.sub',uid::text,true);
 update app_private.billing_config set subscriber_launch=true,bridge_hash=encode(extensions.digest('lifecycle-fixture','sha256'),'hex');
 insert into app_private.billing_customers(user_id,customer_id,livemode)values(uid,'cus_lifecycle_fixture',true);
 p:=jsonb_build_object('id','sub_lifecycle_fixture','userId',uid,'customerId','cus_lifecycle_fixture','plan','growth','status','active','periodEnd',now()+interval '30 days','livemode',true,'eventCreated',100,'cancelAtPeriodEnd',false);
 perform public.billing_bridge('lifecycle-fixture','subscription',p);
 u:=public.promotion_usage(now()+interval '1 hour');
 if u->>'plan'<>'growth' or not (u->>'canPublish')::boolean then raise exception 'Active entitlement missing';end if;
 perform public.billing_bridge('lifecycle-fixture','subscription',p||'{"eventCreated":101,"cancelAtPeriodEnd":true}'::jsonb);
 u:=public.promotion_usage(now()+interval '1 hour');
 if u->>'plan'<>'growth' then raise exception 'Cancel renewal ended access early';end if;
 -- Duplicate event is idempotent; older active event cannot clear cancellation.
 perform public.billing_bridge('lifecycle-fixture','subscription',p||'{"eventCreated":101,"cancelAtPeriodEnd":true}'::jsonb);
 perform public.billing_bridge('lifecycle-fixture','subscription',p);
 if not(select cancel_at_period_end from app_private.subscriptions where subscription_id='sub_lifecycle_fixture')then raise exception 'Older event cleared cancellation';end if;
 if(select count(*)from app_private.subscriptions where user_id=uid)<>1 then raise exception 'Duplicate entitlement';end if;
 perform public.billing_bridge('lifecycle-fixture','subscription',p||'{"eventCreated":102,"status":"past_due"}'::jsonb);
 u:=public.promotion_usage(now()+interval '1 hour');
 if u->>'plan'='growth' then raise exception 'Failed payment retained paid allowance';end if;
 perform public.billing_bridge('lifecycle-fixture','subscription',p||jsonb_build_object('eventCreated',103,'periodEnd',now()+interval '60 days'));
 u:=public.promotion_usage(now()+interval '40 days');
 if u->>'plan'<>'growth' or not(u->>'canPublish')::boolean then raise exception 'Paid recovery/renewal failed';end if;
 perform public.billing_bridge('lifecycle-fixture','subscription',p||jsonb_build_object('eventCreated',104,'periodEnd',now()-interval '1 second'));
 u:=public.promotion_usage(now()+interval '1 hour');
 if u->>'plan'='growth' then raise exception 'Expired term retained paid allowance';end if;
 perform public.billing_bridge('lifecycle-fixture','subscription',p||'{"eventCreated":105,"status":"canceled"}'::jsonb);
 perform public.billing_bridge('lifecycle-fixture','subscription',p||'{"eventCreated":103}'::jsonb);
 u:=public.promotion_usage(now()+interval '1 hour');
 if u->>'plan'='growth' then raise exception 'Delayed event reactivated canceled subscription';end if;
 begin
  perform public.billing_bridge('lifecycle-fixture','subscription',p||'{"customerId":"cus_someone_else"}'::jsonb);
  raise exception 'Wrong customer was accepted';
 exception when raise_exception then if sqlerrm<>'Customer mismatch' then raise;end if;end;
 -- Local fixture shows an exhausted trial cannot regain credit after payment loss.
 update auth.users set created_at=now()-interval '8 days' where id=uid;
 u:=public.promotion_usage(now()+interval '1 hour');
 if(u->>'canPublish')::boolean then raise exception 'Expired trial regained access';end if;
end $$;
rollback;
