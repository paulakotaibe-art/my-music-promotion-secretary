'use client';
import {useState} from 'react';
import {supabase} from '../../lib/supabaseClient';

export default function ReviewLogin(){
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 async function submit(event){
  event.preventDefault();
  if(busy)return;
  setBusy(true);setMessage('');
  try{
   if(!supabase)throw Error('unavailable');
   const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
   if(error||!data?.session)throw Error('signin');
   setPassword('');
   window.location.assign('/facebook');
  }catch{
   setPassword('');
   setMessage('Unable to sign in. Check the dedicated review credentials or contact the app operator. No account is created by this form.');
  }finally{setBusy(false);}
 }
 return <main className="container studio-ui"><section className="hero dashboard-shell">
  <span className="studio-eyebrow">MUSIC PROMOTION SECRETARY</span>
  <h1>Review account sign in</h1>
  <p>Use the dedicated app review account supplied by the app operator. Facebook Page connection is a separate step after sign in.</p>
  <form className="studio-form" onSubmit={submit}>
   <label>Email address<input type="email" autoComplete="username" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/></label>
   <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label>
   <button className="button" disabled={busy}>{busy?'Signing in…':'Sign in'}</button>
  </form>
  {message&&<p role="alert" className="activity-message">{message}</p>}
  <p>Signing in does not grant publishing rights. Access is checked for your own account on the server.</p>
  <p><a href="/login">Sign in with an email link</a> · <a href="/privacy">Privacy</a> · <a href="/">Home</a></p>
 </section></main>;
}
