import {randomUUID} from 'node:crypto';
import {billingAuth,json,usage} from '../../../../lib/billing';
import {tiktokAccess} from '../../../../lib/tiktok-access.mjs';
import {tiktokConnection} from '../../../../lib/tiktok-connection.mjs';
import {tiktokCall,creatorView,validateTiktokPost} from '../../../../lib/tiktok-publish.mjs';
import {ownedMediaUrl} from '../../../../lib/media.mjs';
import {readVideo} from '../../../../lib/youtube-upload.mjs';
import {mp4Duration} from '../../../../lib/mp4-duration.mjs';
import {signResult} from '../../../../lib/scheduling.mjs';
export const dynamic='force-dynamic';export const maxDuration=60;
export async function POST(request){
 let auth;try{auth=await billingAuth(request,true);}catch{return json({message:'Sign in from the app to review your TikTok post.'},401);}
 try{const access=await tiktokAccess(auth,true),raw=await request.text();if(raw.length>12000)throw Error('Invalid post review.');const body=JSON.parse(raw),{data:d,error}=await auth.client.from('campaign_drafts').select('id,title,media_url,media_kind').eq('user_id',auth.user.id).eq('id',body.draftId).single();if(error||d.media_kind!=='video'||!ownedMediaUrl(d.media_url,auth.user.id)||!new URL(d.media_url).pathname.endsWith('.mp4'))throw Error('Choose your own saved MP4 video.');
  const signal=AbortSignal.timeout(40000),saved=await tiktokConnection(auth.client,auth.user.id,signal),creator=creatorView(await tiktokCall(saved.tokens.access_token,fetch,signal)('/v2/post/publish/creator_info/query/'),access.audited===true),duration=mp4Duration(await readVideo(await fetch(d.media_url,{cache:'no-store',redirect:'error',signal}))),checked=validateTiktokPost(body,creator,duration,access.audited===true);
  const {data:old,error:oe}=await auth.client.from('tiktok_posts').select('id,state,publish_id').eq('draft_id',d.id).eq('user_id',auth.user.id).maybeSingle();if(oe)throw Error('The previous post attempt could not be checked.');if(old&&(!['queued','cancelled'].includes(old.state)||old.publish_id))throw Error('This video already has a publication attempt. Check its result before uploading another copy.');
  const allowance=await usage(auth,checked.publishAt||undefined);if(!access.owner&&!old&&!allowance.canPublish)throw Error(allowance.reason||'No promotion is available for that date.');
  const expected={...checked,id:old?.id||randomUUID(),userId:auth.user.id,draftId:d.id,openId:saved.accountId,mediaUrl:d.media_url,duration,title:d.title,creatorUsername:creator.username,creatorNickname:creator.nickname,reviewedAt:new Date().toISOString()};return json({expected,signature:signResult(expected),allowance,replacesQueued:old?.state==='queued'});
 }catch(e){return json({message:e instanceof SyntaxError?'Invalid review request.':e.message||'Your post could not be prepared.'},400);}
}
