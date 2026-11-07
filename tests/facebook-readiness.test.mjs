import test from 'node:test';
import assert from 'node:assert/strict';
import {facebookReadinessAccess} from '../lib/facebook-readiness.mjs';
test('isolated sandbox status does not require Facebook database integration',async()=>{
 const auth={client:{rpc(){throw Error('Facebook must remain unavailable in sandbox');}}};
 assert.deepEqual(await facebookReadinessAccess(auth,true),{data:{enabled:false},error:null});
});
test('production readiness preserves the authoritative Facebook grant and failures',async()=>{
 for(const result of [{data:{enabled:true},error:null},{data:null,error:{code:'missing'}}]){
 let calls=0;const auth={client:{rpc(name){assert.equal(name,'facebook_publishing_access');calls++;return Promise.resolve(result);}}};
 assert.equal(await facebookReadinessAccess(auth),result);assert.equal(calls,1);
 }
});
