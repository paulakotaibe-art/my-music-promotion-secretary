import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {authenticate} from "../../../../../lib/server-auth";
import {APP_ORIGIN,COOKIE,cookieOptions,unseal,seal,validateState,exchangeCode} from "../../../../../lib/metricool-oauth.mjs";
export const dynamic="force-dynamic";
export async function GET(request) {
  const url=new URL(request.url);
  let outcome="failed";
  try {
    const saved=unseal(cookies().get(COOKIE)?.value || "");
    validateState(saved,url.searchParams.get("state"));
    if(url.searchParams.has("error")) throw new Error("Authorization declined");
    const code=url.searchParams.get("code");
    if(!code || code.length>4096) throw new Error("Missing code");
    const {user,client}=await authenticate(saved.accessToken);
    if(user.id!==saved.userId) throw new Error("Account mismatch");
    const tokens=await exchangeCode(code,saved.verifier);
    const {error}=await client.from("metricool_connections").upsert({user_id:user.id,encrypted_tokens:seal(tokens),connected_at:new Date().toISOString()},{onConflict:"user_id"});
    if(error) throw error;
    outcome="authorized";
  } catch {} // Never expose authorization codes, tokens, or provider errors in URLs/logs.
  const response=NextResponse.redirect(`${APP_ORIGIN}/dashboard?metricool=${outcome}`,303);
  response.headers.set("Cache-Control","private, no-store");
  response.headers.set("Referrer-Policy","no-referrer");
  response.cookies.set(COOKIE,"",{...cookieOptions,maxAge:0});
  return response;
}
