import {billingAuth,bridge,stripeClient,customerFor,json} from "../../../lib/billing";
import {PLANS} from "../../../lib/plans.mjs";
import {APP_ORIGIN} from "../../../lib/metricool-oauth.mjs";
export const dynamic="force-dynamic";
export async function POST(request){
 let auth;try{auth=await billingAuth(request,true);}catch{return json({error:"Please sign in to subscribe."},401);}
 try{
 const {plan,test}=await request.json();const p=PLANS[plan];if(!p)return json({error:"Choose an artist plan."},400);
 const stripe=stripeClient(),config=await bridge('config');
 const isTest=process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')||process.env.STRIPE_SECRET_KEY.startsWith('rk_test_');
 const{data:access,error}=await auth.client.rpc('promotion_usage');if(error)throw new Error('Unable to check account.');
 if(isTest){if(!access.owner||test!==true)return json({error:"Billing is currently in owner test mode."},403);}
 else if(!config.launch)return json({error:"Subscriptions open after publishing setup and payment testing are complete."},503);
 if(!config.webhookSecret)return json({error:"Payment verification must be configured before checkout."},503);
 const customer=await customerFor(stripe,auth.user);
 const existing=await stripe.subscriptions.list({customer,status:'all',limit:100});
 if(existing.data.some(s=>['active','trialing','past_due','unpaid','incomplete','paused'].includes(s.status)))return json({error:"You already have a subscription. Use Manage subscription."},409);
 const claim=await bridge('checkout_claim',{userId:auth.user.id,livemode:!isTest,plan});
 if(claim.id){const previous=await stripe.checkout.sessions.retrieve(claim.id);if(previous.status==='open')return json({url:previous.url,test:isTest});await bridge('checkout_clear',{userId:auth.user.id,livemode:!isTest,nonce:claim.nonce});return json({error:'Your earlier checkout has ended. Choose your plan again.'},409);}
 if(claim.plan!==plan)return json({error:'Checkout is already being prepared for another plan. Please retry that plan.'},409);
 // Both amount and plan are selected from the server catalog, never from client prices.
 const session=await stripe.checkout.sessions.create({mode:'subscription',customer,client_reference_id:auth.user.id,
 line_items:[{quantity:1,price_data:{currency:'gbp',unit_amount:p.pence,tax_behavior:'inclusive',recurring:{interval:'month'},product_data:{name:p.name,metadata:{app_plan:plan}}}}],
 metadata:{app_user_id:auth.user.id,app_plan:plan},subscription_data:{metadata:{app_user_id:auth.user.id,app_plan:plan}},
 success_url:`${APP_ORIGIN}/dashboard?payment=returned`,cancel_url:`${APP_ORIGIN}/pricing?payment=cancelled`},
 {idempotencyKey:`music-checkout-${claim.nonce}`});await bridge('checkout_saved',{userId:auth.user.id,livemode:!isTest,nonce:claim.nonce,id:session.id});return json({url:session.url,test:isTest});
 }catch{return json({error:"Checkout is unavailable. No subscription has been activated. Please retry later."},503);}
}
