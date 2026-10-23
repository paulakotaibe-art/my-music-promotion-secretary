import test from 'node:test';
import assert from 'node:assert/strict';
import {assertOwnedSubscription} from '../lib/subscription-access.mjs';
test('cancellation requires matching Stripe customer, app user and billing mode',()=>{
 const s={customer:'cus_one',metadata:{app_user_id:'user_one'},livemode:false};
 assert.doesNotThrow(()=>assertOwnedSubscription(s,'cus_one','user_one',false));
 for(const args of [['cus_other','user_one',false],['cus_one','user_other',false],['cus_one','user_one',true]])assert.throws(()=>assertOwnedSubscription(s,...args));
 assert.doesNotThrow(()=>assertOwnedSubscription({...s,customer:{id:'cus_one'}},'cus_one','user_one',false));
});
