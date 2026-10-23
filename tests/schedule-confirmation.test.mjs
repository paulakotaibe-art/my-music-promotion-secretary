import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleAndConfirm} from '../lib/schedule-confirmation.mjs';
const post={publicationDate:{dateTime:'2026-10-26T12:00:00',timezone:'UTC'},providers:['youtube','facebook','tiktok'].map(network=>({network}))};
const saved={...post,id:2,uuid:'stable',draft:false,autoPublish:true};
function fixture(rows,{readError=false,writeError=false}={}) {
 const calls=[];
 return {calls,call:async(op,args)=>{
  calls.push({op,args});
  if(op==='createscheduledpost')return writeError ? {isError:true} : {structuredContent:{id:1,plannerUrl:'https://app.metricool.com/planner/calendar?openWithPostUuid=stable'}};
  if(readError)throw Error('timeout');
  return {structuredContent:{data:rows}};
 }};
}
test('confirms every selected network and UTC time using stable UUID after numeric ID changes',async()=>{
 const f=fixture([saved]);const r=await scheduleAndConfirm(f.call,'brand',post);
 assert.equal(r.status,'accepted');assert.equal(r.providerId,2);assert.deepEqual(r.confirmedPlatforms,['youtube','facebook','tiktok']);
 assert.equal(f.calls[1].args.timezone,'UTC');assert.equal(f.calls.filter(c=>c.op==='createscheduledpost').length,1);
});
test('missing YouTube, shifted time, failed network and draft each prevent full queue confirmation',async()=>{
 for(const changed of [{providers:saved.providers.slice(1)},{publicationDate:{dateTime:'2026-10-26T13:00:00',timezone:'UTC'}},{providers:[{network:'youtube',status:'ERROR'},...saved.providers.slice(1)]},{draft:true},{autoPublish:false}]) {
  const f=fixture([{...saved,...changed}]);const r=await scheduleAndConfirm(f.call,'brand',post);
  assert.equal(r.status,'unknown');assert.match(r.message,/discrepancy/);assert.equal(f.calls.filter(c=>c.op==='createscheduledpost').length,1);
 }
});
test('missing record, unrelated record and read failure remain reserved without a repeated write',async()=>{
 for(const f of [fixture([]),fixture([{...saved,uuid:'other'}]),fixture([],{readError:true})]) {
  assert.equal((await scheduleAndConfirm(f.call,'brand',post)).status,'unknown');assert.equal(f.calls.filter(c=>c.op==='createscheduledpost').length,1);
 }
});
test('explicit rejection remains distinct from ambiguous readback',async()=>{
 const f=fixture([],{writeError:true});assert.equal((await scheduleAndConfirm(f.call,'brand',post)).status,'rejected');assert.equal(f.calls.length,1);
});
