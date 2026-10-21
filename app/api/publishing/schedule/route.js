import {randomUUID} from "node:crypto";
import {authenticate} from "../../../../lib/server-auth";
import {APP_ORIGIN,seal,unseal,inspectAccounts,withMetricool,toolData} from "../../../../lib/metricool-oauth.mjs";
import {buildPost,signResult,verifyResult,safePlannerUrl} from "../../../../lib/scheduling.mjs";
export const dynamic="force-dynamic";
const reply=(body,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
async function connection(auth) {
  const {data,error}=await auth.client.from("metricool_connections").select("encrypted_tokens").eq("user_id",auth.user.id).maybeSingle();
  if(error || !data) throw new Error("Connect Metricool before scheduling.");
  const tokens=unseal(data.encrypted_tokens);
  if(tokens.expires_at && tokens.expires_at<Date.now()+30000) throw new Error("Your authorization has expired. Reconnect Metricool before scheduling.");
  return tokens.access_token;
}
export async function GET(request) {
  let auth;
  try {auth=await authenticate((request.headers.get("authorization") || "").replace(/^Bearer /,""));}catch{return reply({message:"Please sign in again."},401);}
  const {data,error}=await auth.client.from("campaign_submissions").select("*").eq("user_id",auth.user.id).order("created_at",{ascending:false}).limit(50);
  if(error) return reply({message:"Unable to load submissions."},503);
  return reply({submissions:data.map(row=>{
    const valid=row.evidence && verifyResult(row.evidence,row.evidence_signature) && row.evidence.id===row.id && row.evidence.userId===auth.user.id;
    return {id:row.id,draft_id:row.draft_id,title:row.snapshot.title,platforms:row.snapshot.platforms,date:row.snapshot.planned_at,status:valid ? row.evidence.status : "unknown",message:valid ? row.evidence.message : "Submission outcome is unconfirmed. Check Metricool before trying another post.",plannerUrl:valid ? safePlannerUrl(row.evidence.plannerUrl) : null};
  })});
}
export async function POST(request) {
  let auth;
  try {auth=await authenticate((request.headers.get("authorization") || "").replace(/^Bearer /,""));}catch{return reply({message:"Please sign in again."},401);}
  if(request.headers.get("origin")!==APP_ORIGIN) return reply({message:"Schedule from the production dashboard."},403);
  let body;
  try {const raw=await request.text();if(raw.length>20000) throw new Error();body=JSON.parse(raw);}catch{return reply({message:"Invalid scheduling request."},400);}
  if(body.action==="preview") {
    try {
      if(!/^[a-f0-9-]{36}$/i.test(body.draftId || "")) throw new Error("Choose a saved campaign draft.");
      const {data:draft,error}=await auth.client.from("campaign_drafts").select("*").eq("id",body.draftId).eq("user_id",auth.user.id).single();
      if(error || !draft) throw new Error("Campaign draft was not found.");
      const options={madeForKids:body.madeForKids,tiktokPrivacy:body.tiktokPrivacy,rightsConfirmed:body.rightsConfirmed,ownBrand:body.ownBrand===true,thirdParty:body.thirdParty===true};
      const post=buildPost(draft,options);
      const access=await connection(auth), brands=await inspectAccounts(access);
      const brand=body.brandId ? brands.find(b=>b.id===String(body.brandId)) : brands.length===1 ? brands[0] : null;
      if(!brand) throw new Error("Check your connection and choose a brand.");
      if(draft.platforms.some(p=>!brand.networks.find(n=>n.network===p)?.connected)) throw new Error("One or more selected platforms are not connected to this brand.");
      const pending={id:randomUUID(),userId:auth.user.id,draftId:draft.id,brandId:brand.id,options,draft,post,expires:Date.now()+300000};
      return reply({ticket:seal(pending),preview:{title:draft.title,caption:draft.caption,media_url:draft.media_url,platforms:draft.platforms,date:draft.planned_at,brand:brand.label,options}});
    } catch(e) {return reply({message:e.message || "Unable to prepare preview."},400);}
  }
  if(body.action!=="submit" || body.confirmed!==true) return reply({message:"Preview and confirm your post first."},400);
  let pending,access;
  try {
    pending=unseal(body.ticket || "");
    if(pending.userId!==auth.user.id || pending.expires<Date.now()) throw new Error("Preview expired. Prepare a new preview.");
    buildPost(pending.draft,pending.options);
    access=await connection(auth);
  } catch(e) {return reply({message:e.message || "Invalid preview."},400);}
  // Insert the unique attempt BEFORE any provider write. Never retry an uncertain write.
  const {error:claimError}=await auth.client.from("campaign_submissions").insert({id:pending.id,user_id:auth.user.id,draft_id:pending.draftId,snapshot:{title:pending.draft.title,platforms:pending.draft.platforms,planned_at:pending.draft.planned_at,caption:pending.draft.caption,media_url:pending.draft.media_url,brand_id:pending.brandId}});
  if(claimError) return reply({message:claimError.code==="23505" ? "This draft already has a submission attempt. Check its status and Metricool before creating another post." : "Unable to record the submission. No post was sent."},409);
  let status="unknown",message="Provider outcome is uncertain. Check Metricool before creating another post.",plannerUrl=null,providerId=null;
  try {
    const result=await withMetricool(access,call=>call("createscheduledpost",{blogId:pending.brandId,date:pending.post.publicationDate.dateTime+"Z",info:JSON.stringify(pending.post)}));
    if(result.isError) {status="rejected";message="The provider rejected this submission. Check media, permissions and plan limits in Metricool.";}
    else {
      const data=toolData(result),post=data.data || data.post || data;
      plannerUrl=safePlannerUrl(data.plannerUrl || post.plannerUrl);
      providerId=post.id ?? post.uuid ?? null;
      if(providerId || plannerUrl) {status="accepted";message="Accepted by Metricool for scheduling. Publication has not yet been verified.";}
    }
  } catch {} // No retry: timeout may occur after the provider accepted the post.
  const evidence={id:pending.id,userId:auth.user.id,status,message,plannerUrl,providerId};
  const {error:saveError}=await auth.client.from("campaign_submissions").update({evidence,evidence_signature:signResult(evidence)}).eq("id",pending.id).eq("user_id",auth.user.id);
  if(saveError) return reply({message:"The submission was attempted but its result could not be saved. Check Metricool before retrying.",status:"unknown"},502);
  return reply({status,message,plannerUrl},status==="accepted" ? 200 : 502);
}
