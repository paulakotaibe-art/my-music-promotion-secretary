import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import Stripe from 'stripe';
const require=createRequire(import.meta.url);
const built=await build({
 entryPoints:[fileURLToPath(new URL('../app/api/billing/webhook/route.js',import.meta.url))],
 bundle:true,write:false,format:'cjs',platform:'node',
 plugins:[{name:'webhook-fixture',setup(builder){
  builder.onResolve({filter:/\/lib\/billing$/},()=>({path:'billing',namespace:'fixture'}));
  builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:
   "const f=()=>globalThis.__webhookRouteFixture; export const stripeClient=mode=>f().client(mode); export const bridge=(...a)=>f().bridge(...a); export const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});"
  }));
 }}]
});
const mod={exports:{}};
new Function('require','module','exports',built.outputFiles[0].text)(require,mod,mod.exports);
const {POST}=mod.exports;
const secrets={test:'whsec_local_test_fixture',live:'whsec_local_live_fixture'};
const event=()=>({id:'evt_fixture',object:'event',created:1900000000,livemode:false,type:'customer.subscription.updated',data:{object:{id:'sub_fixture',status:'active'}}});
const subscription=()=>({id:'sub_fixture',customer:'cus_fixture',livemode:false,status:'canceled',cancel_at_period_end:true,current_period_end:1900000000,metadata:{app_user_id:'one',app_plan:'starter'},items:{data:[{quantity:1,price:{currency:'gbp',unit_amount:799,recurring:{interval:'month',interval_count:1}}}]}});
function fixture(){
 const old=globalThis.__webhookRouteFixture,calls=[],reads=[],modes=[];
 let current=subscription();
 const stripe=new Stripe('sk_test_fixture');
 stripe.subscriptions.retrieve=async id=>{reads.push(id);return current;};
 const f={
  client(mode){modes.push(mode);return stripe;},
  async bridge(op,payload){calls.push({op,payload});return op==='config'?{webhookSecret:secrets[payload.livemode?'live':'test']}:{ };},
  change(value){current={...current,...value};},
  calls,reads,modes,
  close(){globalThis.__webhookRouteFixture=old;}
 };
 globalThis.__webhookRouteFixture=f;return f;
}
function signed(value,signingMode='test',tamper=false){
 let raw=JSON.stringify(value);
 const stripe=new Stripe('sk_test_fixture');
 const signature=stripe.webhooks.generateTestHeaderString({payload:raw,secret:secrets[signingMode]});
 if(tamper)raw=raw.replace('evt_fixture','evt_altered');
 return new Request('https://fixture.invalid/api/billing/webhook',{method:'POST',headers:{'stripe-signature':signature},body:raw});
}
test('real webhook route verifies a real SDK signature and persists current Stripe state, not an older event snapshot',async()=>{
 const f=fixture();try{
  const response=await POST(signed(event()));assert.equal(response.status,200);
  const saved=f.calls.find(x=>x.op==='subscription').payload;
  assert.equal(saved.status,'canceled');assert.equal(saved.cancelAtPeriodEnd,true);
  assert.equal(saved.userId,'one');assert.equal(saved.livemode,false);assert.deepEqual(f.reads,['sub_fixture']);
 }finally{f.close();}
});
test('tampered payload and mismatched mode signing secret cannot write an entitlement',async()=>{
 for(const req of [()=>signed(event(),'test',true),()=>signed({...event(),livemode:true},'test')]){
  const f=fixture();try{
   assert.equal((await POST(req())).status,400);
   assert.deepEqual(f.reads,[]);assert.equal(f.calls.some(x=>x.op==='subscription'),false);
  }finally{f.close();}
 }
});
test('unexpected price or missing user binding is ignored without an entitlement write',async()=>{
 for(const change of [{metadata:{}},{items:{data:[{quantity:1,price:{currency:'gbp',unit_amount:1,recurring:{interval:'month',interval_count:1}}}]}}]){
  const f=fixture();try{
   f.change(change);const response=await POST(signed(event()));
   assert.equal(response.status,200);assert.equal((await response.json()).ignored,true);
   assert.equal(f.calls.some(x=>x.op==='subscription'),false);
  }finally{f.close();}
 }
});
test('failed persistence asks Stripe to retry and never acknowledges false completion',async()=>{
 const f=fixture();try{
  const bridge=f.bridge;f.bridge=async(op,payload)=>{if(op==='subscription')throw Error('private database credential');return bridge(op,payload);};
  const response=await POST(signed(event()));
  assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/private database credential/);
 }finally{f.close();}
});
