import test from 'node:test';
import assert from 'node:assert/strict';
import {youtubeAuthorization,checkYouTubeState,checkYouTubeUser,exchangeYouTube,YOUTUBE_CALLBACK,YOUTUBE_SCOPES} from '../lib/youtube-oauth.mjs';
const env={YOUTUBE_CLIENT_ID:'client',YOUTUBE_CLIENT_SECRET:'secret'};
test('YouTube consent binds app user and fixed callback without exposing a client secret',()=>{
 const a=youtubeAuthorization('user','session',env),b=youtubeAuthorization('user','session',env),url=new URL(a.url);
 assert.equal(url.searchParams.get('redirect_uri'),YOUTUBE_CALLBACK);assert.equal(url.searchParams.get('access_type'),'offline');
 assert.equal(url.searchParams.get('scope'),YOUTUBE_SCOPES.join(' '));assert.equal(url.searchParams.has('client_secret'),false);assert.notEqual(a.state.state,b.state.state);
 assert.doesNotThrow(()=>checkYouTubeState(a.state,url.searchParams.get('state')));
 assert.throws(()=>checkYouTubeState(a.state,'wrong'));assert.throws(()=>checkYouTubeState({...a.state,expires:0},a.state.state));assert.throws(()=>checkYouTubeState({...a.state,provider:'other'},a.state.state));
 assert.throws(()=>youtubeAuthorization('user','session',{}));
});
test('YouTube exchange verifies scopes, offline token and channel before returning a connection',async()=>{
 const calls=[];const token={access_token:'access',refresh_token:'refresh',token_type:'Bearer',expires_in:3600,scope:YOUTUBE_SCOPES.join(' ')};
 const request=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>calls.length===1?token:{items:[{id:'channel',snippet:{title:'My music'}}]}};};
 const r=await exchangeYouTube('code',request,env);assert.equal(r.channelId,'channel');assert.equal(r.channelTitle,'My music');assert.ok(r.tokens.expires_at>Date.now());assert.equal(calls.length,2);
 assert.equal(calls[0].options.body.get('client_secret'),'secret');assert.equal(calls[1].options.headers.Authorization,'Bearer access');
 for(const override of [{scope:YOUTUBE_SCOPES[0]},{refresh_token:null},{expires_in:0}])await assert.rejects(exchangeYouTube('code',async()=>({ok:true,json:async()=>({...token,...override})}),env));
 await assert.rejects(exchangeYouTube('code',async()=>({ok:false}),env));
});

test('connection callback rejects a different app account and allows ordinary authenticated accounts',()=>{
 assert.doesNotThrow(()=>checkYouTubeUser({userId:'subscriber-a'},{id:'subscriber-a'}));
 assert.throws(()=>checkYouTubeUser({userId:'subscriber-a'},{id:'subscriber-b'}));
 assert.throws(()=>checkYouTubeUser({userId:'subscriber-a'},null));
 assert.throws(()=>checkYouTubeUser({},{}));
});
