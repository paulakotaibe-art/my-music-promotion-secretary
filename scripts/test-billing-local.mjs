// In-memory only. This runner accepts no database URL and makes no provider calls.
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {readFile} from 'node:fs/promises';
const db=new PGlite({extensions:{pgcrypto}});
const sql=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
try{
 await db.exec(`
 create role anon; create role authenticated;
 create schema auth; create schema extensions;
 create extension pgcrypto with schema extensions;
 create table auth.users(id uuid primary key,email text,created_at timestamptz default now());
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;
 grant execute on function auth.uid() to anon,authenticated;
 `);
 for(const path of ['database/campaign-drafts.sql','database/campaign-submissions.sql','database/billing-allowances.sql'])await db.exec(await sql(path));
 await db.exec(`
 insert into app_private.billing_config(id,bridge_hash)values(true,encode(extensions.digest('local-fixture','sha256'),'hex'));
 insert into auth.users(id,email)values('d933f707-f948-410d-b107-9ba32b37274c','owner@local.invalid');
 insert into app_private.app_owners values('d933f707-f948-410d-b107-9ba32b37274c');
 `);
 await db.exec(await sql('database/test-billing.sql'));
 await db.exec(await sql('database/test-billing-lifecycle.sql'));
 await db.exec(await sql('database/test-account-isolation.sql'));
 const result=await db.query(`select (select count(*)::int from auth.users) as users,(select subscriber_launch from app_private.billing_config) as launch,(select count(*)::int from public.campaign_submissions) as submissions`);
 const row=result.rows[0];
 if(row.users!==1||row.launch!==false||row.submissions!==0)throw Error('Fixture rollback failed');
 console.log('PASS: actual billing allowance/lifecycle and account RLS isolation SQL suites; fixtures removed and launch remains closed.');
 console.log('LIMIT: in-memory single connection; does not establish cross-session concurrency, Stripe delivery or deployed Supabase behavior.');
}finally{await db.close();}
