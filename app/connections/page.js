'use client';
import {useEffect,useState} from 'react';
import {supabase} from '../../lib/supabaseClient';
export default function Connections(){
 const [data,setData]=useState(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[result,setResult]=useState('');
 async function api(path,method='GET'){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session){window.location.assign('/login');throw Error('Please sign in, then open Connected channels.');}
 const r=await fetch(path,{method,headers:{Authorization:'Bearer '+session.access_token},cache:'no-store',signal:AbortSignal.timeout(20000)});
 const d=await r.json();if(!r.ok)throw Error(d.message || 'Please try again.');return d;
 }
 async function load(){setBusy(true);setError('');try{setData(await api('/api/integrations/youtube/connection'));}catch(e){setError(e.message);}finally{setBusy(false);}}
 useEffect(()=>{const q=new URL(window.location.href),r=q.searchParams.get('youtube');if(r)setResult(r);q.searchParams.delete('youtube');window.history.replaceState(null,'',q.pathname+q.search+q.hash);load();},[]);
 async function connect(){if(busy)return;setBusy(true);setError('');try{const d=await api('/api/integrations/youtube/connect','POST');const url=new URL(d.url);if(url.origin!=='https://accounts.google.com' || url.pathname!=='/o/oauth2/v2/auth')throw Error('Unable to open secure Google sign-in.');window.location.assign(url.href);}catch(e){setError(e.message);setBusy(false);}}
 return <main className="container studio-ui"><section className="hero dashboard-shell"><header className="studio-header"><div><span className="studio-eyebrow">YOUR CONNECTED CHANNELS</span><h1>Connect your YouTube.</h1><p>Choose the Google account that manages your channel. No API keys or technical setup needed.</p></div><a className="studio-nav" href="/dashboard">← Dashboard</a></header>
 {error&&<p className="publish-error" role="alert">{error}</p>}
 {result==='failed'&&<p className="publish-error" role="alert">The connection was not completed. Your previous saved channel, if any, has been kept. Try again and allow both requested YouTube permissions. If Google says access is restricted to testers, contact the app owner.</p>}
 {result==='connected'&&data?.connection&&<p className="activity-message activity-ready" role="status">Your YouTube channel is connected. Check its name below.</p>}
 <section className={'activity-panel '+(data?.connection?'activity-ready':'activity-waiting')} aria-busy={busy}><span className="activity-kicker">YOUTUBE</span><strong>{busy?'Checking connection…':data?.connection?.channel_title || 'Choose your channel'}</strong>
 {data?.connection?<><p>Saved on {new Date(data.connection.connected_at).toLocaleDateString()}. This connection belongs to your app account. Google access can expire or be revoked.</p><p><a href={'https://www.youtube.com/channel/'+encodeURIComponent(data.connection.channel_id)} target="_blank" rel="noopener noreferrer">View connected channel ↗</a></p></>:<p>Sign in with Google, choose the channel you manage, and approve the requested permissions. You will return here when finished.</p>}
 <button className="button" disabled={busy || !data?.available} onClick={connect}>{busy?'Please wait…':data?.connection?'Reconnect or change channel':'Connect YouTube with Google'}</button>{' '}<button disabled={busy} onClick={load}>Refresh connection</button>
 {data&&!data.available&&<p>YouTube connection is temporarily unavailable. Please try again later.</p>}
 </section><section className="activity-panel activity-waiting"><strong>Connection first. Publishing comes next.</strong><p>Connecting does not upload or publish any video and does not use a promotion allowance. Subscriber publishing is still being prepared. The owner upload pilot remains separate.</p><p>During testing, Google may allow only approved test accounts. Public subscriber onboarding requires the app's Google verification and publishing checks to be completed.</p></section>
 <p><a href="/social-connections">Facebook and TikTok connections →</a></p><p>To remove Google access, use <a href="https://myaccount.google.com/connections" target="_blank" rel="noopener noreferrer">your Google account connections</a>. Reconnecting replaces only the channel saved for your app account.</p>
 </section></main>;
}
