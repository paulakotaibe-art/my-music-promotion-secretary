import test from 'node:test';import assert from 'node:assert/strict';
import {publishingReadiness} from '../lib/publishing-readiness.mjs';
const connections={youtube:{connected:true},facebook:{connected:true,pageSelected:true},tiktok:{connected:true}};
test('subscriber status shows server allowance without opening unverified platforms',()=>{const r=publishingReadiness({owner:false,plan:'starter',limit:3,remaining:2,queued:1,queueLimit:12,canPublish:false,reason:'Launch closed'},connections);assert.equal(r.allowanceText,'2 of 3 weekly promotions remaining');assert.equal(r.channels.some(c=>c.ready),false);assert.equal(r.channels[0].reason,'Launch closed');});
test('even an active subscription is not treated as platform approval',()=>{assert.equal(publishingReadiness({owner:false,plan:'growth',limit:10,remaining:10,canPublish:true},connections).channels.some(c=>c.ready),false);});
test('owner readiness still requires own connection and Page selection',()=>{const r=publishingReadiness({owner:true},connections);assert.equal(r.channels[0].ready,true);assert.equal(r.channels[1].ready,true);assert.equal(r.channels[2].ready,false);assert.equal(publishingReadiness({owner:true},{facebook:{connected:true,pageSelected:false}}).channels.some(c=>c.ready),false);});
test('trial and malformed counts cannot display fictitious additional credits',()=>{assert.equal(publishingReadiness({plan:'trial',limit:3,remaining:3},{}).allowanceText,'3 of 3 trial promotions remaining');assert.match(publishingReadiness({plan:'starter',limit:3,remaining:99},{}).allowanceText,/3 of 3/);});

test('Facebook checklist distinguishes saved authorization, Page selection and launch approval',()=>{
 const get=c=>publishingReadiness({owner:false,plan:'starter',limit:3,remaining:3,canPublish:true},{facebook:c}).channels.find(x=>x.provider==='facebook').steps.map(x=>x.complete);
 assert.deepEqual(get({}),[false,false,false]);
 assert.deepEqual(get({connected:true}),[true,false,false]);
 assert.deepEqual(get({connected:true,pageSelected:true}),[true,true,false]);
 const owner=publishingReadiness({owner:true},connections).channels.find(x=>x.provider==='facebook');
 assert.deepEqual(owner.steps.map(x=>x.complete),[true,true,true]);
});

test('Facebook studio opens only with an explicit server rollout grant and the customers own Page',()=>{
 const allowance={owner:false,plan:'starter',limit:3,remaining:2,canPublish:true};
 const get=c=>publishingReadiness(allowance,{facebook:c}).channels.find(x=>x.provider==='facebook');
 assert.equal(get({connected:true,pageSelected:true,publishingEnabled:true}).ready,true);
 assert.equal(get({connected:true,pageSelected:true,publishingEnabled:true}).studio,'/facebook');
 assert.equal(get({connected:true,pageSelected:false,publishingEnabled:true}).ready,false);
 assert.equal(get({connected:true,pageSelected:true}).ready,false);
});
