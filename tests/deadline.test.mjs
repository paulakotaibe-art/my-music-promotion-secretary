import test from "node:test";
import assert from "node:assert/strict";
import {withDeadline} from "../lib/deadline.mjs";
import {withMetricool} from "../lib/metricool-oauth.mjs";
test("a stalled operation releases its caller and aborts without retry",async()=>{
 let started=0,aborted=0;
 await assert.rejects(withDeadline(()=>{started++;return new Promise(()=>{});},15,"Preparation timed out",()=>aborted++),/Preparation timed out/);
 assert.equal(started,1);assert.equal(aborted,1);
 assert.equal(await withDeadline(()=>Promise.resolve("ready"),100,"timeout"),"ready");
});
test("provider handshake has one total budget rather than a new budget per request",async()=>{
 let requests=0;
 const request=async(url,options)=>{requests++;return new Promise((resolve,reject)=>{
   if(options.signal.aborted){reject(new Error("aborted"));return;}
   options.signal.addEventListener("abort",()=>reject(new Error("aborted")),{once:true});
 });};
 const keepAlive=setInterval(()=>{},10);
 try{await assert.rejects(withMetricool("test",()=>{},request,{timeoutMs:15}),/aborted/);assert.equal(requests,1);}
 finally{clearInterval(keepAlive);}
});
