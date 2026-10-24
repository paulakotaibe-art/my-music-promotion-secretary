import test from 'node:test';import assert from 'node:assert/strict';
import {exchangeSocial} from '../lib/social-oauth.mjs';
test('provider failures retain numeric diagnostics without sensitive response text',async()=>{
 const env={FACEBOOK_APP_ID:'fb',FACEBOOK_APP_SECRET:'secret',FACEBOOK_API_VERSION:'v26.0',FACEBOOK_LOGIN_CONFIG_ID:'123456'};
 await assert.rejects(exchangeSocial('facebook','code',async()=>({ok:false,status:400,json:async()=>({error:{code:190,message:'secret-token'}})}),env),e=>e.message==='Platform request failed'&&e.httpStatus===400&&e.providerCode===190&&!JSON.stringify(e).includes('secret-token'));
});
