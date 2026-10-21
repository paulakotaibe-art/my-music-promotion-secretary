import test from "node:test";
import assert from "node:assert/strict";
import {buildPost,signResult,verifyResult,safePlannerUrl} from "../lib/scheduling.mjs";
import {withMetricool} from "../lib/metricool-oauth.mjs";
const now=Date.parse("2026-10-21T10:00:00Z");
const draft={title:"A Beautiful Life",caption:"Listen and enjoy.",platforms:["youtube","facebook","tiktok"],media_url:"https://media.example.com/song.mp4",planned_at:"2026-10-22T09:00:00Z"};
const options={madeForKids:false,tiktokPrivacy:"PUBLIC_TO_EVERYONE",rightsConfirmed:true};
test("builds an explicit three-platform UTC video schedule",()=>{
 const post=buildPost(draft,options,now);
 assert.equal(post.draft,false);assert.equal(post.autoPublish,true);
 assert.deepEqual(post.providers.map(p=>p.network),draft.platforms);
 assert.equal(post.publicationDate.timezone,"UTC");
 assert.equal(post.youtubeData.madeForKids,false);assert.equal(post.youtubeData.privacy,"public");
 assert.deepEqual(post.media,[draft.media_url]);
});
test("rejects missing audience, private branded TikTok, watch links, unknown networks and past dates",()=>{
 for(const [d,o] of [[draft,{...options,madeForKids:undefined}],[draft,{...options,thirdParty:true,tiktokPrivacy:"SELF_ONLY"}],[{...draft,media_url:"https://youtube.com/watch?v=123"},options],[{...draft,platforms:["instagram"]},options],[{...draft,planned_at:"2026-10-21T10:02:00Z"},options],[draft,{...options,rightsConfirmed:false}]]) assert.throws(()=>buildPost(d,o,now));
});
test("signed evidence survives JSONB key ordering but rejects tampering",()=>{
 const data={id:"a",status:"accepted",detail:{b:2,a:1}},key="private";
 const signature=signResult(data,key);
 assert.ok(verifyResult({detail:{a:1,b:2},status:"accepted",id:"a"},signature,key));
 assert.equal(verifyResult({...data,status:"published"},signature,key),false);
 assert.equal(safePlannerUrl("https://evil.example/post"),null);
});
test("an uncertain provider write is attempted once, without retry",async()=>{
 let writes=0;
 const request=async(url,options)=>{
  const body=JSON.parse(options.body);
  if(body.method==="tools/call") {writes++;throw new Error("timeout after acceptance");}
  const result=body.method==="tools/list" ? {tools:[{name:"createScheduledPost"}]} : {};
  return {ok:true,headers:new Headers(),text:async()=>JSON.stringify({id:body.id,result})};
 };
 await assert.rejects(withMetricool("test",call=>call("createscheduledpost",{}),request));
 assert.equal(writes,1);
});
