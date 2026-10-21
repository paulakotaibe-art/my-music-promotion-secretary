import test from "node:test";
import assert from "node:assert/strict";
import {checkPublishingConnection} from "../lib/metricool.mjs";
const env={METRICOOL_API_TOKEN:"private-test-token",METRICOOL_USER_ID:"123",METRICOOL_BRAND_ID:"456",METRICOOL_PILOT_USER_ID:"owner"};
test("missing setup makes no provider request",async()=>{
  const result=await checkPublishingConnection("owner",{},()=>{throw new Error("must not call");});
  assert.equal(result.state,"setup_required");
});
test("another subscriber cannot use the owner's brand",async()=>{
  let calls=0;
  const result=await checkPublishingConnection("subscriber",env,()=>{calls++;});
  assert.equal(result.state,"not_linked"); assert.equal(calls,0);
});
test("only the bound brand and three platforms are returned; credentials stay private",async()=>{
  const result=await checkPublishingConnection("owner",env,async(url,options)=>{
    assert.equal(url.searchParams.get("blogId"),"456");
    assert.equal(options.headers["X-Mc-Auth"],env.METRICOOL_API_TOKEN);
    assert.equal(options.redirect,"error");
    return {ok:true,json:async()=>[{id:999,networksData:{youtubeData:"other"}},{id:456,networksData:{youtubeData:"channel",facebookData:"page",tiktokData:"account",instagramData:"excluded"}}]};
  });
  assert.equal(result.state,"connected"); assert.equal(result.networks.length,3);
  assert.ok(result.networks.every(n=>n.connected));
  assert.ok(!JSON.stringify(result).includes(env.METRICOOL_API_TOKEN));
});
test("provider failures do not leak their raw response",async()=>{
  const denied=await checkPublishingConnection("owner",env,async()=>({ok:false,status:403}));
  assert.equal(denied.state,"connection_error");
  const failed=await checkPublishingConnection("owner",env,async()=>{throw new Error("secret upstream error");});
  assert.ok(!JSON.stringify(failed).includes("secret upstream"));
});
