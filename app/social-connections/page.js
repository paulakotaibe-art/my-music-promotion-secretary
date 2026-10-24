'use client';
import {useEffect,useState} from 'react';
import {supabase} from '../../lib/supabaseClient';
const providers=['facebook','tiktok'];
const connectionErrors={session:'The connection session expired or could not be verified. Start Connect Facebook again and finish within 10 minutes.',consent:'Authorization was cancelled or did not return a code. Please reconnect.',signin:'Your app sign-in expired. Sign in again before connecting.',provider:'Facebook or TikTok rejected the server verification. The app owner needs to check the platform credentials and server diagnostic code.',storage:'Authorization returned, but the app could not save the connection. The app owner needs to check connection storage.',permissions:'Required Page permissions were not granted. Reconnect and allow the three requested Page permissions.',page_access:'No authorized Page with content publishing access was returned. Check that your Facebook account can create content on the selected Page.',page_list:'The app could not retrieve the complete Page list. The app owner needs to check Page access.'};
export default function SocialConnections(){
 const [data,setData]=useState({}),[busy,setBusy]=useState(''),[message,setMessage]=useState('');
 async function api(provider,body){
 const {data:{session}}=await supabase.auth.getSession();if(!session){window.location.assign('/login');throw Error('Please sign in.');}
 const r=await fetch('/api/integrations/social/'+provider,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+session.access_token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(20000)});
 const d=await r.json();if(!r.ok)throw Error(d.message||'Unable to finish.');return d;
 }
 async function load(){setBusy('loading');try{const results=await Promise.all(providers.map(p=>api(p)));setData(Object.fromEntries(results.map(d=>[d.provider,d])));}catch(e){setMessage(e.message);}finally{setBusy('');}}
 useEffect(()=>{const u=new URL(window.location.href);if(u.searchParams.get('result'))setMessage(u.searchParams.get('result')==='connected'?'Account authorization saved. Select your Facebook Page below if applicable.':(connectionErrors[u.searchParams.get('reason')]||'Authorization was not completed. Your previous connection has been kept.'));window.history.replaceState(null,'','/social-connections');load();},[]);
 async function action(provider,body){setBusy(provider);setMessage('');try{const d=await api(provider,body);if(d.url){const u=new URL(d.url);if(!['https://www.facebook.com','https://www.tiktok.com'].includes(u.origin))throw Error('Invalid authorization destination');window.location.assign(u.href);}else{setMessage(d.message);await load();}}catch(e){setMessage(e.message);}finally{setBusy('');}}
 return <main className="container studio-ui"><section className="hero dashboard-shell"><header className="studio-header"><div><span className="studio-eyebrow">CONNECTED CHANNELS</span><h1>Your next platforms.</h1><p>Connect accounts you manage. Each connection belongs to your app account.</p></div><a href="/connections">YouTube connection →</a></header>
 <section className="activity-panel activity-waiting"><strong>Facebook and TikTok are in setup</strong><p>These connections do not publish or schedule posts yet. Registration, platform approvals and live testing are still required. No promotion credit is used by connecting an account.</p></section>
 {message&&<p role="status" className="activity-message">{message}</p>}
 <div className="upload-grid">{providers.map(p=><section className="upload-panel" key={p}><h2>{p==='facebook'?'Facebook Pages':'TikTok'}</h2><p>{data[p]?.connection?'Connected account: '+data[p].connection.name:'No account connected.'}</p>
 <button className="button" disabled={!!busy||!data[p]?.configured} onClick={()=>action(p,{action:'connect'})}>{busy===p?'Connecting…':data[p]?.connection?'Reconnect':'Connect '+(p==='facebook'?'Facebook':'TikTok')}</button>
 {data[p]&&!data[p].configured&&<p>The app owner must finish developer registration before this button is available.</p>}
 {p==='facebook'&&data[p]?.connection&&<label>Page to publish to<select disabled={!!busy} value={data[p].connection.selectedPage?.id||''} onChange={e=>action(p,{action:'selectPage',pageId:e.target.value})}><option value="">Choose your Page</option>{data[p].connection.pages.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
 <p>{p==='facebook'?'Connect a Page you can create content for. Personal-profile publishing is not included.':'Public Direct Post requires TikTok approval and an audit. Private pilot restrictions may apply.'}</p>
 </section>)}</div><button disabled={!!busy} onClick={load}>{busy==='loading'?'Checking…':'Refresh connections'}</button><p><a href="/dashboard">← Dashboard</a></p>
 </section></main>;
}
