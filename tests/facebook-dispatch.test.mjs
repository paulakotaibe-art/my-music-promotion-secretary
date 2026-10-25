import test from 'node:test';import assert from 'node:assert/strict';
import {validDispatchReceipt,dispatchFacebookVideo} from '../lib/facebook-dispatch.mjs';
import {FACEBOOK_PILOT_OWNER} from '../lib/facebook-upload.mjs';
const at=Date.parse('2026-10-25T12:00:00Z'),row={id:'r',user_id:FACEBOOK_PILOT_OWNER,upload_id:'u',page_id:'99',video_id:'123',strategy:'app',publish_at:new Date(at).toISOString()};
row.outcome={id:'r',userId:row.user_id,uploadId:'u',pageId:'99',videoId:'123',mode:'scheduled',publishAt:row.publish_at};row.outcome_signature='signed';
const v={id:'123',from:{id:'99'},status:{video_status:'ready'},published:false};
test('worker requires an authenticated receipt bound to owner, video, Page and time',()=>{
 assert.equal(validDispatchReceipt(row,()=>true),true);assert.equal(validDispatchReceipt(row,()=>false),false);
 for(const changed of [{strategy:'meta'},{user_id:'other'},{video_id:'124'},{page_id:'88'},{publish_at:'2026-10-25T13:00:00Z'}])assert.equal(validDispatchReceipt({...row,...changed},()=>true),false);
});
test('worker never publishes before due or after its safe dispatch window',async()=>{
 let calls=0;for(const now of [at-1,at+600000])await assert.rejects(dispatchFacebookVideo(async()=>{calls++;},row,now));assert.equal(calls,0);
});
test('due dispatch publishes the existing video once and checks actual publication',async()=>{
 const calls=[];let published=false;const out=await dispatchFacebookVideo(async(path,options)=>{calls.push({path,options});if(options.body){published=true;return {success:true};}return {...v,published};},row,at+1000);
 assert.equal(calls.length,3);assert.equal(calls[1].path,'/123');assert.deepEqual(calls[1].options.body,{published:'true'});assert.equal(out.state,'published');assert.equal(out.verified,true);
});
test('already-public video is only read, never republished',async()=>{let calls=0;const o=await dispatchFacebookVideo(async()=>{calls++;return {...v,published:true};},row,at);assert.equal(calls,1);assert.equal(o.alreadyPublished,true);});
test('uncertain external write is not retried and records the uncertain stage',async()=>{
 let writes=0;await assert.rejects(dispatchFacebookVideo(async(path,options)=>{if(options.body){writes++;throw Error('timeout');}return v;},row,at),e=>e.writeAttempted===true&&e.requestAcknowledged===false);assert.equal(writes,1);
});
test('wrong Page, native schedule and unfinished processing all block publication',async()=>{
 for(const changed of [{from:{id:'88'}},{scheduled_publish_time:at/1000+3600},{status:{video_status:'processing'}}]){let writes=0;await assert.rejects(dispatchFacebookVideo(async(path,options)=>{if(options.body)writes++;return {...v,...changed};},row,at));assert.equal(writes,0);}
});

test('subscriber dispatch needs both a signed subscriber receipt and a database authorization grant',()=>{
 const customer={...row,user_id:'customer',outcome:{...row.outcome,userId:'customer',subscriber:true}};
 assert.equal(validDispatchReceipt(customer,()=>true),false);
 assert.equal(validDispatchReceipt(customer,()=>true,true),true);
 assert.equal(validDispatchReceipt(customer,()=>false,true),false);
 assert.equal(validDispatchReceipt({...customer,outcome:{...customer.outcome,subscriber:false}},()=>true,true),false);
});
