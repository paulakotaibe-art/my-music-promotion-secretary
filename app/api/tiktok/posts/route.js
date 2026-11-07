import {billingAuth,json} from '../../../../lib/billing';
import {signResult,verifyResult} from '../../../../lib/scheduling.mjs';
import {tiktokAccess} from '../../../../lib/tiktok-access.mjs';
import {validTiktokReceipt} from '../../../../lib/tiktok-publish.mjs';
import {runTiktokJob} from '../../../../lib/tiktok-runner.mjs';
export const dynamic='force-dynamic';export const maxDuration=60;
export async function GET(request){
 let auth;try{auth=await billingAuth(request);}catch{return json({message:'Please sign in.'},401);}
 try{const {data,error}=await auth.client.from('tiktok_posts').select('*').eq('user_id',auth.user.id).order('updated_at',{ascending:false}).limit(50);if(error)throw Error();
  return json({posts:(data||[]).map(r=>{const reviewValid=validTiktokReceipt(r,verifyResult),o=r.outcome,receiptValid=reviewValid&&o?.id===r.id&&o.userId===r.user_id&&o.openId===r.open_id&&o.publishId===r.publish_id&&verifyResult(o,r.outcome_signature),verified=receiptValid&&o.verified===true&&['published','nonpublic'].includes(r.state)&&r.state===o.state;return {id:r.id,title:reviewValid?r.expected.title:'Video',state:r.state,privacy:reviewValid?r.expected.privacy:null,publishAt:r.publish_at,checkedAt:receiptValid?o.checkedAt:null,verified,providerErrorCode:receiptValid?o.providerErrorCode:null,url:verified&&r.state==='published'?o.url:null,canCancel:['queued','reserved'].includes(r.state)&&!r.publish_id,canCheck:!!r.publish_id&&r.state!=='claimed',reviewValid};})});
 }catch{return json({message:'TikTok post results could not be loaded.'},503);}
}
export async function POST(request){
 let auth;try{auth=await billingAuth(request,true);}catch{return json({message:'Please sign in from the app.'},401);}let reserved=false;
 try{const raw=await request.text();if(raw.length>16000)throw Error('Invalid request.');const b=JSON.parse(raw);
  if(b.action==='check'){
   const {data:job,error}=await auth.client.rpc('claim_tiktok_check',{p_id:b.id});
   if(error||!job||job.statusOnly!==true)throw Error('That status check is unavailable. Refresh the result first.');
   const result=await runTiktokJob(auth.client,job);
   return json({message:result.verified?(result.state==='nonpublic'?'TikTok confirmed your private post is complete.':'TikTok confirmed your public post.') : result.saved?'TikTok has not confirmed completion yet. The latest check is shown below.':'The result could not be saved. Refresh before checking again.'});
  }
  if(b.action==='cancel'){const {data,error}=await auth.client.rpc('control_tiktok_post',{p_id:b.id,p_action:'cancel'});if(error||!data)throw Error('That action is unavailable. Refresh the result first.');return json({message:'Schedule cancelled before submission. Any subscriber reservation has been released.'});}
  await tiktokAccess(auth,true);const e=b.expected;if(!e||e.userId!==auth.user.id||!verifyResult(e,b.signature)||!Number.isFinite(Date.parse(e.reviewedAt))||Date.parse(e.reviewedAt)<Date.now()-600000||Date.parse(e.reviewedAt)>Date.now()+60000)throw Error('Review this post again before publishing.');
  const {data,error}=await auth.client.rpc('reserve_tiktok_post',{p_id:e.id,p_draft:e.draftId,p_expected:e,p_signature:signResult(e)});if(error||!data)throw Error('No TikTok request was sent. Refresh your allowance, date and previous post result, then review again.');reserved=true;
  if(e.publishAt)return json({message:'Saved in your app schedule. You can close the app. TikTok processing and moderation can delay visibility after the scheduled submission time.'});
  const {data:job,error:ce}=await auth.client.rpc('claim_tiktok_now',{p_id:e.id});if(ce||!job)throw Error();const result=await runTiktokJob(auth.client,job);return json({message:result.verified?(result.state==='published'?'TikTok verified your public post.':'TikTok completed your post with the selected non-public visibility.'):result.state==='processing'?'TikTok is processing your video. Its verified result will appear here automatically.':'The outcome needs attention. Check the post result before another attempt.'});
 }catch(e){return json({message:reserved?'This attempt is reserved. Refresh its result before trying again.':e instanceof SyntaxError?'Invalid request.':e.message||'Unable to publish.'},reserved?502:400);}
}
