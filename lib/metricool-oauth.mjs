import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const APP_ORIGIN = "https://my-music-promotion-secretary-x96x.vercel.app";
export const CALLBACK = `${APP_ORIGIN}/api/integrations/metricool/callback`;
export const COOKIE = "__Host-music-metricool";
export const cookieOptions = {httpOnly:true, secure:true, sameSite:"lax", path:"/", maxAge:600};
export function seal(value, key=process.env.METRICOOL_OAUTH_ENCRYPTION_KEY) {
  if (!/^[a-f0-9]{64}$/i.test(key || "")) throw new Error("OAuth encryption is not configured");
  const iv=randomBytes(12), cipher=createCipheriv("aes-256-gcm",Buffer.from(key,"hex"),iv);
  const data=Buffer.concat([cipher.update(JSON.stringify(value),"utf8"),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),data]).toString("base64url");
}
export function unseal(value,key=process.env.METRICOOL_OAUTH_ENCRYPTION_KEY) {
  if (!/^[a-f0-9]{64}$/i.test(key || "")) throw new Error("OAuth encryption is not configured");
  const buffer=Buffer.from(value,"base64url");
  const decipher=createDecipheriv("aes-256-gcm",Buffer.from(key,"hex"),buffer.subarray(0,12));
  decipher.setAuthTag(buffer.subarray(12,28));
  return JSON.parse(Buffer.concat([decipher.update(buffer.subarray(28)),decipher.final()]).toString("utf8"));
}
export function createAuthorization(userId,accessToken,clientId=process.env.METRICOOL_OAUTH_CLIENT_ID) {
  if (!clientId) throw new Error("OAuth client is not configured");
  const verifier=randomBytes(32).toString("base64url"), state=randomBytes(32).toString("base64url");
  const url=new URL("https://app.metricool.com/oauth/authorize");
  Object.entries({client_id:clientId,redirect_uri:CALLBACK,response_type:"code",scope:"mcp:read mcp:write",state,code_challenge:createHash("sha256").update(verifier).digest("base64url"),code_challenge_method:"S256"}).forEach(([key,value])=>url.searchParams.set(key,value));
  return {url:url.href, state:{userId,accessToken,verifier,state,expires:Date.now()+600000}};
}
export function validateState(saved,incoming) {
  const a=Buffer.from(saved.state || ""),b=Buffer.from(incoming || "");
  if (!a.length || a.length!==b.length || !timingSafeEqual(a,b) || saved.expires<Date.now()) throw new Error("Invalid or expired authorization");
}
export async function exchangeCode(code,verifier,request=fetch) {
  const response=await request("https://app.metricool.com/oauth/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"authorization_code",client_id:process.env.METRICOOL_OAUTH_CLIENT_ID,redirect_uri:CALLBACK,code,code_verifier:verifier}),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error("Authorization exchange failed");
  const tokens=await response.json();
  if (!tokens.access_token || typeof tokens.access_token!=="string" || (tokens.token_type && tokens.token_type.toLowerCase()!=="bearer")) throw new Error("Invalid provider response");
  return {...tokens,expires_at:tokens.expires_in ? Date.now()+Number(tokens.expires_in)*1000 : null};
}

export function parseRpc(text) {
  let result;
  try {result=JSON.parse(text);} catch {
    const events=text.split(/\r?\n\r?\n/).map(event=>event.split(/\r?\n/).filter(line=>line.startsWith("data:")).map(line=>line.slice(5).trimStart()).join("\n")).filter(Boolean);
    for (const event of events) {try {const parsed=JSON.parse(event);if (parsed.id!==undefined) result=parsed;}catch{}}
  }
  if (!result || result.error) throw new Error("Provider protocol error");
  return result.result;
}

// Server callers choose fixed operations; browser input never supplies tool names.
export async function withMetricool(accessToken,action,request=fetch) {
  let session, protocol="2025-03-26";
  async function rpc(method,params,id) {
    const headers={Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json",Accept:"application/json, text/event-stream"};
    if (session) headers["Mcp-Session-Id"]=session;
    if (method!=="initialize") headers["MCP-Protocol-Version"]=protocol;
    const response=await request("https://ai.metricool.com/mcp",{method:"POST",headers,body:JSON.stringify({jsonrpc:"2.0",...(id===undefined?{}:{id}),method,params}),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error("Provider connection failed");
    session=response.headers.get("mcp-session-id") || session;
    if (id===undefined) return;
    return parseRpc(await response.text());
  }
  try {
    const initialized=await rpc("initialize",{protocolVersion:"2025-03-26",capabilities:{},clientInfo:{name:"music-promotion-secretary",version:"1.0"}},1);
    protocol=initialized.protocolVersion || protocol;
    await rpc("notifications/initialized",{},undefined);
    const listed=await rpc("tools/list",{},2);
    let id=3;
    return await action(async (operation,args)=>{
      if(!["getbrandsettings","createscheduledpost","getscheduledposts"].includes(operation)) throw new Error("Unsupported operation");
      const tool=listed.tools?.find(t=>t.name.replace(/[^a-z]/gi,"").toLowerCase()===operation);
      if(!tool) throw new Error("Provider operation unavailable");
      return rpc("tools/call",{name:tool.name,arguments:args},id++);
    });
  } finally {
    if(session) await request("https://ai.metricool.com/mcp",{method:"DELETE",headers:{Authorization:`Bearer ${accessToken}`,"Mcp-Session-Id":session},signal:AbortSignal.timeout(3000)}).catch(()=>{});
  }
}

export function toolData(result) {
  if(result.isError) throw new Error("Provider rejected the request");
  if(result.structuredContent) return result.structuredContent;
  for(const item of result.content || []) if(item.type==="text") {try{return JSON.parse(item.text);}catch{}}
  throw new Error("Unrecognized provider response");
}
export async function inspectAccounts(accessToken,request=fetch) {
  return withMetricool(accessToken,async call=>{
    const data=toolData(await call("getbrandsettings",{}));
    const brands=Array.isArray(data) ? data : data?.data;
    if(!Array.isArray(brands)) throw new Error("Unexpected account response");
    return brands.map(brand=>({id:String(brand.id),label:brand.label || "My brand",networks:["youtube","facebook","tiktok"].map(network=>({network,connected:Boolean(brand.networksData?.[`${network}Data`])}))}));
  },request);
}
