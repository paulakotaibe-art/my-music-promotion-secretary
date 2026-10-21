import test from "node:test";
import assert from "node:assert/strict";
import {seal,unseal,createAuthorization,validateState,inspectAccounts,parseRpc,CALLBACK} from "../lib/metricool-oauth.mjs";
const key="a".repeat(64);
test("token encryption authenticates ciphertext and uses random IVs",()=>{
  const a=seal({access_token:"secret"},key),b=seal({access_token:"secret"},key);
  assert.notEqual(a,b);assert.deepEqual(unseal(a,key),{access_token:"secret"});
  assert.throws(()=>unseal(a,"b".repeat(64)));
  const bytes=Buffer.from(a,"base64url");bytes[bytes.length-1]^=1;
  assert.throws(()=>unseal(bytes.toString("base64url"),key));
});
test("authorization binds callback, PKCE and expiring state",()=>{
  const result=createAuthorization("owner","session","client");const url=new URL(result.url);
  assert.equal(url.searchParams.get("redirect_uri"),CALLBACK);
  assert.equal(url.searchParams.get("code_challenge_method"),"S256");
  assert.ok(!result.url.includes("session"));
  validateState(result.state,url.searchParams.get("state"));
  assert.throws(()=>validateState(result.state,"wrong"));
  assert.throws(()=>validateState({...result.state,expires:0},result.state.state));
});
test("MCP parser accepts SSE and rejects protocol errors",()=>{
  assert.deepEqual(parseRpc('data: {"id":1,"result":{"ok":true}}\n\n'),{ok:true});
  assert.throws(()=>parseRpc('{"id":1,"error":{"message":"private details"}}'));
});
test("verification only calls account tool and returns three networks",async()=>{
  const calls=[];
  const request=async(url,options)=>{
    const body=JSON.parse(options.body);calls.push(body);
    const result=body.method==="tools/list" ? {tools:[{name:"getBrandSettings"},{name:"createScheduledPost"}]} : body.method==="tools/call" ? {content:[{type:"text",text:JSON.stringify({data:[{id:1,label:"My brand",networksData:{youtubeData:"yes",facebookData:"yes",tiktokData:"yes"}}]})}]} : {};
    return {ok:true,headers:new Headers(),text:async()=>JSON.stringify({jsonrpc:"2.0",id:body.id,result})};
  };
  const result=await inspectAccounts("private",request);
  assert.equal(result[0].networks.length,3);
  assert.ok(result[0].networks.every(n=>n.connected));
  assert.deepEqual(calls.filter(c=>c.method==="tools/call").map(c=>c.params.name),["getBrandSettings"]);
});
