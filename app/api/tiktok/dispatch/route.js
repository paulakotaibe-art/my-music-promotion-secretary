import {createClient} from '@supabase/supabase-js';
import {runTiktokJob} from '../../../../lib/tiktok-runner.mjs';
export const dynamic='force-dynamic';export const maxDuration=60;
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(request){
 let nonce;try{const raw=await request.text();if(raw.length>200)throw Error();nonce=JSON.parse(raw).nonce;if(!/^[a-f0-9]{64}$/.test(nonce||''))throw Error();}catch{return json({message:'Invalid dispatch authentication.'},403);}
 const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),{data:jobs,error}=await client.rpc('claim_tiktok_dispatch',{p_nonce:nonce});if(error||!Array.isArray(jobs))return json({message:'Invalid dispatch authentication.'},403);
 const signal=AbortSignal.timeout(45000);let completed=0;for(const job of jobs){const result=await runTiktokJob(client,job,{signal});if(result.saved)completed++;}return json({claimed:jobs.length,completed});
}
