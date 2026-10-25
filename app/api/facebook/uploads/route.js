import {randomUUID} from 'node:crypto';
import {billingAuth,json} from '../../../../lib/billing';
import {unseal} from '../../../../lib/metricool-oauth.mjs';
import {signResult,verifyResult} from '../../../../lib/scheduling.mjs';
import {ownedMediaUrl} from '../../../../lib/media.mjs';
import {readVideo} from '../../../../lib/youtube-upload.mjs';
import {facebookTestMetadata,selectedFacebookPage,facebookCall,uploadFacebookTest,describeFacebookVideo} from '../../../../lib/facebook-upload.mjs';
import {describeFacebookRelease,facebookReceiptMessage} from '../../../../lib/facebook-release.mjs';
import {facebookAccess} from '../../../../lib/facebook-access.mjs';
export const dynamic='force-dynamic';export const maxDuration=60;
async function account(request,mutating=false){const auth=await billingAuth(request,mutating);auth.facebook=await facebookAccess(auth,mutating);return auth;}
async function context(auth,signal){
 const {data,error}=await auth.client.from('social_connections').select('encrypted_connection').eq('user_id',auth.user.id).eq('provider','facebook').single();
 if(error || !data)throw Error('Connect Facebook first.');
 const saved=unseal(data.encrypted_connection),page=selectedFacebookPage(saved),call=facebookCall(page,process.env,fetch,signal);
 const identity=await call('/'+page.id,{query:{fields:'id,name'}});if(identity.id!==page.id)throw Error('Reconnect your Facebook Page.');
 return {page,call};
}
function trusted(row){const o=row.outcome;return o&&o.id===row.id&&o.userId===row.user_id&&o.pageId===row.page_id&&o.mode==='unpublished'&&verifyResult(o,row.outcome_signature)?o:null;}
async function save(auth,o){const {data,error}=await auth.client.from('facebook_uploads').update({outcome:o,outcome_signature:signResult(o)}).eq('id',o.id).eq('user_id',auth.user.id).select('id').single();if(error||!data)throw Error('Result could not be saved. Check Business Suite before another copy.');}
async function inspect(call,id,pageId){if(!/^\d+$/.test(id||''))throw Error('Invalid video identifier.');return describeFacebookVideo(await call('/'+id,{query:{fields:'id,from,status,published'}}),pageId);}
function trustedRelease(r){const o=r?.outcome;return o&&o.id===r.id&&o.userId===r.user_id&&o.uploadId===r.upload_id&&o.pageId===r.page_id&&o.videoId===r.video_id&&o.mode===r.mode&&(o.publishAt===null?r.publish_at===null:Date.parse(o.publishAt)===Date.parse(r.publish_at))&&verifyResult(o,r.outcome_signature)?o:null;}
async function releaseStatus(auth,r,ctx){
 let o=trustedRelease(r),liveVerified=false;
 if(o&&ctx&&r.page_id===ctx.page.id){try{
 const current=await ctx.call('/'+r.video_id,{query:{fields:'id,from,status,published,scheduled_publish_time'}});
 if(current.id!==r.video_id)throw Error();
 o={...o,...describeFacebookRelease(current,r.page_id,{mode:r.mode,publishAt:r.publish_at}),checkedAt:new Date().toISOString()};
 if(r.strategy==='app'&&current.published!==true){o={...o,appManaged:true,verified:false,state:r.dispatch_state==='queued'?'queued':r.dispatch_state==='claimed'?'publishing':r.dispatch_state==='missed'?'missed':'unconfirmed'};}
 const {error}=await auth.client.from('facebook_releases').update({outcome:o,outcome_signature:signResult(o)}).eq('id',r.id).eq('user_id',auth.user.id);if(error)throw error;liveVerified=true;
 }catch{}}
 return {id:r.id,mode:r.mode,publishAt:r.publish_at,state:o?.state||'unconfirmed',verified:!!o?.verified,liveVerified,canReschedule:!!(liveVerified&&r.mode==='scheduled'&&o?.published===false&&o?.processed&&o?.scheduleCheck==='missing'&&((r.strategy==='meta')||(r.strategy==='app'&&r.dispatch_state==='queued'&&Date.parse(r.publish_at)>Date.now()))),message:facebookReceiptMessage(o||{},liveVerified)};
}
export async function GET(request){
 let auth;try{auth=await account(request);}catch{return json({message:'Sign in to check your Facebook publishing access.'},403);}
 if(!auth.facebook.enabled)return json({...auth.facebook,uploads:[],drafts:[],page:null,connectionError:auth.facebook.reason});
 try{
 const [{data:rows,error},{data:drafts,error:de},{data:releases,error:re}]=await Promise.all([auth.client.from('facebook_uploads').select('*').eq('user_id',auth.user.id).order('created_at',{ascending:false}).limit(10),auth.client.from('campaign_drafts').select('id,title,media_url,media_kind').eq('user_id',auth.user.id).order('created_at',{ascending:false}).limit(50),auth.client.from('facebook_releases').select('*').eq('user_id',auth.user.id)]);if(error||de||re)throw Error();
 let ctx,connectionError='';try{ctx=await context(auth,AbortSignal.timeout(15000));}catch(e){connectionError=e.message;}
 const uploads=[];
 for(const row of rows||[]){let o=trusted(row),liveVerified=false;if(o?.videoId&&ctx&&row.page_id===ctx.page.id){try{o={...o,...await inspect(ctx.call,o.videoId,row.page_id),checkedAt:new Date().toISOString()};await save(auth,o);liveVerified=true;}catch{}}
 const r=(releases||[]).find(r=>r.upload_id===row.id),release=r?await releaseStatus(auth,r,ctx):null;
 uploads.push({id:row.id,createdAt:row.created_at,title:row.title,liveVerified,release,canSchedule:!!(auth.facebook.owner&&release?.canReschedule),canRelease:!!(liveVerified&&o?.verified&&o?.processed&&!release),...(o?{videoId:o.videoId,url:o.url,verified:o.verified,processed:o.processed,failed:o.failed,published:o.published,processingStatus:o.processingStatus}:{}),message:facebookReceiptMessage(o||{},liveVerified)});}
 return json({...auth.facebook,page:ctx?{id:ctx.page.id,name:ctx.page.name}:null,connectionError,publicPublishingEnabled:true,uploads,drafts:(drafts||[]).filter(d=>d.media_kind!=='audio'&&ownedMediaUrl(d.media_url,auth.user.id)&&/\.mp4$/i.test(d.media_url)).map(d=>({id:d.id,title:d.title}))});
 }catch{return json({message:'Facebook test records could not be loaded.'},503);}
}
export async function POST(request){
 let auth;try{auth=await account(request,true);}catch{return json({message:'Open the Facebook studio while signed in with publishing access.'},403);}
 let outcome;
 try{
 const raw=await request.text();if(raw.length>3000)throw Error('Invalid request.');const body=JSON.parse(raw);
 const {data:draft,error}=await auth.client.from('campaign_drafts').select('*').eq('user_id',auth.user.id).eq('id',body.draftId).single();
 if(error||!draft||!ownedMediaUrl(draft.media_url,auth.user.id)||!/\.mp4$/i.test(draft.media_url)||draft.media_kind==='audio')throw Error('Choose your own saved MP4 video draft.');
 if(!auth.facebook.owner&&!auth.facebook.allowance?.canPublish)throw Error(auth.facebook.allowance?.reason||'No promotion allowance is available.');
 const metadata=facebookTestMetadata(draft,body),signal=AbortSignal.timeout(40000),{page,call}=await context(auth,signal);
 // Validate source format and size before making a provider-side submission.
 await readVideo(await fetch(draft.media_url,{cache:'no-store',redirect:'error',signal}));
 const id=randomUUID();const {error:reserve}=await auth.client.from('facebook_uploads').insert({id,user_id:auth.user.id,draft_id:draft.id,page_id:page.id,title:draft.title});
 if(reserve)return json({message:reserve.code==='23505'?'This draft already has a Facebook test attempt. Refresh status and check Business Suite before another copy.':'No submission was sent. The test reservation could not be saved.'},409);
 outcome={id,userId:auth.user.id,pageId:page.id,mode:'unpublished',verified:false,message:'Submission outcome unconfirmed. Check Meta Business Suite before another copy.'};
 const videoId=await uploadFacebookTest(call,page.id,draft.media_url,metadata);
 outcome={...outcome,videoId,url:'https://www.facebook.com/watch/?v='+videoId,message:'Facebook returned a video ID. Processing and unpublished status still need verification.'};
 await save(auth,outcome);
 try{outcome={...outcome,...await inspect(call,videoId,page.id),checkedAt:new Date().toISOString()};await save(auth,outcome);}catch{}
 return json({message:'Video sent for preparation. Check processing below, then review and publish. No public post was requested.'});
 }catch(e){if(outcome){try{await save(auth,outcome);}catch{}return json({message:'Submission outcome is uncertain. Refresh status and check Business Suite before another copy.'},502);}return json({message:e instanceof SyntaxError?'Invalid request.':e.message||'Unable to prepare the test.'},400);}
}
