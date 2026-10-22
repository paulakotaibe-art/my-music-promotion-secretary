import Stripe from "stripe";
import {createClient} from "@supabase/supabase-js";
import {authenticate} from "./server-auth";
import {APP_ORIGIN} from "./metricool-oauth.mjs";
export const json=(body,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
export function stripeClient(){if(!process.env.STRIPE_SECRET_KEY)throw new Error("Stripe is not configured.");return new Stripe(process.env.STRIPE_SECRET_KEY,{timeout:15000,maxNetworkRetries:1});}
export async function bridge(op,payload={}){
 if(!process.env.BILLING_BRIDGE_TOKEN)throw new Error("Billing is not configured.");
 const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.rpc("billing_bridge",{token:process.env.BILLING_BRIDGE_TOKEN,op,payload});
 if(error)throw new Error("Billing records are temporarily unavailable.");return data;
}
export async function billingAuth(request,mutating=false){
 if(mutating&&request.headers.get('origin')!==APP_ORIGIN)throw new Error('Open billing from the app.');
 return authenticate((request.headers.get('authorization')||'').replace(/^Bearer /,''));
}
export async function usage(auth,at){const{data,error}=await auth.client.rpc('promotion_usage',at?{at_time:at}:{});if(error)throw new Error('Unable to check your promotion allowance.');return data;}
export async function customerFor(stripe,user){
 const livemode=!(process.env.STRIPE_SECRET_KEY||'').includes('_test_');
 let c=await bridge('customer',{userId:user.id,livemode});
 if(c.id)return c.id;
 const customer=await stripe.customers.create({email:user.email,metadata:{app_user_id:user.id}},{idempotencyKey:`music-customer-${user.id}-${livemode}`});
 await bridge('set_customer',{userId:user.id,id:customer.id,livemode});
 c=await bridge('customer',{userId:user.id,livemode});if(!c.id)throw new Error('Unable to save billing customer.');return c.id;
}
