'use client';
import {useEffect,useState} from 'react';
import {supabase,emailReturnUrl} from '../../lib/supabaseClient';
import {emailReturnDestination} from '../../lib/email-return.mjs';
export default function HomeEmailReturn({children}){
 const [checking,setChecking]=useState(true);
 useEffect(()=>{let active=true;
 emailReturnDestination(supabase?.auth,emailReturnUrl||window.location.href).then(destination=>{
  if(!active)return;
  if(destination)window.location.replace(destination);
  else setChecking(false);
 });
 return()=>{active=false;};},[]);
 return checking?<p role="status">Completing your secure sign-in…</p>:children;
}
