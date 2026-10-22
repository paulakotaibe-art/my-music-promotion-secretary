import {bridge,json} from '../../../../lib/billing';
export const dynamic='force-dynamic';
export async function GET(){
 const key=process.env.STRIPE_SECRET_KEY||'';
 const testMode=key.startsWith('sk_test_')||key.startsWith('rk_test_');
 try{const config=await bridge('config');return json({configured:!!key,testMode,verificationConfigured:!!config.webhookSecret,paidLaunchOpen:!testMode&&config.launch});}
 catch{return json({configured:!!key,testMode,verificationConfigured:false,paidLaunchOpen:false},503);}
}
