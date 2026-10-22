import test from 'node:test';
import assert from 'node:assert/strict';
import {PLANS,verifiedPlan} from '../lib/plans.mjs';
test('entitlements only recognize an exact server-priced monthly GBP subscription',()=>{
 const make=(plan='starter')=>({metadata:{app_plan:plan},items:{data:[{quantity:1,price:{currency:'gbp',unit_amount:PLANS[plan].pence,recurring:{interval:'month',interval_count:1}}}]}});
 for(const p of Object.keys(PLANS))assert.equal(verifiedPlan(make(p)),p);
 for(const mutate of [s=>s.items.data[0].price.unit_amount=500,s=>s.items.data[0].quantity=2,s=>s.items.data[0].price.currency='usd',s=>s.items.data[0].price.recurring.interval='year',s=>s.items.data.push(s.items.data[0]),s=>s.metadata.app_plan='owner']){const s=make();mutate(s);assert.equal(verifiedPlan(s),null);}
});
