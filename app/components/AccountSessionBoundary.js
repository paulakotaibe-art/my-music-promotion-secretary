'use client';
import {useEffect,useRef,useState} from 'react';
import {supabase} from '../../lib/supabaseClient';
import {accountChanged} from '../../lib/account-session.mjs';

const accountPages=new Set(['/dashboard','/connections','/social-connections','/get-started','/publishing-status','/youtube-test','/facebook','/facebook-test','/tiktok','/billing-test','/publishing-setup']);
export default function AccountSessionBoundary({children}){
 const userId=useRef(null),[changing,setChanging]=useState(false);
 useEffect(()=>{
  if(!supabase)return;
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
   // No Auth calls here: callbacks run while the SDK holds its session lock.
   if(accountChanged(event,session,userId.current)&&accountPages.has(window.location.pathname)){
    setChanging(true);window.location.replace('/login');return;
   }
   userId.current=session?.user?.id||null;
  });
  return()=>subscription.unsubscribe();
 },[]);
 return changing?<main id="main-content" tabIndex={-1} className="container studio-ui"><section className="hero"><h1>Returning to sign-in</h1><p role="status">Your account session changed.</p><a href="/login">Continue to sign-in</a></section></main>:children;
}
