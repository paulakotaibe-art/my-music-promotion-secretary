import {billingAuth,usage,json} from "../../../../lib/billing";
export const dynamic="force-dynamic";
export async function GET(request){let auth;try{auth=await billingAuth(request);}catch{return json({message:'Please sign in.'},401);}
 try{const at=new URL(request.url).searchParams.get('at');if(at&&!Number.isFinite(Date.parse(at)))return json({message:'Choose a valid date.'},400);return json(await usage(auth,at));}catch{return json({message:'Unable to check usage. Please reload.'},503);}}
