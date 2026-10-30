import test from 'node:test';import assert from 'node:assert/strict';
import {hasEmailReturn,emailReturnDestination} from '../lib/email-return.mjs';
const returned='https://test.example/#access_token=fixture&refresh_token=fixture&type=invite';
test('ordinary home visits do not check or redirect existing sessions',async()=>{
 assert.equal(hasEmailReturn('https://test.example/#about'),false);
 assert.equal(await emailReturnDestination({getSession(){throw Error('Must not run');}},'https://test.example/'),null);
});
test('invitation waits for persisted session initialization before verifying the user',async()=>{
 let release;const events=[];const initialized=new Promise(r=>release=r);
 const result=emailReturnDestination({async getSession(){events.push('initializing');await initialized;return {data:{session:{}}};},async getUser(){events.push('verified');return {data:{user:{id:'test-user'}}};}},returned);
 assert.deepEqual(events,['initializing']);release();assert.equal(await result,'/dashboard');assert.deepEqual(events,['initializing','verified']);
});
test('missing or unverified sessions never enter the dashboard',async()=>{
 for(const auth of [null,{getSession:async()=>({data:{session:null}})},{getSession:async()=>({data:{session:{}}}),getUser:async()=>({data:{user:null},error:Error('invalid')})},{getSession:async()=>{throw Error('offline');}}])assert.equal(await emailReturnDestination(auth,returned),'/login?notice=link');
});
test('expired email links return to a fresh sign-in without using a stale session',async()=>{
 assert.equal(await emailReturnDestination({getSession(){throw Error('Must not run');}},'https://test.example/#error=access_denied&error_description=expired'),'/login?notice=link');
});
