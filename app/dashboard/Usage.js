"use client";
import {useCallback,useEffect,useState,useRef} from "react";
import {supabase} from "../../lib/supabaseClient";
import {withDeadline} from "../../lib/deadline.mjs";
import {PLANS} from "../../lib/plans.mjs";
export default function Usage({at,refreshKey}){
 const [subscriptions,setSubscriptions]=useState(null),[confirmId,setConfirmId]=useState(null),[billingNotice,setBillingNotice]=useState('');
 const billingRef=useRef(null);
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{setError('');try{
 const {data:{session}}=await withDeadline(()=>supabase.auth.getSession(),8000,'Sign-in check timed out.');if(!session)throw new Error('Please sign in again.');
 const r=await fetch(`/api/billing/usage${at?`?at=${encodeURIComponent(at)}`:''}`,{headers:{Authorization:`Bearer ${session.access_token}`},signal:AbortSignal.timeout(12000),cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.message);setData(d);
 }catch(e){setData(null);setError(e.message||'Unable to load usage.');}},[at]);
 useEffect(()=>{load();},[load,refreshKey]);
 async function billingRequest(body){
 const {data:{session}}=await withDeadline(()=>supabase.auth.getSession(),8000,'Sign-in check timed out.');if(!session)throw new Error('Please sign in again.');
 const r=await fetch('/api/billing/subscription',{method:body?'POST':'GET',headers:{Authorization:`Bearer ${session.access_token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000),cache:'no-store'});const result=await r.json();if(!r.ok)throw new Error(result.message);return result;
 }
 async function manage(){setBusy(true);setError('');setBillingNotice('');try{const result=await billingRequest();setSubscriptions(result.subscriptions);setConfirmId(null);}catch(e){setError(e.message||'Unable to load subscription.');}finally{setBusy(false);}}
 async function cancelRenewal(id){setBusy(true);setError('');try{const result=await billingRequest({action:'cancel_renewal',subscriptionId:id,confirmed:true});setSubscriptions(items=>items.map(s=>s.id===id?result.subscription:s));setConfirmId(null);setBillingNotice(result.message);load();}catch(e){setError(e.message);}finally{setBusy(false);}}
 useEffect(()=>{if(subscriptions||error||billingNotice){billingRef.current?.focus();billingRef.current?.scrollIntoView({behavior:'smooth',block:'center'});}},[subscriptions,error,billingNotice]);

 return <aside className="usage-card" aria-label="Promotion allowance"><h3>{data?.owner?'Owner access':PLANS[data?.plan]?.name||'Your promotion allowance'}</h3>
 {data?.owner?<p>No subscriber allowance applies to your posts. Your existing queued campaign remains separate.</p>:data&&<><p className="usage-number" role="status" aria-live="polite">{data.remaining} of {data.limit} {data.plan==='trial'?'trial':'weekly'} promotions remaining</p><progress max={data.limit || 1} value={Math.min(data.limit || 0,data.used || 0)} aria-label="Promotions used this period" style={{width:"100%"}}/><p>{data.queued} of {data.queueLimit} scheduled promotions in your queue.</p>{data.weekStart&&<small>Publication week: {new Date(data.weekStart).toLocaleDateString('en-GB',{timeZone:'Europe/London'})} – {new Date(new Date(data.weekEnd).getTime()-1).toLocaleDateString('en-GB',{timeZone:'Europe/London'})}. Weeks run Monday–Sunday, London time.</small>}{data.reason&&<p>{data.reason}</p>}{data.testSubscription&&<p>Stripe test subscription verified. Test payments do not activate live publishing.</p>}<p><a href="/pricing">View plans</a> · <button type="button" onClick={manage} disabled={busy}>{busy?'Opening…':'Manage subscription'}</button></p></>}
 {!data&&!error&&<p>Checking your allowance…</p>}<button type="button" onClick={load}>Refresh usage</button>{data?.owner&&data.testSubscription&&<p>Stripe test subscription verified. <button type="button" onClick={manage} disabled={busy}>{busy?'Opening…':'Manage test subscription'}</button></p>}{data?.owner&&<p><a href="/billing-test">Open Stripe payment test</a></p>}
 <section ref={billingRef} tabIndex={-1} aria-label="Subscription management">
 {busy&&<p role="status">Checking with Stripe…</p>}{error&&<p role="alert">{error}</p>}{billingNotice&&<p role="status">{billingNotice}</p>}
 {subscriptions&&<><h4>Your subscriptions</h4>{subscriptions.length===0&&<p>No subscriptions found.</p>}{subscriptions.map(s=><div key={s.id}><p><strong>{s.name}</strong> · {s.test?'Test mode · ':''}{s.status}</p><p>{s.cancelAtPeriodEnd?'Renewal cancelled. Current period ends: ':'Current period ends: '}{new Date(s.endsAt).toLocaleString('en-GB',{timeZone:'Europe/London'})} (London time)</p>{!s.cancelAtPeriodEnd&&['active','trialing','past_due'].includes(s.status)&&(confirmId===s.id?<div><p>Cancel renewal? Access will remain until the current period ends. {data?.owner?'Your owner access is separate.':''}</p><button type="button" disabled={busy} onClick={()=>cancelRenewal(s.id)}>Yes, cancel renewal</button> <button type="button" disabled={busy} onClick={()=>setConfirmId(null)}>Keep subscription</button></div>:<button type="button" disabled={busy} onClick={()=>setConfirmId(s.id)}>Cancel renewal</button>)}</div>)}</>}
 </section>
 <p><a href="/publishing-status">Check your channels and publishing access →</a></p><small>Drafts do not use your allowance. Unconfirmed submissions stay reserved until checked. Platform availability is shown on your publishing status page.</small></aside>;
}

