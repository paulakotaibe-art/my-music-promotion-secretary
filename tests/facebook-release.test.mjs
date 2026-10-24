import test from 'node:test';import assert from 'node:assert/strict';
import {facebookReleaseRequest,assertFacebookReleaseReady,releaseFacebookOnce,describeFacebookRelease,facebookReceiptMessage} from '../lib/facebook-release.mjs';
const now=Date.parse('2026-10-24T22:00:00Z'),confirmation={confirmed:true,rightsConfirmed:true};
const video={id:'123',from:{id:'99'},status:{video_status:'ready'},published:false};
test('public release is explicit, never sends a file or a schedule',()=>{assert.deepEqual(facebookReleaseRequest({...confirmation,mode:'public'},now),{mode:'public',publishAt:null,params:{published:'true'}});for(const b of [{mode:'public'},{...confirmation,mode:'private'},{...confirmation,mode:'scheduled',publishAt:'2026-10-25T12:00:00'}])assert.throws(()=>facebookReleaseRequest(b,now));});
test('schedule validates range, converts explicit timezone and handles the UK clock change',()=>{
 const r=facebookReleaseRequest({...confirmation,mode:'scheduled',publishAt:'2026-10-25T01:30:00+01:00'},now);assert.equal(r.publishAt,'2026-10-25T00:30:00.000Z');assert.equal(r.params.published,'false');assert.equal(Number(r.params.scheduled_publish_time),Date.parse(r.publishAt)/1000);
 const later=facebookReleaseRequest({...confirmation,mode:'scheduled',publishAt:'2026-10-25T01:30:00+00:00'},now);assert.equal(Date.parse(later.publishAt)-Date.parse(r.publishAt),3600000);
 for(const publishAt of ['invalid','2026-10-24T22:09:59Z','2026-11-23T12:00:00Z'])assert.throws(()=>facebookReleaseRequest({...confirmation,mode:'scheduled',publishAt},now));
});
test('only a processed, unpublished, unscheduled video from the bound Page can release',()=>{
 assert.doesNotThrow(()=>assertFacebookReleaseReady(video,'99','123'));
 for(const changed of [{published:true},{status:{video_status:'processing'}},{scheduled_publish_time:1792920000},{from:{id:'88'}}])assert.throws(()=>assertFacebookReleaseReady({...video,...changed},'99','123'));
 assert.throws(()=>assertFacebookReleaseReady(video,'99','124'));
});
test('release updates the existing video once and never automatically retries',async()=>{
 let calls=0,target,params;const r=facebookReleaseRequest({...confirmation,mode:'public'},now);
 await releaseFacebookOnce(async(path,o)=>{calls++;target=path;params=o.body;return {success:true};},'123',r);assert.equal(calls,1);assert.equal(target,'/123');assert.deepEqual(params,{published:'true'});
 calls=0;await assert.rejects(releaseFacebookOnce(async()=>{calls++;throw Error('timeout');},'123',r));assert.equal(calls,1);
});
test('scheduled acknowledgement is not final publication and overdue unpublished is not success',()=>{
 const expected={mode:'scheduled',publishAt:'2026-10-25T12:00:00.000Z'},t=Date.parse(expected.publishAt);
 let d=describeFacebookRelease({...video,scheduled_publish_time:t/1000},'99',expected,now);assert.equal(d.state,'scheduled');assert.equal(d.verified,true);
 d=describeFacebookRelease({...video,scheduled_publish_time:t/1000},'99',expected,t+1000);assert.equal(d.state,'awaiting_publication');assert.equal(d.verified,false);
 d=describeFacebookRelease({...video,published:true},'99',expected,t+1000);assert.equal(d.state,'published');assert.equal(d.verified,true);
 d=describeFacebookRelease({...video,published:true},'99',expected,now);assert.equal(d.state,'published_early');assert.equal(d.verified,false);
});
test('schedule mismatch and unprocessed publication remain unconfirmed',()=>{
 const expected={mode:'scheduled',publishAt:'2026-10-25T12:00:00.000Z'};
 assert.equal(describeFacebookRelease({...video,scheduled_publish_time:1},'99',expected,now).verified,false);
 assert.equal(describeFacebookRelease({...video,published:true,status:{video_status:'processing'}},'99',{mode:'public'},now).verified,false);
 assert.equal(describeFacebookRelease({...video,status:{video_status:'error'}},'99',{mode:'public'},now).state,'failed');
});
test('receipt messages reflect completed status and distinguish stale checks',()=>{
 assert.match(facebookReceiptMessage({processed:true,verified:true}),/processed and unpublished/);
 assert.match(facebookReceiptMessage({state:'scheduled',verified:true}),/Final publication will be checked separately/);
 assert.match(facebookReceiptMessage({state:'published',verified:true}),/processed and published/);
 assert.match(facebookReceiptMessage({state:'published',verified:true},false),/could not be checked/);
});
