-- Disposable fixture database only; run through scripts/test-billing-local.mjs.
begin;
insert into auth.users(id,email)values
 ('11111111-1111-4111-8111-111111111111','first@isolation.invalid'),
 ('22222222-2222-4222-8222-222222222222','second@isolation.invalid');
insert into public.campaign_drafts(id,user_id,title,platforms)values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','First private draft',array['youtube']),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','Second private draft',array['youtube']);
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
declare n int;
begin
 select count(*)into n from public.campaign_drafts;
 if n<>1 then raise exception 'Account read isolation failed';end if;
 update public.campaign_drafts set title='Unauthorized change' where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Cross-account update allowed';end if;
 begin
  update public.campaign_drafts set user_id='22222222-2222-4222-8222-222222222222' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  raise exception 'Draft ownership reassignment allowed';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.campaign_drafts(user_id,title,platforms)values('22222222-2222-4222-8222-222222222222','Forged owner',array['youtube']);
  raise exception 'Cross-account insert allowed';
 exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$
begin
 if(select count(*)from public.campaign_drafts)<>1 or not exists(select 1 from public.campaign_drafts where title='Second private draft')then raise exception 'Second account isolation failed';end if;
end $$;
rollback;
