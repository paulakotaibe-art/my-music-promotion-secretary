import {scheduleAndConfirm} from "../../../../lib/schedule-confirmation.mjs";
import {usage,bridge} from "../../../../lib/billing";
import {randomUUID} from "node:crypto";
import {authenticate} from "../../../../lib/server-auth";
import {APP_ORIGIN,seal,unseal,inspectAccounts,withMetricool} from "../../../../lib/metricool-oauth.mjs";
import {buildPost,prepareDraft,signResult,verifyResult,safePlannerUrl} from "../../../../lib/scheduling.mjs";
import {ownedMediaUrl} from "../../../../lib/media.mjs";
export const dynamic="force-dynamic";
export const maxDuration=60;
const reply=(body,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
async function connection(auth) {
  const {data,error}=await auth.client.from("metricool_connections").select("encrypted_tokens").eq("user_id",auth.user.id).maybeSingle();
  if(error || !data) throw new Error("Connect your social accounts once using Social accounts in the post form.");
  const tokens=unseal(data.encrypted_tokens);
  if(tokens.expires_at && tokens.expires_at<Date.now()+30000) throw new Error("Your social authorization has expired. Use Social accounts to reconnect once.");
  return tokens.access_token;
}
export async function GET(request) {
  let auth;
  try {auth=await authenticate((request.headers.get("authorization") || "").replace(/^Bearer /,""));}catch{return reply({message:"Please sign in again."},401);}
  const {data,error}=await auth.client.from("campaign_submissions").select("*").eq("user_id",auth.user.id).order("created_at",{ascending:false}).limit(50);
  if(error) return reply({message:"Unable to load submissions."},503);
  return reply({submissions:data.map(row=>{
    const valid=row.evidence && verifyResult(row.evidence,row.evidence_signature) && row.evidence.id===row.id && row.evidence.userId===auth.user.id;
    const legacy=valid && row.evidence.status==="accepted" && !Array.isArray(row.evidence.confirmedPlatforms);
    if(row.snapshot.provider==='direct_facebook')return {id:row.id,draft_id:row.draft_id,title:row.snapshot.title,platforms:row.snapshot.platforms,date:row.snapshot.planned_at,status:'unknown',direct:true,message:'Facebook publication reserved. Open your Facebook studio to check processing, schedule and actual publication.',directUrl:'/facebook'};
    if(row.snapshot.provider==='direct_youtube')return {id:row.id,draft_id:row.draft_id,title:row.snapshot.title,platforms:row.snapshot.platforms,date:row.snapshot.planned_at,status:'unknown',direct:true,message:'Direct YouTube attempt reserved. Open YouTube Studio in this app to refresh its processing and publication status.',directUrl:'/youtube-test'};
    return {id:row.id,draft_id:row.draft_id,title:row.snapshot.title,platforms:row.snapshot.platforms,date:row.snapshot.planned_at,status:valid && !legacy ? row.evidence.status : "unknown",message:legacy ? "This older receipt confirms submission only. Its current platforms and publication time need checking before another copy is created." : valid ? row.evidence.message : "Submission outcome is unconfirmed. Check Metricool before trying another post.",plannerUrl:valid ? safePlannerUrl(row.evidence.plannerUrl) : null};
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
      const {data:savedDraft,error}=await auth.client.from("campaign_drafts").select("*").eq("id",body.draftId).eq("user_id",auth.user.id).single();
      if(error || !savedDraft) throw new Error("Campaign draft was not found.");

      const options={publishNow:body.publishNow===true,madeForKids:body.madeForKids,tiktokPrivacy:body.tiktokPrivacy,rightsConfirmed:body.rightsConfirmed,ownBrand:body.ownBrand===true,thirdParty:body.thirdParty===true};
      const draft=prepareDraft(savedDraft,options);
      if(draft.cover_url && !ownedMediaUrl(draft.cover_url,auth.user.id)) throw new Error("Upload your album artwork again.");
      const {data:prior,error:priorError}=await auth.client.from("campaign_submissions").select("id").eq("user_id",auth.user.id).eq("draft_id",draft.id).maybeSingle();
      if(priorError)throw new Error("Unable to check this post. Please try Ready to Publish again.");
      if(prior)throw new Error("This draft already has a publishing attempt. See Your posts before trying another copy.");
      const allowance=await usage(auth,draft.planned_at);
      if(!allowance.canPublish)throw new Error(allowance.reason);
      const post=buildPost(draft,options);
      const access=await connection(auth), brands=await inspectAccounts(access);
      const brand=body.brandId ? brands.find(b=>b.id===String(body.brandId)) : brands.length===1 ? brands[0] : null;
      if(!brand) throw new Error("Connect your social accounts or choose your posting profile.");
      if(draft.platforms.some(p=>!brand.networks.find(n=>n.network===p)?.connected)) throw new Error("A selected platform needs authorization. Open Social accounts to finish its one-time setup.");
      const pending={id:randomUUID(),userId:auth.user.id,draftId:draft.id,brandId:brand.id,options,draft,post,expires:Date.now()+300000};
      return reply({ticket:seal(pending),preview:{title:draft.title,caption:post.text,media_url:draft.media_url,cover_url:draft.cover_url,media_kind:draft.media_kind,platforms:draft.platforms,date:draft.planned_at,brand:brand.label,options}});
    } catch(e) {return reply({message:e.message || "Unable to prepare preview."},400);}
  }
  if(body.action!=="submit" || body.confirmed!==true) return reply({message:"Preview and confirm your post first."},400);
  let pending,access;
  try {
    pending=unseal(body.ticket || "");
    if(pending.userId!==auth.user.id || pending.expires<Date.now()) throw new Error("Your review has expired. Click Ready to Publish again.");
    pending.draft=prepareDraft(pending.draft,pending.options);
    pending.post=buildPost(pending.draft,pending.options);
    access=await connection(auth);
  } catch(e) {return reply({message:e.message || "Invalid preview."},400);}
  // Insert the unique attempt BEFORE any provider write. Never retry an uncertain write.
  const {error:claimError}=await auth.client.from("campaign_submissions").insert({id:pending.id,user_id:auth.user.id,draft_id:pending.draftId,snapshot:{title:pending.draft.title,platforms:pending.draft.platforms,planned_at:pending.draft.planned_at,caption:pending.draft.caption,media_url:pending.draft.media_url,brand_id:pending.brandId}});
  if(claimError) return reply({message:claimError.code==="23505" ? "This draft already has a publishing attempt. See Your posts before creating another copy." : claimError.message?.includes("Subscriber publishing") || claimError.message?.includes("allowance") || claimError.message?.includes("paid period") || claimError.message?.includes("queue is full") || claimError.message?.includes("artist profile") ? claimError.message : "Unable to record the submission. No post was sent."},409);
  let outcome={status:"unknown",message:"The publishing result is awaiting confirmation. Do not create another copy until this attempt has been checked."};
  try {
    outcome=await withMetricool(access,call=>scheduleAndConfirm(call,pending.brandId,pending.post));
  } catch {} // No retry: timeout may occur after the provider accepted the post.
  const {status,message,plannerUrl=null}=outcome;
  if(status==="rejected") {try{await bridge("release",{id:pending.id,userId:auth.user.id});}catch{}}
  const evidence={...outcome,id:pending.id,userId:auth.user.id};
  const {error:saveError}=await auth.client.from("campaign_submissions").update({evidence,evidence_signature:signResult(evidence)}).eq("id",pending.id).eq("user_id",auth.user.id);
  if(saveError) return reply({message:"Your post was sent, but its result could not be saved. Do not retry until this attempt has been checked.",status:"unknown"},502);
  return reply({status,message,plannerUrl},status==="accepted" ? 200 : 502);
}


