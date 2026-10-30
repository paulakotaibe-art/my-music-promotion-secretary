'use client';
import {useEffect,useState} from 'react';
import {supabase} from '../../lib/supabaseClient';
import {ENROLMENT_INTENT_KEY,enrolmentIntent} from '../../lib/enrolment.mjs';
export default function EmailAccess({register=false}){
 const[email,setEmail]=useState(''),[sending,setSending]=useState(false),[message,setMessage]=useState(''),[cooldown,setCooldown]=useState(0),[registrationOpen,setRegistrationOpen]=useState(false),[checking,setChecking]=useState(register),[signedIn,setSignedIn]=useState(false),[accepted,setAccepted]=useState(false);
 useEffect(()=>{let active=true;
 if(new URL(window.location.href).searchParams.get('notice')==='link')setMessage('That email link could not sign you in. It may have expired or already been used. Request one new link below.');
 if(supabase)supabase.auth.getSession().then(({data})=>{if(active)setSignedIn(!!data?.session);}).catch(()=>{});
 if(register)fetch('/api/billing/status',{cache:'no-store',signal:AbortSignal.timeout(12000)}).then(r=>r.json()).then(d=>{if(active)setRegistrationOpen(d.paidLaunchOpen===true);}).catch(()=>{}).finally(()=>{if(active)setChecking(false);});
 return()=>{active=false;};},[register]);
 useEffect(()=>{if(cooldown<=0)return;const timer=setTimeout(()=>setCooldown(s=>Math.max(0,s-1)),1000);return()=>clearTimeout(timer);},[cooldown]);
 async function submit(e){e.preventDefault();if(sending||cooldown>0||register&&(!registrationOpen||!accepted))return;setSending(true);setMessage('');
 try{
 if(!supabase)throw Error('Sign-in is temporarily unavailable. Please try later.');
 const params=new URL(window.location.href).searchParams;
 try{localStorage.setItem(ENROLMENT_INTENT_KEY,enrolmentIntent(params.get('next')||(register?'/get-started':'/dashboard'),params.get('plan')));}catch{}
 const {error}=await supabase.auth.signInWithOtp({email:email.trim(),options:{shouldCreateUser:register,emailRedirectTo:window.location.origin+'/dashboard'}});
 if(error){try{localStorage.removeItem(ENROLMENT_INTENT_KEY);}catch{}if(error.status===429||/rate|too many/i.test(error.message||'')){setCooldown(60);throw Error('Too many email requests. Please wait before trying again. Repeated clicks will not speed up delivery.');}throw Error('We could not send the link. Check your email address and try again later. New artists should use Register.');}
 setCooldown(60);setMessage('Check your inbox and junk folder for your secure link. Open the newest link in the browser and profile where you want to use the app. Opening it on your phone signs in that phone, not your computer.');
 }catch(e){setMessage(e.message||'Unable to send a link. Please try later.');}finally{setSending(false);}
 }
 return <main className="container studio-ui"><section className="hero dashboard-shell"><span className="studio-eyebrow">MUSIC PROMOTION SECRETARY</span><h1>{register?'Create your artist account':'Welcome back'}</h1><p>{register?'Register with an email you can access. No password or payment card is needed to create an account.':'Enter your registered email to receive a secure sign-in link.'}</p>
 {register&&!registrationOpen&&<section className="activity-panel activity-waiting"><strong>{checking?'Checking enrolment availability…':'Customer registration is not open yet'}</strong><p>We are completing customer publishing and payment checks. No payment or subscription is activated here. Existing artists can still sign in and check their setup.</p></section>}
 {signedIn?<p><a className="button" href="/get-started">Continue your account setup</a></p>:<form className="studio-form" onSubmit={submit}><label>Email address<input type="email" autoComplete="email" inputMode="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} disabled={sending||register&&!registrationOpen}/></label>{register&&<label><input type="checkbox" required checked={accepted} onChange={e=>setAccepted(e.target.checked)} disabled={sending||!registrationOpen}/> I agree to the <a href="/terms">Terms of Service</a> and have read the <a href="/privacy">Privacy notice</a>.</label>}<button className="button" disabled={sending||cooldown>0||register&&(!registrationOpen||!accepted)}>{sending?'Sending…':cooldown>0?'Try again in '+cooldown+'s':register?'Send registration link':'Send sign-in link'}</button></form>}
 {message&&<p role="status" className="activity-message">{message}</p>}<p>Keep the email link private. Open it in the same browser profile as this app. Your email account and browser profile can use different addresses. If delivery is delayed, check junk mail before requesting another.</p><p>{register?<a href="/login">Already registered? Sign in</a>:<a href="/join">New artist? Register</a>} · <a href="/pricing">View plans</a> · <a href="/">Home</a></p></section></main>;
}
