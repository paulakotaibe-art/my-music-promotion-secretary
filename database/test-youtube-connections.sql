-- All fixture rows and changes roll back.
begin;
insert into auth.users(id,email,created_at) values('5fdb7775-dacb-4112-a037-80655406fd10','youtube-fixture-a@tests.invalid',now()),('5fdb7775-dacb-4112-a037-80655406fd11','youtube-fixture-b@tests.invalid',now());
set local role authenticated;
select set_config('request.jwt.claim.sub','5fdb7775-dacb-4112-a037-80655406fd10',true);
insert into public.youtube_connections(user_id,channel_id,channel_title,encrypted_tokens) values('5fdb7775-dacb-4112-a037-80655406fd10','fixture','Fixture','not-a-token');
do $$ begin if (select count(*) from public.youtube_connections)<>1 then raise exception 'Own connection invisible';end if;end $$;
select set_config('request.jwt.claim.sub','5fdb7775-dacb-4112-a037-80655406fd11',true);
do $$ begin
 if exists(select 1 from public.youtube_connections) then raise exception 'Foreign connection visible';end if;
 begin
 insert into public.youtube_connections(user_id,channel_id,channel_title,encrypted_tokens) values('5fdb7775-dacb-4112-a037-80655406fd10','bad','bad','bad');
 raise exception 'Foreign write allowed';
 exception when insufficient_privilege then null;end;
 update public.youtube_connections set channel_title='bad';if found then raise exception 'Foreign update allowed';end if;
 if has_table_privilege('anon','public.youtube_connections','SELECT') then raise exception 'Anonymous read allowed';end if;
end $$;
rollback;
