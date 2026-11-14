import {billingAuth,json} from '../../../../lib/billing';
export const dynamic='force-dynamic';
export async function GET(request){
 let auth;try{auth=await billingAuth(request);}catch{return json({message:'Please sign in.'},401);}
 try{
  const at=new URL(request.url).searchParams.get('at');
  if(at&&!Number.isFinite(Date.parse(at)))return json({message:'Choose a valid date.'},400);
  const {data,error}=await auth.client.rpc('facebook_promotion_usage',at?{at_time:at}:{});
  if(error||!data)return json({message:'Facebook allowance could not be checked.'},403);
  return json(data);
 }catch{return json({message:'Unable to check Facebook usage. Please reload.'},503);}
}
