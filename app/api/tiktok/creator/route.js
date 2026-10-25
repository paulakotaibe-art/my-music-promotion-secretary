import {billingAuth,json} from '../../../../lib/billing';
import {tiktokAccess} from '../../../../lib/tiktok-access.mjs';
import {tiktokConnection} from '../../../../lib/tiktok-connection.mjs';
import {tiktokCall,creatorView} from '../../../../lib/tiktok-publish.mjs';
import {ownedMediaUrl} from '../../../../lib/media.mjs';
export const dynamic='force-dynamic';export const maxDuration=30;
export async function GET(request){
 let auth;try{auth=await billingAuth(request);}catch{return json({message:'Sign in to open your TikTok studio.'},401);}
 try{const access=await tiktokAccess(auth),{data:drafts,error}=await auth.client.from('campaign_drafts').select('id,title,caption,media_url,media_kind').eq('user_id',auth.user.id).order('created_at',{ascending:false}).limit(100);if(error)throw Error();
  const videos=(drafts||[]).filter(d=>d.media_kind==='video'&&ownedMediaUrl(d.media_url,auth.user.id)&&new URL(d.media_url).pathname.endsWith('.mp4'));let creator=null,connectionError=null;
  if(access.enabled)try{const saved=await tiktokConnection(auth.client,auth.user.id,AbortSignal.timeout(15000));creator=creatorView(await tiktokCall(saved.tokens.access_token)('/v2/post/publish/creator_info/query/'),access.audited===true);}catch{connectionError='Connect or reconnect your TikTok account, then refresh publishing settings.';}
  return json({...access,creator,connectionError,drafts:videos.map(d=>({id:d.id,title:d.title,caption:d.caption,mediaUrl:d.media_url}))});
 }catch{return json({message:'TikTok setup could not be checked. Refresh later.'},503);}
}
