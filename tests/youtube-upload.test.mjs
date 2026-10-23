import test from 'node:test';
import assert from 'node:assert/strict';
import {videoMetadata,freshYouTubeToken,readVideo,safeUploadLocation,describeVideo,uploadOnce} from '../lib/youtube-upload.mjs';
const now=Date.parse('2026-10-23T10:00:00Z'),draft={title:'Original music',caption:'My original song'},options={mode:'private',madeForKids:false,syntheticMedia:false,rightsConfirmed:true};
test('private tests never include public scheduling; public and future scheduled metadata are explicit',()=>{
 const p=videoMetadata(draft,options,now);assert.equal(p.status.privacyStatus,'private');assert.ok(!('publishAt' in p.status));
 assert.equal(videoMetadata(draft,{...options,mode:'public'},now).status.privacyStatus,'public');
 const s=videoMetadata(draft,{...options,mode:'scheduled',publishAt:'2026-10-26T12:00:00+00:00'},now);assert.equal(s.status.privacyStatus,'private');assert.equal(s.status.publishAt,'2026-10-26T12:00:00.000Z');
 for(const o of [{...options,rightsConfirmed:false},{...options,madeForKids:undefined},{...options,syntheticMedia:undefined},{...options,mode:'scheduled',publishAt:'2026-10-23T10:01:00Z'},{...options,mode:'scheduled',publishAt:'2026-10-26T12:00:00'}])assert.throws(()=>videoMetadata(draft,o,now));
});
test('refresh preserves offline token and avoids sending credentials when access is still valid',async()=>{
 const original={access_token:'old',refresh_token:'offline',expires_at:0};let calls=0;
 const result=await freshYouTubeToken(original,async()=>{calls++;return {ok:true,json:async()=>({access_token:'new',expires_in:3600})};},{YOUTUBE_CLIENT_ID:'id',YOUTUBE_CLIENT_SECRET:'secret'});
 assert.equal(result.refresh_token,'offline');assert.equal(result.access_token,'new');
 assert.equal(await freshYouTubeToken(result,()=>{throw Error('must not call');}),result);assert.equal(calls,1);
 await assert.rejects(freshYouTubeToken(original,async()=>({ok:false}),{YOUTUBE_CLIENT_ID:'id',YOUTUBE_CLIENT_SECRET:'secret'}));
});
test('media body is bounded and must carry an MP4 file signature',async()=>{
 const good=Buffer.from([0,0,0,20,102,116,121,112,0,0,0,0]);assert.deepEqual(await readVideo(new Response(good)),good);
 await assert.rejects(readVideo(new Response('not a video')));
 await assert.rejects(readVideo(new Response(good,{headers:{'content-length':String(51*1024*1024)}})));
});
test('upload only uses the exact Google session host and never repeats a write after uncertainty',async()=>{
 assert.equal(safeUploadLocation('https://www.googleapis.com.evil.test/upload/youtube/v3/videos'),null);
 assert.equal(safeUploadLocation('http://www.googleapis.com/upload/youtube/v3/videos'),null);
 let writes=0;const call=async(url,options)=>{writes++;if(options.method==='POST')return {ok:true,headers:new Headers({location:'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=fixture'})};throw Error('timeout after acceptance');};
 await assert.rejects(uploadOnce(call,Buffer.from('video'),videoMetadata(draft,options,now)));assert.equal(writes,2);
});
test('receipt checks channel, private visibility, processing, failures and exact schedule',()=>{
 const v={id:'abcdefghijk',snippet:{channelId:'channel'},status:{privacyStatus:'private',uploadStatus:'processed'}};
 const r=describeVideo(v,'channel',{privacyStatus:'private'});assert.ok(r.verified && r.processed);
 assert.throws(()=>describeVideo(v,'different',{privacyStatus:'private'}));
 assert.equal(describeVideo(v,'channel',{privacyStatus:'public'}).verified,false);
 assert.equal(describeVideo({...v,status:{...v.status,uploadStatus:'rejected'}},'channel',{privacyStatus:'private'}).verified,false);
 assert.equal(describeVideo(v,'channel',{privacyStatus:'private',publishAt:'2026-10-26T12:00:00Z'}).verified,false);
});
