import test from 'node:test';import assert from 'node:assert/strict';
import {FACEBOOK_PILOT_OWNER,requireFacebookOwner,facebookTestMetadata,selectedFacebookPage,facebookCall,uploadFacebookTest,describeFacebookVideo} from '../lib/facebook-upload.mjs';
const draft={title:'A Beautiful Life',caption:'Owner pilot'},body={mode:'unpublished',confirmed:true,rightsConfirmed:true};
test('Facebook pilot denies subscribers and rejects all public or scheduled requests',()=>{
 assert.doesNotThrow(()=>requireFacebookOwner({id:FACEBOOK_PILOT_OWNER}));assert.throws(()=>requireFacebookOwner({id:'someone-else'}));
 for(const mode of ['public','scheduled',undefined])assert.throws(()=>facebookTestMetadata(draft,{...body,mode}));
 assert.throws(()=>facebookTestMetadata(draft,{...body,rightsConfirmed:false}));assert.throws(()=>facebookTestMetadata(draft,{...body,confirmed:false}));
 assert.equal(facebookTestMetadata(draft,body).published,'false');
});
test('Page selection must resolve to a saved Page with a token',()=>{
 assert.throws(()=>selectedFacebookPage({selectedPage:{id:'99'},pages:[{id:'88',access_token:'secret'}]}));
 assert.throws(()=>selectedFacebookPage({selectedPage:{id:'99'},pages:[{id:'99'}]}));
 assert.equal(selectedFacebookPage({selectedPage:{id:'99'},pages:[{id:'99',access_token:'secret'}]}).id,'99');
});
test('Facebook requests keep credentials out of URLs and only use fixed Graph destinations',async()=>{
 let captured;const call=facebookCall({access_token:'private-token'},{FACEBOOK_API_VERSION:'v26.0',FACEBOOK_APP_SECRET:'private-secret'},async(url,options)=>{captured={url,options};return {ok:true,json:async()=>({id:'99'})};});
 await call('/99',{query:{fields:'id,name'}});assert.equal(new URL(captured.url).hostname,'graph.facebook.com');assert.equal(captured.url.includes('private-token'),false);assert.equal(captured.url.includes('private-secret'),false);assert.equal(captured.options.headers.Authorization,'Bearer private-token');
 await assert.rejects(call('https://evil.example/99'));await assert.rejects(call('/99/../../other'));
});
test('test submission forces unpublished metadata and never repeats an uncertain write',async()=>{
 let n=0;await assert.rejects(uploadFacebookTest(async()=>{n++;throw Error('timeout');},'99','https://media.example/video.mp4',facebookTestMetadata(draft,body)));assert.equal(n,1);
 let sent;assert.equal(await uploadFacebookTest(async(path,options)=>{sent=options.body;return {id:'123'};},'99','https://media.example/video.mp4',facebookTestMetadata(draft,body)),'123');assert.equal(sent.published,'false');assert.equal('scheduled_publish_time' in sent,false);
 await assert.rejects(uploadFacebookTest(async()=>{},'99','url',{published:'true'}));
});
test('acceptance, processing and unpublished verification remain separate and Page-bound',()=>{
 const v={id:'123',from:{id:'99'},status:{video_status:'processing'},published:false};
 const o=describeFacebookVideo(v,'99');assert.equal(o.verified,true);assert.equal(o.processed,false);
 assert.equal(describeFacebookVideo({...v,status:{video_status:'ready'}},'99').processed,true);
 assert.equal(describeFacebookVideo({...v,published:true},'99').verified,false);
 assert.equal(describeFacebookVideo({...v,status:{video_status:'error'}},'99').failed,true);
 assert.equal(describeFacebookVideo({...v,published:undefined},'99').verified,false);
 assert.throws(()=>describeFacebookVideo(v,'88'));
});
