import test from 'node:test';
import assert from 'node:assert/strict';
import {accountSession,accountChanged} from '../lib/account-session.mjs';
import {emailReturnDestination} from '../lib/email-return.mjs';

test('session reads distinguish signed out from failed or stalled checks',async()=>{
 assert.equal(await accountSession({getSession:async()=>({data:{session:null}})}),null);
 const session={access_token:'fixture',user:{id:'one'}};
 assert.equal(await accountSession({getSession:async()=>({data:{session}})}),session);
 await assert.rejects(accountSession(null),/temporarily unavailable/);
 await assert.rejects(accountSession({getSession:async()=>({error:Error('private diagnostic')})}),/sign in again/);
 await assert.rejects(accountSession({getSession:()=>new Promise(()=>{})},10),/timed out/);
});

test('sign out and account switches invalidate displayed account data; token refresh does not',()=>{
 assert.equal(accountChanged('SIGNED_OUT',null,'one'),true);
 assert.equal(accountChanged('SIGNED_IN',{user:{id:'two'}},'one'),true);
 for(const event of ['SIGNED_IN','TOKEN_REFRESHED','INITIAL_SESSION'])assert.equal(accountChanged(event,{user:{id:'one'}},'one'),false);
 assert.equal(accountChanged('INITIAL_SESSION',null,null),false);
});

test('a stalled email initialization or verification returns to fresh sign-in without retry',async()=>{
 const url='https://fixture.example/#access_token=fixture';
 let verifies=0;
 assert.equal(await emailReturnDestination({getSession:()=>new Promise(()=>{}),getUser:()=>{verifies++;}},url,10),'/login?notice=link');
 assert.equal(verifies,0);
 assert.equal(await emailReturnDestination({getSession:async()=>({data:{session:{}}}),getUser:()=>new Promise(()=>{})},url,10),'/login?notice=link');
});
