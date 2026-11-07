-- Local disposable fixture exercise only; no provider or Auth admin API calls.
begin;
insert into auth.users(id,email)values
 ('33333333-3333-4333-8333-333333333333','remove@deletion.invalid'),
 ('44444444-4444-4444-8444-444444444444','keep@deletion.invalid');
insert into public.campaign_drafts(user_id,title,platforms)values
 ('33333333-3333-4333-8333-333333333333','Remove fixture',array['youtube']),
 ('44444444-4444-4444-8444-444444444444','Keep fixture',array['youtube']);
insert into public.youtube_connections(user_id,channel_id,channel_title,encrypted_tokens)values
 ('33333333-3333-4333-8333-333333333333','remove-channel','Remove','not-a-token'),
 ('44444444-4444-4444-8444-444444444444','keep-channel','Keep','not-a-token');
insert into public.social_connections(user_id,provider,account_id,account_name,encrypted_connection)values
 ('33333333-3333-4333-8333-333333333333','tiktok','remove-social','Remove','not-a-token'),
 ('44444444-4444-4444-8444-444444444444','tiktok','keep-social','Keep','not-a-token');
insert into app_private.billing_customers(user_id,customer_id,livemode)values('33333333-3333-4333-8333-333333333333','cus_delete_fixture',false);
insert into app_private.subscriptions values('sub_delete_fixture','33333333-3333-4333-8333-333333333333','cus_delete_fixture','starter','canceled',now()-interval '1 day',false,1,true);
insert into app_private.artist_profiles values('33333333-3333-4333-8333-333333333333','deletion-artist');
set local role authenticated;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$
declare n int;
begin
 delete from public.youtube_connections where user_id='44444444-4444-4444-8444-444444444444';
 get diagnostics n=row_count;if n<>0 then raise exception 'Foreign YouTube deletion allowed';end if;
 delete from public.social_connections where user_id='44444444-4444-4444-8444-444444444444';
 get diagnostics n=row_count;if n<>0 then raise exception 'Foreign social deletion allowed';end if;
 delete from public.youtube_connections where user_id=auth.uid();
 get diagnostics n=row_count;if n<>1 then raise exception 'Own YouTube removal failed';end if;
 delete from public.social_connections where user_id=auth.uid();
 get diagnostics n=row_count;if n<>1 then raise exception 'Own social removal failed';end if;
 if exists(select 1 from public.youtube_connections)or exists(select 1 from public.social_connections)then raise exception 'Removed connections remain visible';end if;
end $$;
reset role;
do $$ begin
 begin
  delete from auth.users where id='33333333-3333-4333-8333-333333333333';
  raise exception 'Unresolved billing dependencies were ignored';
 exception when foreign_key_violation then null;end;
end $$;
-- Operator-only removal after synthetic canceled-billing dependency assessment.
delete from app_private.subscriptions where user_id='33333333-3333-4333-8333-333333333333';
delete from app_private.billing_customers where user_id='33333333-3333-4333-8333-333333333333';
delete from app_private.artist_profiles where user_id='33333333-3333-4333-8333-333333333333';
delete from auth.users where id='33333333-3333-4333-8333-333333333333';
do $$ begin
 if exists(select 1 from auth.users where id='33333333-3333-4333-8333-333333333333')
 or exists(select 1 from public.campaign_drafts where user_id='33333333-3333-4333-8333-333333333333')then raise exception 'Fixture account/draft removal failed';end if;
 if not exists(select 1 from auth.users where id='44444444-4444-4444-8444-444444444444')
 or not exists(select 1 from public.campaign_drafts where user_id='44444444-4444-4444-8444-444444444444'and title='Keep fixture')
 or not exists(select 1 from public.youtube_connections where channel_id='keep-channel')
 or not exists(select 1 from public.social_connections where account_id='keep-social')then raise exception 'Unrelated account changed';end if;
end $$;
rollback;
