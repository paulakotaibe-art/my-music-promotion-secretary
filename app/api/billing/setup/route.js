import {billingAuth,usage,bridge,stripeClient,json,billingMode} from "../../../../lib/billing";
import {APP_ORIGIN} from "../../../../lib/metricool-oauth.mjs";
import {prepareTestBilling,setupFailure} from "../../../../lib/billing-setup.mjs";
export const dynamic="force-dynamic";
export const maxDuration=60;
export async function POST(request){
 let auth;try{auth=await billingAuth(request,true);}catch{return json({message:'Please sign in.'},401);}
 try{
 if(!(await usage(auth)).owner)return json({message:'Owner access required.'},403);
 if(billingMode()!=='test')return json({message:'Switch BILLING_MODE to test to prepare a payment test. Your live key remains unchanged.'},409);
 const result=await prepareTestBilling({stripe:stripeClient(),bridge,origin:APP_ORIGIN});
 return json(result.body,result.status);
 }catch(error){const diagnostic=setupFailure(error,'account_or_key_check');return json({message:`Unable to start the owner test (${diagnostic.code}). Your live key is unchanged.`,diagnostic},503);}
}
