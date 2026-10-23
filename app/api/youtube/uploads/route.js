import {randomUUID} from 'node:crypto';
import {billingAuth,usage,json} from '../../../../lib/billing';
import {seal,unseal} from '../../../../lib/metricool-oauth.mjs';
import {signResult,verifyResult} from '../../../../lib/scheduling.mjs';
import {ownedMediaUrl} from '../../../../lib/media.mjs';
import {videoMetadata,freshYouTubeToken,readVideo,describeVideo,uploadOnce} from '../../../../lib/youtube-upload.mjs';
export const dynamic='force-dynamic';
export const maxDuration=60;
function trusted(row){
 const o=row.outcome;
 return o && o.id===row.id && o.userId===row.user_id && o.channelId===row.channel_id && o.mode===row.mode && verifyResult(o,row.outcome_signature) ? o : null;
}
async function context(auth,signal){
 const {data:c,error}=await auth.client.from('youtube_connections').select('*').eq('user_id',auth.user.id).single();
 if(error || !c)throw Error('Connect your YouTube channel first.');
 const old=unseal(c.encrypted_tokens),tokens=await freshYouTubeToken(old,fetch,process.env,signal);
 if(tokens!==old){
  const {error:e}=await auth.client.from('youtube_connections').update({encrypted_tokens:seal(tokens)}).eq('user_id',auth.user.id).eq('encrypted_tokens',c.encrypted_tokens);
  if(e)throw Error('Unable to save renewed YouTube access.');
 }
 const call=(url,options={})=>fetch(url,{...options,headers:{...options.headers,Authorization:'Bearer '+tokens.access_token},cache:'no-store',redirect:'error',signal});
 const r=await call('https://www.googleapis.com/youtube/v3/channels?part=id&mine=true');
 if(!r.ok)throw Error('Reconnect your YouTube channel.');
 const d=await r.json();if(d.items?.length!==1 || d.items[0].id!==c.channel_id)throw Error('The authorized YouTube channel changed. Reconnect it.');
 return {connection:c,call};
}
async function inspect(call,id,channel,expected){
 if(!/^[a-zA-Z0-9_-]{11}$/.test(id || ''))throw Error('Video identifier unavailable.');
 const r=await call('https://www.googleapis.com/youtube/v3/videos?part=snippet%2Cstatus%2CprocessingDetails&id='+encodeURIComponent(id));
 if(!r.ok)throw Error('YouTube status is temporarily unavailable.');
 const d=await r.json();return describeVideo(d.items?.[0],channel,expected);
}
async function save(auth,outcome){
 const {error}=await auth.client.from('youtube_uploads').update({outcome,outcome_signature:signResult(outcome)}).eq('id',outcome.id).eq('user_id',auth.user.id);
 if(error)throw Error('Upload result could not be saved. Check YouTube Studio before another attempt.');
}
async function owner(request,mutating){
 const auth=await billingAuth(request,mutating);
 return auth;
}
export async function GET(request){
 let auth;try{auth=await owner(request,false);}catch{return json({message:'Please sign in.'},403);}
 try{
  const {data:rows,error}=await auth.client.from('youtube_uploads').select('*').eq('user_id',auth.user.id).order('created_at',{ascending:false}).limit(20);
  const {data:drafts,error:de}=await auth.client.from('campaign_drafts').select('id,title,media_url,media_kind').eq('user_id',auth.user.id).order('created_at',{ascending:false}).limit(50);
  if(error || de)throw Error('Unable to load your upload attempts.');
  let ctx;try{ctx=await context(auth,AbortSignal.timeout(20000));}catch{}
  const allowance=await usage(auth);
  let publicReady=false;
  const uploads=[];
  for(const row of rows || []){
   let o=trusted(row),live=false;
   if(o?.videoId && ctx && row.channel_id===ctx.connection.channel_id){
    try{const detail=await inspect(ctx.call,o.videoId,row.channel_id,row.expected);o={...o,...detail,checkedAt:new Date().toISOString()};await save(auth,o);live=true;}catch{}
   }
   if(live && row.mode==='private' && o?.verified && o.processed && o.privacy==='private')publicReady=true;
   uploads.push({id:row.id,mode:row.mode,createdAt:row.created_at,...(o?{videoId:o.videoId,url:o.url,privacy:o.privacy,publishAt:o.publishAt,processed:o.processed,processingStatus:o.processingStatus || 'unknown',verified:o.verified,failed:o.failed}:{}),liveVerified:live,message:o?.message || 'Outcome unconfirmed. Check YouTube Studio before another copy.'});
  }
  return json({uploads,owner:allowance.owner,canPublish:allowance.canPublish,publicReady:allowance.owner?publicReady:allowance.canPublish,drafts:(drafts || []).filter(d=>d.media_kind!=='audio' && /\.mp4$/i.test(d.media_url || '')).map(d=>({id:d.id,title:d.title}))});
 }catch{return json({message:'Unable to check uploads. Reconnect YouTube if authorization has expired.'},503);}
}
export async function POST(request){
 let auth;try{auth=await owner(request,true);}catch{return json({message:'Sign in from the app.'},403);}
 let id,outcome;
 try{
  const raw=await request.text();if(raw.length>4000)throw Error('Invalid upload request.');
  const body=JSON.parse(raw);if(body.confirmed!==true)throw Error('Review and confirm your upload.');
  const {data:draft,error}=await auth.client.from('campaign_drafts').select('*').eq('user_id',auth.user.id).eq('id',body.draftId).single();
  if(error || !draft)throw Error('Choose a saved video draft.');
  if(!ownedMediaUrl(draft.media_url,auth.user.id) || !/\.mp4$/i.test(draft.media_url) || draft.media_kind==='audio')throw Error('Upload an MP4 video to your release studio and save the draft first.');
  const metadata=videoMetadata(draft,body);
  const allowance=await usage(auth,body.mode==='scheduled'?metadata.status.publishAt:undefined);
  if(!allowance.owner && body.mode==='private')throw Error('Private tests are limited to the owner pilot.');
  if(!allowance.canPublish)throw Error(allowance.reason || 'Publishing is not available.');
  const signal=AbortSignal.timeout(40000),{connection:c,call}=await context(auth,signal);
  if(allowance.owner && body.mode!=='private'){
   const {data:rows,error:e}=await auth.client.from('youtube_uploads').select('*').eq('user_id',auth.user.id).eq('mode','private').eq('channel_id',c.channel_id).limit(20);
   if(e)throw Error('Unable to verify the private test.');
   let passed=false;
   for(const row of rows || []){
    const signed=trusted(row);if(!signed?.videoId)continue;
    try{const checked=await inspect(call,signed.videoId,c.channel_id,row.expected);if(checked.verified && checked.processed && checked.privacy==='private'){passed=true;break;}}catch{}
   }
   if(!passed)throw Error('Complete a verified private upload on this channel before public publishing.');
  }
  const media=await fetch(draft.media_url,{cache:'no-store',redirect:'error',signal});
  const bytes=await readVideo(media);
  const attempt=randomUUID();
  const {error:ce}=await auth.client.from('youtube_uploads').insert({id:attempt,user_id:auth.user.id,draft_id:draft.id,channel_id:c.channel_id,mode:body.mode,expected:metadata.status});
  if(ce)return json({message:ce.code==='23505'?'This draft already has an attempt in that mode. Check its status before another copy.':'No upload was sent. Your allowance, channel binding or an existing draft reservation prevented this attempt. Check your usage and Your posts.'},409);
  id=attempt;
  outcome={id,userId:auth.user.id,channelId:c.channel_id,mode:body.mode,verified:false,message:'The upload outcome needs confirmation. Do not create another copy before checking YouTube Studio.'};
  const videoId=await uploadOnce(call,bytes,metadata);
  outcome={...outcome,videoId,url:'https://www.youtube.com/watch?v='+videoId};
  try{outcome={...outcome,...await inspect(call,videoId,c.channel_id,metadata.status),checkedAt:new Date().toISOString()};}catch{}
  outcome.message=outcome.verified ? 'YouTube confirmed the video and requested visibility. Processing and final publication are checked separately below.' : outcome.message;
  await save(auth,outcome);
  return json({message:outcome.message,videoId,verified:outcome.verified});
 }catch(e){
  if(id){try{await save(auth,outcome);}catch{}return json({message:'Upload outcome is unconfirmed. Check your attempts and YouTube Studio before creating another copy.'},502);}
  return json({message:e instanceof SyntaxError?'Invalid upload request.':e.message || 'Unable to prepare the upload.'},400);
 }
}
