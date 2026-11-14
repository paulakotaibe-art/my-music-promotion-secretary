'use client';
import {useEffect,useState} from 'react';
import {supabase} from '../../lib/supabaseClient';

export default function UpdatePassword(){
 const [email,setEmail]=useState('');
 const [account,setAccount]=useState('');
 const [checking,setChecking]=useState(true);
 const [password,setPassword]=useState('');
 const [confirmation,setConfirmation]=useState('');
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [done,setDone]=useState(false);
 useEffect(()=>{
  let mounted=true;
  if(!supabase){setChecking(false);setMessage('Password service is unavailable. Please contact support.');return;}
  // getUser waits for the SDK to process the recovery session and verifies it with Auth.
  supabase.auth.getUser().then(({data,error})=>{
   if(mounted){setAccount(!error?data?.user?.email||'':'');setChecking(false);}
  }).catch(()=>{if(mounted)setChecking(false);});
  return ()=>{mounted=false;};
 },[]);
 async function requestReset(event){
  event.preventDefault();if(busy||!supabase)return;
  setBusy(true);setMessage('');
  try{
   // The existing allowed Site URL is used; Home forwards recovery fragments locally.
   const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{
    redirectTo:'https://my-music-promotion-secretary-x96x.vercel.app/'
   });
   if(error)throw error;
   setMessage('If this address has an app account, a recovery email has been requested. Open the newest email and follow its link. Check Spam too.');
  }catch{setMessage('Unable to request a recovery email right now. Please wait and try again or contact support.');}
  finally{setBusy(false);}
 }
 async function save(event){
  event.preventDefault();if(busy||!supabase)return;
  if(password.length<12){setMessage('Use at least 12 characters.');return;}
  if(password!==confirmation){setMessage('The two passwords must match.');return;}
  setBusy(true);setMessage('');
  try{
   const {data:verified,error:verifyError}=await supabase.auth.getUser();
   if(verifyError||!verified?.user?.email||verified.user.email!==account){
    setAccount('');throw Error('session');
   }
   const {error}=await supabase.auth.updateUser({password});
   if(error)throw error;
   setPassword('');setConfirmation('');setDone(true);
   setMessage('Your app password has been changed. Your email inbox password has not changed.');
   await supabase.auth.signOut({scope:'local'});
  }catch{
   setPassword('');setConfirmation('');
   setMessage('Unable to change the password. The recovery link may have expired, or the password may not meet the account requirements. Request a new email or contact support.');
  }finally{setBusy(false);}
 }
 return <main className="container studio-ui"><section className="hero dashboard-shell">
  <span className="studio-eyebrow">MUSIC PROMOTION SECRETARY</span>
  <h1>Reset your app password</h1>
  <p>This changes your Music Promotion Secretary login only. It does not change your Yahoo, Google or Facebook password.</p>
  {checking?<p role="status">Checking your secure session…</p>:done?
   <p><a className="button" href="/review-login">Sign in with your new app password</a></p>:account?
   <><p>App account: <strong>{account}</strong></p>
    <p>Use a password unique to this app. For a dedicated review account, use an easy-to-type phrase of at least 12 characters.</p>
    <form className="studio-form" onSubmit={save}>
     <label>New app password<input type="password" autoComplete="new-password" required minLength={12} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label>
     <label>Confirm new app password<input type="password" autoComplete="new-password" required minLength={12} value={confirmation} onChange={e=>setConfirmation(e.target.value)} disabled={busy}/></label>
     <button className="button" disabled={busy}>{busy?'Saving…':'Save new app password'}</button>
    </form></>:
   <><p>Open a fresh password-recovery email to set a new password. You can request one below.</p>
    <form className="studio-form" onSubmit={requestReset}>
     <label>App account email<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/></label>
     <button className="button" disabled={busy||!supabase}>{busy?'Requesting…':'Send recovery email'}</button>
    </form></>}
  {message&&<p role="status" aria-live="polite">{message}</p>}
  <p><a href="/review-login">App sign in</a> · <a href="/support">Support</a> · <a href="/">Home</a></p>
 </section></main>;
}
