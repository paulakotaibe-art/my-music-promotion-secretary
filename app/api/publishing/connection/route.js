import {authenticate} from "../../../../lib/server-auth";
import {inspectAccounts,unseal} from "../../../../lib/metricool-oauth.mjs";
export const dynamic="force-dynamic";
function reply(body,status=200) {return Response.json(body,{status,headers:{"Cache-Control":"private, no-store"}});}
export async function GET(request) {
  let auth;
  try {auth=await authenticate((request.headers.get("authorization") || "").replace(/^Bearer /,""));}
  catch {return reply({message:"Please sign in again."},401);}
  try {
    const {data,error}=await auth.client.from("metricool_connections").select("encrypted_tokens").eq("user_id",auth.user.id).maybeSingle();
    if(error) throw error;
    if(!data) return reply({state:"not_linked",message:"Connect Metricool to verify your social platforms. No paid REST API token is needed for this connection.",networks:[]});
    const tokens=unseal(data.encrypted_tokens);
    if(tokens.expires_at && tokens.expires_at<Date.now()+30000) return reply({state:"reconnect_required",message:"Your authorization has expired. Please reconnect Metricool.",networks:[]});
    const brands=await inspectAccounts(tokens.access_token);
    return reply({state:"connected",message:brands.length===1 ? "Verified account: "+brands[0].label+". Scheduling is still being built; no posts have been sent." : "Authorization verified. Brand selection is required before scheduling.",networks:brands.length===1 ? brands[0].networks : [],brands});
  } catch {return reply({state:"connection_error",message:"Unable to verify the provider connection. Retry or reconnect Metricool. Your drafts are safe.",networks:[]});}
}
export async function DELETE(request) {
  let auth;
  try {auth=await authenticate((request.headers.get("authorization") || "").replace(/^Bearer /,""));}
  catch {return reply({message:"Please sign in again."},401);}
  const {error}=await auth.client.from("metricool_connections").delete().eq("user_id",auth.user.id);
  if(error) return reply({message:"Unable to disconnect. Please retry."},503);
  return reply({message:"Connection removed from this app. You can also revoke its permission in Metricool.",networks:[],state:"not_linked"});
}
