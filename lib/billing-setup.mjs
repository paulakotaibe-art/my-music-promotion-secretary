export function setupFailure(error,stage){
 const safe=v=>typeof v==='string'&&/^[A-Za-z0-9_\[\].-]{1,120}$/.test(v)?v:null;
 const code=safe(error?.code)||safe(error?.type)||'unavailable';
 const parameter=safe(error?.param);
 return {stage,code,...(parameter?{parameter}:{}),...(safe(error?.requestId)?{requestId:safe(error.requestId)}:{})};
}
export async function prepareTestBilling({stripe,bridge,origin}){
 let stage='read_configuration';
 try{
 const config=await bridge('config');
 if(!config.webhookSecret){
 stage='find_webhook';const hooks=await stripe.webhookEndpoints.list({limit:100});
 if(hooks.data.some(h=>h.url===`${origin}/api/billing/webhook`))return {status:409,body:{message:'The existing test webhook needs its signing secret. Add its whsec_ value in Vercel as STRIPE_TEST_WEBHOOK_SECRET. Leave existing keys unchanged.'}};
 stage='create_webhook';const h=await stripe.webhookEndpoints.create({url:`${origin}/api/billing/webhook`,enabled_events:['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_failed'],description:'Music Promotion Secretary subscription verification'});
 if(!h.secret)throw new Error('Missing webhook secret');
 stage='save_webhook';await bridge('set_hook',{secret:h.secret});
 }
 let warning=null,diagnostic=null;
 if(!config.portalConfiguration){
 try{
 stage='create_cancellation_portal';
 const portal=await stripe.billingPortal.configurations.create({default_return_url:`${origin}/dashboard`,metadata:{app:'music-promotion-secretary'},features:{invoice_history:{enabled:true},payment_method_update:{enabled:true},subscription_cancel:{enabled:true,mode:'at_period_end'}}},{idempotencyKey:'music-secretary-test-portal-v2'});
 stage='save_cancellation_portal';await bridge('set_portal',{id:portal.id});
 }catch(error){diagnostic=setupFailure(error,stage);warning=`Payment testing can continue. Cancellation portal setup is still pending (${diagnostic.stage}: ${diagnostic.code}${diagnostic.parameter?'; '+diagnostic.parameter:''}).`;}
 }
 return {status:200,body:{ready:true,portalReady:!warning,message:'Stripe test checkout is ready. Choose a test plan below. No real money will be charged.'+(warning?' '+warning:''),...(diagnostic?{diagnostic}:{})}};
 }catch(error){const diagnostic=setupFailure(error,stage);return {status:503,body:{message:`Test setup stopped at ${diagnostic.stage} (${diagnostic.code}${diagnostic.parameter?'; '+diagnostic.parameter:''}). Your saved live key is unchanged.`,diagnostic}};}
}
