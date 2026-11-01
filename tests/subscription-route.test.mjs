import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const built=await build({
 entryPoints:[fileURLToPath(new URL('../app/api/billing/subscription/route.js',import.meta.url))],
 bundle:true,write:false,format:'cjs',platform:'node',
 plugins:[{name:'billing-fixture',setup(builder){
  builder.onResolve({filter:/\/lib\/billing$/},()=>({path:'billing',namespace:'fixture'}));
  builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:
   "const f=()=>globalThis.__subscriptionRouteFixture; export const billingAuth=(...a)=>f().auth(...a); export const bridge=(...a)=>f().bridge(...a); export const billingMode=()=>f().mode; export const stripeClient=()=>f().stripe; export const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});"
  }));
 }}]
});
const mod={exports:{}};
new Function('require','module','exports',built.outputFiles[0].text)(require,mod,mod.exports);
const {GET,POST}=mod.exports;
const valid=()=>({id:'sub_fixture',customer:'cus_one',metadata:{app_user_id:'one',app_plan:'starter'},livemode:false,status:'active',current_period_end:1900000000,cancel_at_period_end:false,items:{data:[{quantity:1,price:{currency:'gbp',unit_amount:799,recurring:{interval:'month',interval_count:1}}}]}});
function fixture(){
 const old=globalThis.__subscriptionRouteFixture;
 let subscription=valid();
 const updates=[],authCalls=[],reads=[];
 const f={
  mode:'test',
  async auth(request,mutating=false){authCalls.push(mutating);return {user:{id:'one'}};},
  async bridge(op,payload){reads.push({op,payload});return {id:'cus_one'};},
  stripe:{subscriptions:{
   async list(){return {data:[subscription,{...valid(),id:'sub_foreign',metadata:{app_user_id:'two'}},{...valid(),id:'sub_live',livemode:true}]};},
   async retrieve(){return subscription;},
   async update(id,changes){updates.push({id,changes});subscription={...subscription,...changes};return subscription;}
  }},
  updates,authCalls,reads,
  change(value){subscription={...subscription,...value};},
  close(){globalThis.__subscriptionRouteFixture=old;}
 };
 globalThis.__subscriptionRouteFixture=f;return f;
}
const request=body=>new Request('https://fixture.invalid/api/billing/subscription',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const cancellation={action:'cancel_renewal',subscriptionId:'sub_fixture',confirmed:true};
test('real GET route returns only the authenticated user and matching billing mode without writes',async()=>{
 const f=fixture();try{
  const response=await GET(new Request('https://fixture.invalid/api/billing/subscription'));
  assert.equal(response.status,200);
  const body=await response.json();assert.equal(body.subscriptions.length,1);assert.equal(body.subscriptions[0].id,'sub_fixture');
  assert.equal(body.subscriptions[0].name,'Starter Artist');assert.equal(body.subscriptions[0].test,true);
  assert.deepEqual(f.updates,[]);assert.deepEqual(f.authCalls,[false]);
 }finally{f.close();}
});
test('real cancellation route rejects missing confirmation before any Stripe operation',async()=>{
 const f=fixture();try{
  const response=await POST(request({...cancellation,confirmed:false}));
  assert.equal(response.status,400);assert.deepEqual(f.reads,[]);assert.deepEqual(f.updates,[]);
 }finally{f.close();}
});
test('real cancellation route rejects another customer, user or mode without changing subscription',async()=>{
 for(const change of [{customer:'cus_other'},{metadata:{app_user_id:'two'}},{livemode:true}]){
  const f=fixture();try{
   f.change(change);const response=await POST(request(cancellation));
   assert.equal(response.status,404);assert.deepEqual(f.updates,[]);
  }finally{f.close();}
 }
});
test('real route cancels renewal once and a repeated confirmed request does not repeat the Stripe write',async()=>{
 const f=fixture();try{
  for(let i=0;i<2;i++){
   const response=await POST(request(cancellation));assert.equal(response.status,200);
   const body=await response.json();assert.equal(body.subscription.cancelAtPeriodEnd,true);
   assert.equal(body.subscription.status,'active');assert.equal(body.subscription.endsAt,new Date(1900000000*1000).toISOString());
  }
  assert.deepEqual(f.updates,[{id:'sub_fixture',changes:{cancel_at_period_end:true}}]);
  assert.deepEqual(f.authCalls,[true,true]);
 }finally{f.close();}
});
test('real route denies failed authentication and sanitizes provider errors without a false success',async()=>{
 const f=fixture();try{
  f.auth=async()=>{throw Error('auth detail');};
  assert.equal((await POST(request(cancellation))).status,401);assert.deepEqual(f.reads,[]);
  f.auth=async()=>({user:{id:'one'}});
  f.stripe.subscriptions.retrieve=async()=>{throw Error('private provider credential');};
  const response=await POST(request(cancellation));
  assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/private provider credential/);
  assert.deepEqual(f.updates,[]);
 }finally{f.close();}
});

test('an authenticated artist without a billing customer sees no subscriptions and cannot cancel one',async()=>{
 const f=fixture();try{
  f.bridge=async()=>({});
  f.stripe.subscriptions.list=async()=>{throw Error('Must not call Stripe without a customer');};
  f.stripe.subscriptions.retrieve=async()=>{throw Error('Must not call Stripe without a customer');};
  const response=await GET(new Request('https://fixture.invalid/api/billing/subscription'));
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{subscriptions:[]});
  assert.equal((await POST(request(cancellation))).status,404);assert.deepEqual(f.updates,[]);
 }finally{f.close();}
});
