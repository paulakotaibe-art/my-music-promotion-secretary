import {youtubeConfigured} from '../../../../lib/youtube-oauth.mjs';
import {billingAuth,usage,json} from '../../../../lib/billing';
export const dynamic='force-dynamic';
export async function GET(request){
 let auth;try{auth=await billingAuth(request);}catch{return json({message:'Please sign in.'},401);}
 try{
  if(!(await usage(auth)).owner)return json({message:'Owner access required.'},403);
  const {data,error}=await auth.client.from('youtube_connections').select('channel_id,channel_title,connected_at').eq('user_id',auth.user.id).maybeSingle();
  if(error)throw error;
  return json({youtube:{credentialsConfigured:youtubeConfigured(),connection:data || null},directPublishingAvailable:false});
 }catch{return json({message:'Setup status could not be loaded. Please retry.'},503);}
}
