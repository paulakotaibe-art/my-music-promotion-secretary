import {billingAuth,bridge,stripeClient,json,billingMode} from "../../../../lib/billing";
import {APP_ORIGIN} from "../../../../lib/metricool-oauth.mjs";
export async function POST(request){let auth;try{auth=await billingAuth(request,true);}catch{return json({message:'Please sign in.'},401);}
 try{const c=await bridge('customer',{userId:auth.user.id,livemode:billingMode()==='live'});if(!c.id)return json({message:'No billing account yet.'},400);
 const config=await bridge('config');if(!config.portalConfiguration)throw new Error('Portal not configured');
 const s=await stripeClient().billingPortal.sessions.create({customer:c.id,configuration:config.portalConfiguration,return_url:`${APP_ORIGIN}/dashboard`});return json({url:s.url});}catch{return json({message:'Subscription management is unavailable. Please contact support.'},503);}}

