import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareTestBilling,setupFailure} from '../lib/billing-setup.mjs';
const origin='https://app.example';
test('portal failure does not block verified test checkout and reports only safe diagnostics',async()=>{
 const result=await prepareTestBilling({origin,bridge:async()=>({webhookSecret:'whsec_fixture'}),stripe:{billingPortal:{configurations:{create:async()=>{throw {type:'StripeInvalidRequestError',code:'parameter_unknown',param:'business_profile[headline]',message:'sk_test_private must never appear'};}}}}});
 assert.equal(result.status,200);assert.equal(result.body.ready,true);assert.equal(result.body.portalReady,false);assert.equal(result.body.diagnostic.stage,'create_cancellation_portal');assert.equal(result.body.diagnostic.parameter,'business_profile[headline]');assert.ok(!JSON.stringify(result).includes('sk_test_private'));
});
test('portal state is saved and a previously saved configuration is reused',async()=>{
 let created=0,saved;const stripe={billingPortal:{configurations:{create:async()=>{created++;return {id:'bpc_fixture'};}}}};
 const result=await prepareTestBilling({origin,stripe,bridge:async(op,payload)=>{if(op==='config')return {webhookSecret:'whsec_fixture'};saved=payload.id;}});
 assert.equal(result.body.portalReady,true);assert.equal(saved,'bpc_fixture');
 await prepareTestBilling({origin,stripe,bridge:async()=>({webhookSecret:'whsec_fixture',portalConfiguration:'bpc_fixture'})});assert.equal(created,1);
});
test('missing webhook verification still blocks checkout preparation',async()=>{
 const result=await prepareTestBilling({origin,bridge:async()=>({}),stripe:{webhookEndpoints:{list:async()=>({data:[{url:`${origin}/api/billing/webhook`}]})}}});
 assert.equal(result.status,409);assert.ok(!result.body.ready);
 assert.deepEqual(setupFailure({code:'contains secret spaces',param:'https://secret.invalid/key'},'fixture'),{stage:'fixture',code:'unavailable'});
});
