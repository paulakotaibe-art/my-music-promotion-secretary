import test from 'node:test';import assert from 'node:assert/strict';
import {facebookAccess} from '../lib/facebook-access.mjs';
test('Facebook mutations fail closed without a verified server rollout grant',async()=>{
 const auth=result=>({client:{rpc:async name=>{assert.equal(name,'facebook_publishing_access');return result;}}});
 await assert.rejects(facebookAccess(auth({error:{},data:null}),true),/could not be checked/);
 await assert.rejects(facebookAccess(auth({data:{enabled:false,reason:'Awaiting approval'}}),true),/Awaiting approval/);
 assert.equal((await facebookAccess(auth({data:{enabled:false}}))).enabled,false);
 assert.equal((await facebookAccess(auth({data:{enabled:true,owner:false}}),true)).enabled,true);
});
