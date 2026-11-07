import test from 'node:test';
import assert from 'node:assert/strict';
import {authenticate} from '../lib/server-auth.js';

test('authenticated database requests preserve identity and always bypass caches',async()=>{
 const originalFetch=globalThis.fetch;
 const oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,oldKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://sandbox-example.supabase.co';
 process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='public-test-key';
 const calls=[];let enabled=false;
 globalThis.fetch=async(url,options)=>{
  calls.push({url:String(url),options});
  return new Response(JSON.stringify(String(url).includes('/auth/v1/user')?{id:'owner',email:'owner@example.test'}:{enabled}),{status:200,headers:{'Content-Type':'application/json'}});
 };
 try{
  const auth=await authenticate('test-user-token');
  assert.equal(auth.user.id,'owner');
  assert.equal((await auth.client.rpc('tiktok_publishing_access')).data.enabled,false);
  enabled=true;
  assert.equal((await auth.client.rpc('tiktok_publishing_access')).data.enabled,true);
  assert.equal(calls.length,3);
  for(const call of calls){assert.equal(call.options.cache,'no-store');assert.equal(new Headers(call.options.headers).get('Authorization'),'Bearer test-user-token');}
 }finally{
  globalThis.fetch=originalFetch;
  if(oldUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=oldUrl;
  if(oldKey===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=oldKey;
 }
});
