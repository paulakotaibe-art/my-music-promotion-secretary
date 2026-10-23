import {billingAuth,bridge,stripeClient,billingMode,json} from '../../../../lib/billing';
import {assertOwnedSubscription} from '../../../../lib/subscription-access.mjs';
import {PLANS,verifiedPlan} from '../../../../lib/plans.mjs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const describe=s=>({id:s.id,name:PLANS[verifiedPlan(s)]?.name||'Artist subscription',status:s.status,test:!s.livemode,cancelAtPeriodEnd:!!s.cancel_at_period_end,endsAt:new Date((s.current_period_end||s.items.data[0]?.current_period_end)*1000).toISOString()});
async function account(auth){const livemode=billingMode()==='live';const c=await bridge('customer',{userId:auth.user.id,livemode});if(!c.id)throw new Error('No billing account');return {customerId:c.id,livemode,stripe:stripeClient()};}
export async function GET(request){let auth;try{auth=await billingAuth(request);}catch{return json({message:'Please sign in again.'},401);}
 try{const a=await account(auth);const list=await a.stripe.subscriptions.list({customer:a.customerId,status:'all',limit:100});const subscriptions=list.data.filter(s=>s.metadata?.app_user_id===auth.user.id&&s.livemode===a.livemode).map(describe);return json({subscriptions});}
 catch{return json({message:'Unable to load subscription details. Please retry.'},503);}}
export async function POST(request){let auth;try{auth=await billingAuth(request,true);}catch{return json({message:'Please sign in again.'},401);}
 try{const body=await request.json();if(body.action!=='cancel_renewal'||body.confirmed!==true||!/^sub_[A-Za-z0-9]+$/.test(body.subscriptionId||''))return json({message:'Review and confirm the cancellation first.'},400);
 const a=await account(auth);const s=await a.stripe.subscriptions.retrieve(body.subscriptionId);try{assertOwnedSubscription(s,a.customerId,auth.user.id,a.livemode);}catch{return json({message:'Subscription not found.'},404);}
 if(!['active','trialing','past_due'].includes(s.status))return json({message:'This subscription is not renewing.'},409);
 const updated=s.cancel_at_period_end?s:await a.stripe.subscriptions.update(s.id,{cancel_at_period_end:true});
 return json({subscription:describe(updated),message:'Renewal cancelled. Access remains until the end of the current period.'});
 }catch{return json({message:'Cancellation could not be confirmed. No success has been recorded; please reload subscription details before trying again.'},503);}}
