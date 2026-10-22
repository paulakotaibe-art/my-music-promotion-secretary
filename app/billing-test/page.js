"use client";
import {useState} from "react";
import {supabase} from "../../lib/supabaseClient";
import {PLANS} from "../../lib/plans.mjs";
export default function BillingTest(){const[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function call(path,body={}){setBusy(true);setMessage('');try{const{data:{session}}=await supabase.auth.getSession();if(!session){window.location.assign('/login');return;}
 const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});const d=await r.json();setMessage(d.message||d.error||'');if(d.ready)setReady(true);if(d.url)window.location.assign(d.url);}catch{setMessage('The check did not finish. Please retry.');}finally{setBusy(false);}}
 return <main className="container"><section className="hero"><h1>Owner: Stripe payment test</h1><p>This checks Stripe in test mode. Your owner publishing access and queued campaign are unchanged.</p><button disabled={busy} className="button" onClick={()=>call('/api/billing/setup')}>Prepare secure payment test</button>{message&&<p role="status">{message}</p>}{ready&&<><p>Choose one plan. On Stripe’s test checkout, use test card 4242 4242 4242 4242, any future expiry and any three-digit CVC. Do not enter real card details.</p>{Object.entries(PLANS).map(([id,p])=><p key={id}><button disabled={busy} onClick={()=>call('/api/create-checkout-session',{plan:id,test:true})}>Test {p.name} · £{(p.pence/100).toFixed(2)}/month</button></p>)}</>}<p><a href="/dashboard">Return to dashboard</a></p></section></main>;
}
