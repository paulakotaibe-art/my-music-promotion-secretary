import {createClient} from '@supabase/supabase-js';
import {unseal} from '../../../../lib/metricool-oauth.mjs';
import {signResult,verifyResult} from '../../../../lib/scheduling.mjs';
import {facebookCall,selectedFacebookPage} from '../../../../lib/facebook-upload.mjs';
import {validDispatchReceipt,dispatchFacebookVideo} from '../../../../lib/facebook-dispatch.mjs';
export const dynamic='force-dynamic';export const maxDuration=60;
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(request){
 let nonce;try{const raw=await request.text();if(raw.length>200)throw Error();nonce=JSON.parse(raw).nonce;if(!/^[a-f0-9]{64}$/.test(nonce||''))throw Error();}catch{return json({message:'Invalid dispatch authentication.'},403);}
 const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:jobs,error}=await client.rpc('claim_facebook_dispatch',{p_nonce:nonce});
 if(error||!Array.isArray(jobs))return json({message:'Invalid dispatch authentication.'},403);
 let completed=0;const signal=AbortSignal.timeout(45000);
 for(const job of jobs){
  const r=job.release;let o={id:r.id,userId:r.user_id,uploadId:r.upload_id,pageId:r.page_id,videoId:r.video_id,mode:'scheduled',publishAt:r.publish_at,appManaged:true,state:'unconfirmed',verified:false};
  try{
   if(!validDispatchReceipt(r,verifyResult))throw Error('Schedule receipt could not be verified.');
   const saved=unseal(job.connection),page=selectedFacebookPage({...saved,selectedPage:{id:r.page_id}}),call=facebookCall(page,process.env,fetch,signal);
   o={...o,...await dispatchFacebookVideo(call,r),checkedAt:new Date().toISOString()};
  }catch(e){o={...o,writeAttempted:e.writeAttempted===true,requestAcknowledged:e.requestAcknowledged===true,checkedAt:new Date().toISOString(),...(Number.isInteger(e.providerCode)?{providerErrorCode:e.providerCode}:{})};}
  const {data:finished,error:saveError}=await client.rpc('finish_facebook_dispatch',{p_id:r.id,p_token:job.runToken,p_outcome:o,p_signature:signResult(o)});
  if(!saveError&&finished)completed++;
 }
 return json({claimed:jobs.length,completed});
}
