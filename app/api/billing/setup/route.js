import {billingAuth,usage,bridge,stripeClient,json,billingMode} from "../../../../lib/billing";
import {APP_ORIGIN} from "../../../../lib/metricool-oauth.mjs";
export const dynamic="force-dynamic";
export const maxDuration=60;
export async function POST(request){let auth;try{auth=await billingAuth(request,true);}catch{return json({message:'Please sign in.'},401);}
 try{
 if(!(await usage(auth)).owner)return json({message:'Owner access required.'},403);
 if(billingMode()!=='test')return json({message:'Switch BILLING_MODE to test to prepare a payment test. Your live key remains unchanged.',needsTestKey:true},409);
 const stripe=stripeClient(),config=await bridge('config');
 if(!config.webhookSecret){
 const hooks=await stripe.webhookEndpoints.list({limit:100});
 if(hooks.data.some(h=>h.url===`${APP_ORIGIN}/api/billing/webhook`))return json({message:'The existing test webhook needs its signing secret. In Stripe Test mode, open Developers → Webhooks, choose this app’s endpoint, reveal its Signing secret, and add it in Vercel as STRIPE_TEST_WEBHOOK_SECRET. Leave existing keys unchanged.'},409);
 const h=await stripe.webhookEndpoints.create({url:`${APP_ORIGIN}/api/billing/webhook`,enabled_events:['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_failed'],description:'Music Promotion Secretary subscription verification'});
 await bridge('set_hook',{secret:h.secret});
 }
 if(!config.portalConfiguration){
 const portal=await stripe.billingPortal.configurations.create({business_profile:{headline:'Manage your music promotion subscription'},features:{customer_update:{enabled:true,allowed_updates:['email']},invoice_history:{enabled:true},payment_method_update:{enabled:true},subscription_cancel:{enabled:true,mode:'at_period_end'}}});
 await bridge('set_portal',{id:portal.id});
 }
 return json({message:'Stripe test billing is ready. Choose a test plan below. Test subscriptions do not spend real money or grant subscriber publishing.',ready:true});
 }catch{return json({message:'Stripe test setup could not finish. Check the test API key permissions and try again.'},503);}}

