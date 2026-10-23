import test from 'node:test';import assert from 'node:assert/strict';
import {socialAuthorization,checkSocialState,exchangeSocial,socialConfig,SOCIAL_SCOPES} from '../lib/social-oauth.mjs';
const env={FACEBOOK_APP_ID:'fb',FACEBOOK_APP_SECRET:'secret',FACEBOOK_API_VERSION:'v26.0',TIKTOK_CLIENT_KEY:'tt',TIKTOK_CLIENT_SECRET:'secret'};
test('platform consent uses fixed destinations, scopes and user-bound unpredictable state',()=>{
 for(const p of ['facebook','tiktok']){
 const a=socialAuthorization(p,'a','session',env),b=socialAuthorization(p,'b','other',env),u=new URL(a.url);
 assert.equal(u.origin,p==='facebook'?'https://www.facebook.com':'https://www.tiktok.com');assert.equal(u.searchParams.has('client_secret'),false);
 assert.equal(u.searchParams.get('redirect_uri'),'https://my-music-promotion-secretary-x96x.vercel.app/api/integrations/social/'+p+'/callback');
 assert.notEqual(a.state.state,b.state.state);assert.doesNotThrow(()=>checkSocialState(a.state,a.state.state,p,{id:'a'}));
 assert.throws(()=>checkSocialState(a.state,a.state.state,p,{id:'b'}));assert.throws(()=>checkSocialState(a.state,'wrong',p));
 assert.throws(()=>checkSocialState(a.state,a.state.state,p==='facebook'?'tiktok':'facebook'));
 }
 assert.throws(()=>socialConfig('facebook',{...env,FACEBOOK_API_VERSION:'v26x0'}));assert.throws(()=>socialConfig('other',env));
});
test('TikTok requires both scopes and verifies returned account identity',async()=>{
 const token={access_token:'a',refresh_token:'r',open_id:'tt',expires_in:3600,scope:SOCIAL_SCOPES.tiktok.join(',')};
 const req=async u=>({ok:true,json:async()=>u.includes('/token/')?token:{data:{user:{open_id:'tt',display_name:'Artist'}},error:{code:'ok'}}});
 assert.equal((await exchangeSocial('tiktok','code',req,env)).accountId,'tt');
 await assert.rejects(exchangeSocial('tiktok','code',async()=>({ok:true,json:async()=>({...token,scope:'user.info.basic'})}),env));
 await assert.rejects(exchangeSocial('tiktok','code',async u=>({ok:true,json:async()=>u.includes('/token/')?token:{data:{user:{open_id:'wrong'}}}}),env));
});
test('Facebook requires granted permissions and a Page with a content task',async()=>{
 const req=async u=>({ok:true,json:async()=>u.includes('/oauth/')?{access_token:'fb'}:u.includes('/permissions')?{data:SOCIAL_SCOPES.facebook.map(permission=>({permission,status:'granted'}))}:u.includes('/accounts')?{data:[{id:'page',name:'Music',access_token:'page-token',tasks:['CREATE_CONTENT']},{id:'no-access',access_token:'x',tasks:['ANALYZE']}]}:{id:'user',name:'Artist'}});
 const r=await exchangeSocial('facebook','code',req,env);assert.equal(r.pages.length,1);assert.equal(r.pages[0].id,'page');
 await assert.rejects(exchangeSocial('facebook','code',async u=>({ok:true,json:async()=>u.includes('/oauth/')?{access_token:'fb'}:{data:[]}}),env));
});
