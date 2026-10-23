import {bridge,stripeClient,json} from "../../../../lib/billing";
import {verifiedPlan} from "../../../../lib/plans.mjs";
export const dynamic="force-dynamic";
export const maxDuration=60;
export async function POST(request){
 const raw=await request.text();if(raw.length>1000000)return json({message:'Payload too large'},413);
 let stripe,event;
 try{const claimedMode=JSON.parse(raw).livemode;if(typeof claimedMode!=='boolean')throw new Error('Missing mode');
 // Mode is untrusted until this mode-specific signing secret authenticates the event.
 stripe=stripeClient(claimedMode?'live':'test');const config=await bridge('config',{livemode:claimedMode});event=stripe.webhooks.constructEvent(raw,request.headers.get('stripe-signature'),config.webhookSecret);if(event.livemode!==claimedMode)throw new Error('Mode mismatch');}catch{return json({message:'Invalid webhook signature or configuration'},400);}
 try{
 const obj=event.data.object;
 let id=event.type.startsWith('customer.subscription.')?obj.id:obj.subscription||obj.parent?.subscription_details?.subscription;
 if(!id)return json({received:true});
 if(typeof id!=='string')id=id.id;
 // Read current Stripe state so a delayed older event cannot reactivate a cancelled subscription.
 const s=await stripe.subscriptions.retrieve(id);const plan=verifiedPlan(s);
 if(!plan||!s.metadata?.app_user_id)return json({received:true,ignored:true});
 const period=s.current_period_end||s.items.data[0]?.current_period_end;
 if(!period)throw new Error('Missing billing period');
 await bridge('subscription',{id:s.id,userId:s.metadata.app_user_id,customerId:typeof s.customer==='string'?s.customer:s.customer.id,plan,status:s.status,periodEnd:new Date(period*1000).toISOString(),livemode:s.livemode,eventCreated:event.created});
 return json({received:true});
 }catch{return json({message:'Unable to update subscription; retry delivery.'},503);}
}

