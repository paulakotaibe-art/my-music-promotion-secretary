'use client';
import {useEffect,useState} from 'react';
import {supabase} from '../../lib/supabaseClient';
const origin='https://my-music-promotion-secretary-x96x.vercel.app';
export default function PublishingSetup(){
 const [setup,setSetup]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function request(path,method='GET'){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){window.location.assign('/login');throw Error('Please sign in, then return to publishing setup.');}
  const response=await fetch(path,{method,headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store',signal:AbortSignal.timeout(20000)});
  const data=await response.json();if(!response.ok)throw Error(data.message || 'Unable to finish this request.');return data;
 }
 async function load(){setBusy(true);setMessage('');try{setSetup(await request('/api/publishing/setup'));}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 useEffect(()=>{load().then(()=>{const result=new URLSearchParams(window.location.search).get('youtube');if(result==='failed')setMessage('Google authorization did not finish. Check the client settings, test user and both permissions, then retry.');if(result==='connected')setMessage('YouTube authorization was saved. Check the channel below. Direct publishing is not enabled yet.');});},[]);
 async function connect(){setBusy(true);setMessage('');try{const data=await request('/api/integrations/youtube/connect','POST');window.location.assign(data.url);}catch(e){setMessage(e.message);setBusy(false);}}
 return <main className="container"><section className="hero"><h1>Owner: direct publishing setup</h1>
 <p>Start with the YouTube connection. The owner upload pilot is available below. A connected account does not mean subscriber publishing is ready.</p>
 {message&&<p role="alert">{message}</p>}
 <button className="button" disabled={busy} onClick={load}>{busy?'Checking…':'Refresh setup status'}</button>
 {setup&&<>
 <h2>1. Register the YouTube integration</h2>
 <ol>
 <li><a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener noreferrer">Create or choose a Google Cloud project</a> for My Music Promotion Secretary.</li>
 <li><a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noopener noreferrer">Enable YouTube Data API v3</a> in that project.</li>
 <li><a href="https://console.cloud.google.com/auth/branding" target="_blank" rel="noopener noreferrer">Set up Google Auth Platform</a>: use the app name, your support email and app homepage. Set the audience to External, keep Testing for the pilot, and add the Google account that owns your YouTube channel as a test user.</li>
 <li>In Data Access add <code>youtube.upload</code> and <code>youtube.readonly</code>. Google verification and quota readiness must be checked before subscribers are invited.</li>
 <li><a href="https://console.cloud.google.com/auth/clients" target="_blank" rel="noopener noreferrer">Create an OAuth client</a>, choose Web application, and add this exact Authorized redirect URI:<p style={{overflowWrap:'anywhere'}}><code>{origin}/api/integrations/youtube/callback</code></p></li>
 <li><a href="https://vercel.com/paulakotaibe-2592s-projects/my-music-promotion-secretary-x96x/settings/environment-variables" target="_blank" rel="noopener noreferrer">Save credentials in Vercel</a> for Production: <code>YOUTUBE_CLIENT_ID</code> and <code>YOUTUBE_CLIENT_SECRET</code>. Mark the secret Sensitive. Redeploy after saving. Do not paste secrets into chat.</li>
 </ol>
 <h2>2. Authorize the owner channel</h2>
 <p>Credentials: {setup.youtube.credentialsConfigured?'Present; validity is checked during authorization.':'Not configured.'}</p>
 <p>{setup.youtube.connection?`Saved channel: ${setup.youtube.connection.channel_title}. Authorization may expire or be revoked.`:'No direct YouTube channel has been saved.'}</p>
 <button className="button" disabled={busy || !setup.youtube.credentialsConfigured} onClick={connect}>Authorize YouTube channel</button>
 <p>After Google returns here, refresh the status. A saved channel confirms connection storage only. No video is published by this button.</p>
 <h2>3. Test direct video delivery</h2><p><a href="/youtube-test">Open the direct YouTube upload pilot</a>. Start with a private test. Public scheduling is available only after the private video is verified as processed.</p><h2>4. Finish Facebook and TikTok</h2>
 <p>Next, register the app with <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer">Meta for Developers</a> and <a href="https://developers.tiktok.com/" target="_blank" rel="noopener noreferrer">TikTok for Developers</a>. Their connection and publishing integrations are pending. TikTok public Direct Post requires its audit.</p>
 <h2>5. Prove subscriber publishing</h2>
 <p>After the direct publishing worker and platform permissions are ready, run one ordinary subscriber through upload, scheduling, three working public posts, and one allowance deduction. Paid launch stays closed until that succeeds.</p>
 </>}
 <p><a href="/dashboard">Return to dashboard</a></p>
 </section></main>;
}
