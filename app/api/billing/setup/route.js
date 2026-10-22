import {billingAuth,usage,bridge,stripeClient,json} from "../../../../lib/billing";
import {APP_ORIGIN} from "../../../../lib/metricool-oauth.mjs";
export const dynamic="force-dynamic";
export async function POST(request){let auth;try{auth=await billingAuth(request,true);}catch{return json({message:'Please sign in.'},401);}
 try{
 if(!(await usage(auth)).owner)return json({message:'Owner access required.'},403);
 const key=process.env.STRIPE_SECRET_KEY||'';
 if(!key.startsWith('sk_test_')&&!key.startsWith('rk_test_'))return json({message:'Add a Stripe TEST secret key to STRIPE_SECRET_KEY in Vercel before testing. Live payments remain closed.',needsTestKey:true},409);
 const stripe=stripeClient(),config=await bridge('config');
 if(!config.webhookSecret){
 const hooks=await stripe.webhookEndpoints.list({limit:100});
 if(hooks.data.some(h=>h.url===`${APP_ORIGIN}/api/billing/webhook`))return json({message:'A webhook already exists. Configure its signing secret securely before continuing.'},409);
 const h=await stripe.webhookEndpoints.create({url:`${APP_ORIGIN}/api/billing/webhook`,enabled_events:['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_failed'],description:'Music Promotion Secretary subscription verification'});
 await bridge('set_hook',{secret:h.secret});
 }
 if(!config.portalConfiguration){
 const portal=await stripe.billingPortal.configurations.create({business_profile:{headline:'Manage your music promotion subscription'},features:{customer_update:{enabled:true,allowed_updates:['email']},invoice_history:{enabled:true},payment_method_update:{enabled:true},subscription_cancel:{enabled:true,mode:'at_period_end'}}});
 await bridge('set_portal',{id:portal.id});
 }
 return json({message:'Stripe test billing is ready. Choose a test plan below. Test subscriptions do not spend real money or grant subscriber publishing.',ready:true});
 }catch{return json({message:'Stripe test setup could not finish. Check the test API key permissions and try again.'},503);}}
