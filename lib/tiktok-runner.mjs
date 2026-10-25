import {signResult,verifyResult} from './scheduling.mjs';
import {tiktokCall,creatorView,postPayload,validTiktokReceipt,describeTiktokStatus} from './tiktok-publish.mjs';
import {tiktokConnection} from './tiktok-connection.mjs';
import {mediaTicket} from './tiktok-media.mjs';
export async function runTiktokJob(client,job,{request=fetch,connection=tiktokConnection,signal=AbortSignal.timeout(40000),now=Date.now()}={}){
 const r=job.post;let publishId=r.publish_id||null,attempted=false;let outcome={id:r.id,userId:r.user_id,openId:r.open_id,state:'unconfirmed',verified:false};
 async function save(done){outcome={...outcome,checkedAt:new Date().toISOString(),publishId};const {data,error}=await client.rpc('save_tiktok_run',{p_id:r.id,p_token:job.runToken,p_publish_id:publishId,p_outcome:outcome,p_signature:signResult(outcome),p_done:done});if(error||data!==true)throw Error('Publication result could not be saved.');}
 try{
  if(!validTiktokReceipt(r,verifyResult))throw Error('Publishing review could not be verified.');
  if(job.statusOnly!==true){if(publishId||job.authorized!==true)throw Error('Publishing access is unavailable.');if(r.publish_at&&(now<Date.parse(r.publish_at)||now>=Date.parse(r.publish_at)+600000))throw Error('Outside publication window.');}else if(!publishId)throw Error('No TikTok submission to check.');
  const saved=await connection(client,r.user_id,signal,job.runToken,job.connection);if(saved.accountId!==r.open_id)throw Error('Reconnect the same TikTok account.');const call=tiktokCall(saved.tokens.access_token,request,signal);
  if(!job.statusOnly){const c=creatorView(await call('/v2/post/publish/creator_info/query/'),job.audited===true),body=postPayload(r.expected,mediaTicket(r.expected),c,job.audited===true);attempted=true;const receipt=await call('/v2/post/publish/video/init/',body);if(typeof receipt.publish_id!=='string'||!receipt.publish_id||receipt.publish_id.length>64)throw Error('TikTok submission identity is unconfirmed.');publishId=receipt.publish_id;outcome={...outcome,state:'processing',requestAcknowledged:true};await save(false);}
  outcome={...outcome,...describeTiktokStatus(await call('/v2/post/publish/status/fetch/',{publish_id:publishId}),r.expected,r.expected.creatorUsername)};
 }catch(e){outcome={...outcome,state:publishId?'processing':attempted?'unconfirmed':'blocked',verified:false,writeAttempted:attempted,...(/^[a-z_]{1,100}$/.test(e.providerCode||'')?{providerErrorCode:e.providerCode}:{})};}
 try{await save(true);return {saved:true,state:outcome.state,verified:outcome.verified};}catch{return {saved:false,state:'unconfirmed',verified:false};}
}
