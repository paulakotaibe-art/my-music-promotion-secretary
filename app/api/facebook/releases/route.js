import {randomUUID} from 'node:crypto';
import {billingAuth,json} from '../../../../lib/billing';
import {unseal} from '../../../../lib/metricool-oauth.mjs';
import {signResult,verifyResult} from '../../../../lib/scheduling.mjs';
import {selectedFacebookPage,facebookCall} from '../../../../lib/facebook-upload.mjs';
import {facebookReleaseRequest,assertFacebookReleaseReady,releaseFacebookOnce,describeFacebookRelease,facebookReceiptMessage} from '../../../../lib/facebook-release.mjs';
import {facebookAccess} from '../../../../lib/facebook-access.mjs';
export const dynamic='force-dynamic';export const maxDuration=60;
async function save(auth,o){const {data,error}=await auth.client.from('facebook_releases').update({outcome:o,outcome_signature:signResult(o)}).eq('id',o.id).eq('user_id',auth.user.id).select('id').single();if(error||!data)throw Error('Release result could not be saved.');}
export async function POST(request){
 let auth,access;try{auth=await billingAuth(request,true);access=await facebookAccess(auth,true);}catch{return json({message:'Open the Facebook studio while signed in with publishing access.'},403);}
 let outcome;
 try{
 const raw=await request.text();if(raw.length>3000)throw Error('Invalid request.');const body=JSON.parse(raw),release=facebookReleaseRequest(body);
 const {data:row,error}=await auth.client.from('facebook_uploads').select('*').eq('id',body.uploadId).eq('user_id',auth.user.id).single();
 const signed=row?.outcome;
 if(error||!signed||signed.id!==row.id||signed.userId!==auth.user.id||signed.pageId!==row.page_id||signed.mode!=='unpublished'||!verifyResult(signed,row.outcome_signature))throw Error('Choose a verified upload from your Facebook studio.');
 const {data:c,error:ce}=await auth.client.from('social_connections').select('encrypted_connection').eq('user_id',auth.user.id).eq('provider','facebook').single();if(ce||!c)throw Error('Reconnect Facebook first.');
 const page=selectedFacebookPage(unseal(c.encrypted_connection));if(page.id!==row.page_id)throw Error('Select the same Page used by this upload.');
 const call=facebookCall(page,process.env,fetch,AbortSignal.timeout(35000));
 const video=await call('/'+signed.videoId,{query:{fields:'id,from,status,published,scheduled_publish_time'}});
 assertFacebookReleaseReady(video,page.id,signed.videoId);
 if(release.mode==='scheduled'){
  const {data:old,error:oe}=await auth.client.from('facebook_releases').select('id,mode,strategy,dispatch_state').eq('upload_id',row.id).eq('user_id',auth.user.id).maybeSingle();if(oe)throw Error('Unable to check the previous release.');
  if(old&&!access.owner)throw Error('This video already has a publication reservation. Check its status before another attempt.');
  if(old&&(old.mode!=='scheduled'||(old.strategy==='app'&&old.dispatch_state!=='queued')))throw Error('This release needs a manual status check before rescheduling.');
  const id=old?.id||randomUUID(),queued={id,userId:auth.user.id,uploadId:row.id,pageId:page.id,videoId:signed.videoId,mode:'scheduled',publishAt:release.publishAt,appManaged:true,...(!access.owner?{subscriber:true}:{}),state:'queued',verified:false};
  const {error:qe}=await auth.client.rpc('queue_facebook_release',{p_id:id,p_upload:row.id,p_time:release.publishAt,p_outcome:queued,p_signature:signResult(queued)});
  if(qe)throw Error('Schedule could not be saved. Check your allowance and access period, then refresh status before another attempt.');
  return json({message:'Saved in the app schedule. The server will request publication when due, normally within one minute. Final Facebook publication will be checked separately.'});
 }
 // Reserve before writing to Meta. An uncertain response never releases this guard.
 const id=randomUUID();outcome={id,userId:auth.user.id,uploadId:row.id,pageId:page.id,videoId:signed.videoId,mode:release.mode,publishAt:release.publishAt,verified:false,state:'unconfirmed'};
 const {error:reserve}=await auth.client.from('facebook_releases').insert({id,user_id:auth.user.id,upload_id:row.id,page_id:page.id,video_id:signed.videoId,mode:release.mode,publish_at:release.publishAt});
 if(reserve){outcome=null;return json({message:reserve.code==='23505'?'This video already has a release attempt. Refresh status and check Meta Business Suite.':'No publication was requested. Check your remaining allowance, access period and prepared video before trying again.'},409);}
 await save(auth,outcome);
 await releaseFacebookOnce(call,signed.videoId,release);
 outcome={...outcome,requestAcknowledged:true};await save(auth,outcome);
 try{const current=await call('/'+signed.videoId,{query:{fields:'id,from,status,published,scheduled_publish_time'}});outcome={...outcome,...describeFacebookRelease(current,page.id,release),checkedAt:new Date().toISOString()};await save(auth,outcome);}catch{}
 return json({message:outcome.verified?facebookReceiptMessage(outcome):'Release request sent. Refresh status to verify the result. Do not repeat the request.'});
 }catch(e){if(outcome){if(Number.isInteger(e?.providerCode))outcome={...outcome,providerErrorCode:e.providerCode};try{await save(auth,outcome);}catch{}return json({message:'Release outcome is unconfirmed. Refresh status and check Meta Business Suite before another attempt.'},502);}return json({message:e instanceof SyntaxError?'Invalid request.':e.message||'Unable to prepare the release.'},400);}
}
