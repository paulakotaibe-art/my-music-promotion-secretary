import {billingAuth,usage,json} from '../../../../lib/billing';
import {unseal} from '../../../../lib/metricool-oauth.mjs';
import {publishingReadiness} from '../../../../lib/publishing-readiness.mjs';
export const dynamic='force-dynamic';
export async function GET(request){
 let auth;try{auth=await billingAuth(request);}catch{return json({message:'Please sign in to check your publishing access.'},401);}
 try{
 const [allowance,{data:yt,error:ye},{data:social,error:se},{data:facebookAccess,error:fe}]=await Promise.all([usage(auth),auth.client.from('youtube_connections').select('channel_id').eq('user_id',auth.user.id).maybeSingle(),auth.client.from('social_connections').select('provider,encrypted_connection').eq('user_id',auth.user.id),auth.client.rpc('facebook_publishing_access')]);
 if(ye||se||fe)throw Error();
 const connections={youtube:{connected:!!yt}};
 for(const row of social||[]){const saved=unseal(row.encrypted_connection);connections[row.provider]={connected:true,publishingEnabled:row.provider==='facebook'&&facebookAccess?.enabled===true,pageSelected:!!saved.pages?.some(p=>p.id===saved.selectedPage?.id&&p.access_token)};}
 return json(publishingReadiness(allowance,connections));
 }catch{return json({message:'Unable to check publishing access. Refresh later.'},503);}
}
