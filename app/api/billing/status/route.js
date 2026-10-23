import {bridge,json} from '../../../../lib/billing';
import {billingCredentials,billingMode} from '../../../../lib/billing-mode.mjs';
export const dynamic='force-dynamic';
export async function GET(){
 let mode;try{mode=billingMode();billingCredentials();const config=await bridge('config');return json({configured:true,testMode:mode==='test',verificationConfigured:!!config.webhookSecret,paidLaunchOpen:mode==='live'&&config.launch});}
 catch{return json({configured:false,testMode:mode!=='live',verificationConfigured:false,paidLaunchOpen:false},503);}
}
