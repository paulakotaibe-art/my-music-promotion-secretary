import test from 'node:test';
import assert from 'node:assert/strict';
import {billingMode,billingCredentials} from '../lib/billing-mode.mjs';
test('default test mode uses the separate test credential and leaves live configuration untouched',()=>{
 const env={STRIPE_SECRET_KEY:'sk_live_fixture',STRIPE_TEST_SECRET_KEY:'sk_test_fixture'};
 assert.equal(billingMode(env),'test');assert.deepEqual(billingCredentials(env),{key:'sk_test_fixture',testMode:true});assert.equal(env.STRIPE_SECRET_KEY,'sk_live_fixture');
 assert.deepEqual(billingCredentials({...env,BILLING_MODE:'live'}),{key:'sk_live_fixture',testMode:false});
});
test('missing or misconfigured test credentials never fall back to a live key',()=>{
 for(const env of [{STRIPE_SECRET_KEY:'sk_live_fixture'},{STRIPE_SECRET_KEY:'sk_live_fixture',STRIPE_TEST_SECRET_KEY:'sk_live_wrong'},{STRIPE_TEST_SECRET_KEY:'pk_test_wrong'},{BILLING_MODE:'mistyped',STRIPE_SECRET_KEY:'sk_live_fixture'}])assert.throws(()=>billingCredentials(env));
 assert.throws(()=>billingCredentials({BILLING_MODE:'live',STRIPE_SECRET_KEY:'sk_test_wrong'}));
});
