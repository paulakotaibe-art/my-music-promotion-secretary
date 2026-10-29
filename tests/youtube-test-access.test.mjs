import test from 'node:test';
import assert from 'node:assert/strict';
import {youtubeTestPermission,youtubeTestAccess} from '../lib/youtube-test-access.mjs';
test('invited private tests cannot enable public publishing or bypass exhausted allowance',()=>{
 const access={enabled:true,allowance:{owner:false,remaining:3}};
 assert.equal(youtubeTestPermission(true,access,'private'),true);
 for(const mode of ['public','scheduled',undefined])assert.equal(youtubeTestPermission(true,access,mode),false);
 assert.equal(youtubeTestPermission(false,access,'private'),false);
 assert.equal(youtubeTestPermission(true,{...access,enabled:false},'private'),false);
 assert.equal(youtubeTestPermission(true,{enabled:true,allowance:{owner:false,remaining:0}},'private'),false);
 assert.equal(youtubeTestPermission(true,{enabled:true,allowance:{owner:true,remaining:3}},'private'),false);
});
test('production never queries the Sandbox test grant and Sandbox lookup fails closed',async()=>{
 const auth={client:{rpc:async()=>{throw Error('must not query')}}};
 assert.deepEqual(await youtubeTestAccess(auth,{}),{enabled:false});
 await assert.rejects(youtubeTestAccess({client:{rpc:async()=>({error:{message:'unavailable'}})}},{MUSIC_APP_ENV:'sandbox'}),/unavailable/);
});
