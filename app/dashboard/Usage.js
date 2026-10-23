"use client";
import {useCallback,useEffect,useState} from "react";
import {supabase} from "../../lib/supabaseClient";
import {withDeadline} from "../../lib/deadline.mjs";
import {PLANS} from "../../lib/plans.mjs";
export default function Usage({at,refreshKey}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{setError('');try{
 const {data:{session}}=await withDeadline(()=>supabase.auth.getSession(),8000,'Sign-in check timed out.');if(!session)throw new Error('Please sign in again.');
 const r=await fetch(`/api/billing/usage${at?`?at=${encodeURIComponent(at)}`:''}`,{headers:{Authorization:`Bearer ${session.access_token}`},signal:AbortSignal.timeout(12000),cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.message);setData(d);
 }catch(e){setError(e.message||'Unable to load usage.');}},[at]);
 useEffect(()=>{load();},[load,refreshKey]);
 async function manage(){setBusy(true);setError('');try{const{data:{session}}=await supabase.auth.getSession();const r=await fetch('/api/billing/portal',{method:'POST',headers:{Authorization:`Bearer ${session?.access_token}`},signal:AbortSignal.timeout(20000)});const d=await r.json();if(!r.ok)throw new Error(d.message);window.location.assign(d.url);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <aside className="usage-card" aria-label="Promotion allowance"><h3>{data?.owner?'Owner access':PLANS[data?.plan]?.name||'Your promotion allowance'}</h3>
 {data?.owner?<p>No subscriber allowance applies to your posts. Your existing queued campaign remains separate.</p>:data&&<><p className="usage-number">{data.remaining} of {data.limit} {data.plan==='trial'?'trial':'weekly'} promotions remaining</p><p>{data.queued} of {data.queueLimit} scheduled promotions in your queue.</p>{data.weekStart&&<small>Publication week: {new Date(data.weekStart).toLocaleDateString('en-GB',{timeZone:'Europe/London'})} – {new Date(new Date(data.weekEnd).getTime()-1).toLocaleDateString('en-GB',{timeZone:'Europe/London'})}. Weeks run Monday–Sunday, London time.</small>}{data.reason&&<p>{data.reason}</p>}{data.testSubscription&&<p>Stripe test subscription verified. Test payments do not activate live publishing.</p>}<p><a href="/pricing">View plans</a> · <button type="button" onClick={manage} disabled={busy}>Manage subscription</button></p></>}
 {!data&&!error&&<p>Checking your allowance…</p>}{error&&<p role="alert">{error}</p>}<button type="button" onClick={load}>Refresh usage</button>{data?.owner&&data.testSubscription&&<p>Stripe test subscription verified. <button type="button" onClick={manage} disabled={busy}>Manage test subscription</button></p>}{data?.owner&&<p><a href="/billing-test">Open Stripe payment test</a></p>}
 <small>One promotion can go to YouTube, Facebook and TikTok together. Drafts do not use your allowance. Unconfirmed submissions stay reserved until checked.</small></aside>;
}

