import {billingAuth,bridge,stripeClient,json} from "../../../../lib/billing";
import {APP_ORIGIN} from "../../../../lib/metricool-oauth.mjs";
export async function POST(request){let auth;try{auth=await billingAuth(request,true);}catch{return json({message:'Please sign in.'},401);}
 try{const c=await bridge('customer',{userId:auth.user.id,livemode:!(process.env.STRIPE_SECRET_KEY||'').includes('_test_')});if(!c.id)return json({message:'No billing account yet.'},400);
 const s=await stripeClient().billingPortal.sessions.create({customer:c.id,return_url:`${APP_ORIGIN}/dashboard`});return json({url:s.url});}catch{return json({message:'Subscription management is unavailable. Please contact support.'},503);}}
