import {billingAuth,json} from '../../../../../lib/billing';
export const dynamic='force-dynamic';
export async function GET(request){
 let auth;try{auth=await billingAuth(request);}catch{return json({message:'Please sign in to manage your channel.'},401);}
 try{
 const {data,error}=await auth.client.from('youtube_connections').select('channel_id,channel_title,connected_at').eq('user_id',auth.user.id).maybeSingle();
 if(error)throw error;
 return json({connection:data || null,available:Boolean(process.env.YOUTUBE_CLIENT_ID?.trim() && process.env.YOUTUBE_CLIENT_SECRET?.trim())});
 }catch{return json({message:'Unable to load your channel. Please retry.'},503);}
}
