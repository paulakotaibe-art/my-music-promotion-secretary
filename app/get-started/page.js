'use client';
import {useEffect,useState} from 'react';
import {supabase} from '../../lib/supabaseClient';
export default function GetStarted(){
 const[data,setData]=useState(null),[billing,setBilling]=useState(null),[busy,setBusy]=useState(true),[message,setMessage]=useState(''),[signedIn,setSignedIn]=useState(false);
 async function load(){setBusy(true);setMessage('');setData(null);try{
 if(!supabase)throw Error('Account access is temporarily unavailable.');
 const {data:{session}}=await supabase.auth.getSession();setSignedIn(!!session);if(!session){setMessage('Sign in to see your personal setup progress.');return;}
 const [readiness,status]=await Promise.all([fetch('/api/publishing/readiness',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store',signal:AbortSignal.timeout(15000)}),fetch('/api/billing/status',{cache:'no-store',signal:AbortSignal.timeout(15000)})]);
 const [r,b]=await Promise.all([readiness.json(),status.json()]);if(!readiness.ok)throw Error(r.message||'Unable to check your account.');setData(r);setBilling(b);
 }catch(e){setMessage(e.message||'Please try again later.');}finally{setBusy(false);}}
 useEffect(()=>{load();},[]);
 const ready=data?.channels.filter(c=>c.ready)||[];
 return <main className="container studio-ui"><section className="hero dashboard-shell"><header className="studio-header"><div><span className="studio-eyebrow">ARTIST ACCOUNT SETUP</span><h1>Your next step is clear.</h1><p>Check your access, connect your own accounts, then prepare your first release.</p></div><a href="/dashboard">Dashboard →</a></header>
 {message&&<p role="status" className="activity-message">{message}</p>}{busy&&<p role="status">Checking your setup…</p>}
 {!busy&&!signedIn&&<p><a className="button" href="/login?next=%2Fget-started">Sign in</a> · <a href="/join">Register</a></p>}
 {data&&<><section className={'activity-panel '+(ready.length?'activity-ready':'activity-waiting')}><strong>{data.owner?'Your owner access is separate from subscriptions':ready.length?'Your available publishing studios':'Customer publishing is still in preparation'}</strong><p>{data.allowanceText}</p>{!data.owner&&!billing?.paidLaunchOpen&&<p>Paid enrolment is closed. Connecting an account does not charge you or activate publishing.</p>}</section>
 <div className="upload-grid"><section className="upload-panel"><h2>1. Account registered</h2><p>You are signed in. Each artist uses their own account and social connections.</p><a href="/publishing-status">Check your account and allowance</a></section>
 <section className="upload-panel"><h2>2. Review your access</h2><p>{data.owner?'Your owner account has unlimited promotions.':`Current access: ${data.plan||'trial'}. A chosen plan or checkout return is not proof of payment; access follows server verification.`}</p><a href="/pricing">{billing?.paidLaunchOpen?'View subscription plans':'Preview launch plans'}</a><p><a href="/dashboard">Manage an existing subscription in your dashboard</a></p></section></div>
 <h2>3. Connect your publishing accounts</h2><p>Choose a platform below. A saved connection does not mean public publishing has been approved. Facebook requires a Page you manage; personal-profile posting is not included.</p>
 <div className="upload-grid">{data.channels.map(c=><section key={c.provider} className="upload-panel"><h3>{c.name}</h3><p>{c.reason}</p><ol>{c.steps.map(s=><li key={s.label}>{s.complete?'Complete: ':'Still needed: '}{s.label}</li>)}</ol><a href={c.href}>{c.connected?'Manage '+c.name+' connection':'Connect '+c.name}</a>{c.ready&&c.studio&&<p><a className="button" href={c.studio}>Open {c.name} studio</a></p>}</section>)}</div>
 <section className="upload-panel"><h2>4. Prepare and publish</h2><p>Upload an MP4 in the dashboard and save a draft. Open an available studio, choose the video and settings, and review the destination before publishing.</p><p>Saved drafts and uploaded videos are not confirmed posts. Check the platform result after submission. TikTok private-pilot access does not allow public posting.</p><a href="/dashboard">Prepare your media</a>{!ready.length&&<p><a href="/publishing-status">Check what is still required</a></p>}</section></>}
 {signedIn&&<button disabled={busy} onClick={load}>{busy?'Checking…':'Refresh setup progress'}</button>}<p><a href="/help">Publishing help</a></p></section></main>;
}
