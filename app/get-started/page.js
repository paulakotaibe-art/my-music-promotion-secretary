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
 const facebook=data?.channels.find(c=>c.provider==='facebook');
 return <main className="container studio-ui"><section className="hero dashboard-shell"><header className="studio-header"><div><span className="studio-eyebrow">ARTIST ACCOUNT SETUP</span><h1>Your next step is clear.</h1><p>Register, check your access, connect your Page, then prepare your first release.</p></div><a href="/dashboard">Dashboard →</a></header>
 {message&&<p role="status" className="activity-message">{message}</p>}{busy&&<p role="status">Checking your setup…</p>}
 {!busy&&!signedIn&&<p><a className="button" href="/login?next=%2Fget-started">Sign in</a> · <a href="/join">Register</a></p>}
 {data&&<><section className={'activity-panel '+(facebook?.ready?'activity-ready':'activity-waiting')}><strong>{data.owner?'Your owner access is separate from subscriptions':facebook?.ready?'Your Facebook studio is available':'Customer publishing is still in preparation'}</strong><p>{data.allowanceText}</p><p>{facebook?.reason}</p>{!data.owner&&!billing?.paidLaunchOpen&&<p>Paid enrolment is closed. Connecting a Page does not charge you or activate publishing.</p>}</section>
 <div className="upload-grid"><section className="upload-panel"><h2>1. Account registered</h2><p>You are signed in. Each artist uses their own account and social connections.</p><a href="/publishing-status">Check your account and allowance</a></section>
 <section className="upload-panel"><h2>2. Review your access</h2><p>{data.owner?'Your owner account has unlimited promotions.':`Current access: ${data.plan||'trial'}. A chosen plan or checkout return is not proof of payment; access follows server verification.`}</p><a href="/pricing">{billing?.paidLaunchOpen?'View subscription plans':'Preview launch plans'}</a><p><a href="/dashboard">Manage an existing subscription in your dashboard</a></p></section>
 <section className="upload-panel"><h2>3. Connect your Facebook Page</h2><p>{facebook?.connected?(facebook.pageSelected?'Your account and Page selection are saved.':'Your account is connected. Choose the Page you can publish to.'):'Sign in to Facebook and choose a Page you manage. Personal-profile posting is not included.'}</p><a href="/social-connections">{facebook?.connected?'Check or choose your Page':'Connect Facebook'}</a></section>
 <section className="upload-panel"><h2>4. Prepare and publish</h2><p>Save your MP4 video in the dashboard. In your Facebook studio, prepare it, wait for processing, review the destination and release time, then click Publish.</p><p>Saved drafts and prepared videos are not public posts. Check the final status and public link after release.</p><a href="/dashboard">Prepare your media</a>{facebook?.ready?<p><a className="button" href="/facebook">Open Facebook studio</a></p>:<p><a href="/publishing-status">Check what is still required</a></p>}</section></div></>}
 {signedIn&&<button disabled={busy} onClick={load}>{busy?'Checking…':'Refresh setup progress'}</button>}<p><a href="/help">Publishing help</a></p></section></main>;
}
