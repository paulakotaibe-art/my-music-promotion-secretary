'use client';
import {useEffect,useState} from 'react';
import Usage from '../dashboard/Usage';
import {supabase} from '../../lib/supabaseClient';
export default function DirectYouTube(){
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[draftId,setDraft]=useState(''),[mode,setMode]=useState('private'),[kids,setKids]=useState(''),[synthetic,setSynthetic]=useState(''),[rights,setRights]=useState(false),[date,setDate]=useState(''),[review,setReview]=useState(false);
 async function api(method='GET',body){
  const {data:{session}}=await supabase.auth.getSession();if(!session)throw Error('Sign in to the app, then return here.');
  const r=await fetch('/api/youtube/uploads',{method,headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(55000)});
  const d=await r.json();if(!r.ok)throw Error(d.message || 'Unable to finish.');return d;
 }
 async function load(){setBusy(true);try{setData(await api());}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 useEffect(()=>{load();},[]);
 async function publish(){if(busy)return;setBusy(true);setReview(false);setMessage('Sending the video to YouTube. Please wait.');
  try{const d=await api('POST',{draftId,mode,madeForKids:kids==='yes',syntheticMedia:synthetic==='yes',rightsConfirmed:rights,confirmed:true,publishAt:mode==='scheduled'?new Date(date).toISOString():null});setMessage(d.message);}
  catch(e){setMessage(e.message);}finally{setBusy(false);try{setData(await api());}catch{}}
 }
 useEffect(()=>{if(data && !data.owner && !data.privateTestAllowed && mode==='private')setMode('public');},[data,mode]);
 const waiting=data?.uploads?.some(u=>u.liveVerified && u.processingStatus==='processing' && !u.failed);
 useEffect(()=>{if(!waiting || busy)return;const timer=setTimeout(()=>load(),30000);return()=>clearTimeout(timer);},[waiting,busy,data]);
 const state=busy?'checking':data?.publicReady?'ready':waiting?'processing':data?.uploads?.some(u=>u.failed)?'failed':'waiting';
 return <main className="container studio-ui youtube-studio"><section className="hero dashboard-shell"><header className="studio-header"><div><span className="studio-eyebrow">MUSIC PROMOTION SECRETARY · YOUTUBE</span><h1>Your YouTube studio</h1><p>From your first private test to your next public release.</p></div><a className="studio-nav" href="/dashboard">← Artist dashboard</a></header><div className="studio-workflow"><span>01 · Choose video</span><span>02 · Review details</span><span>03 · Publish</span></div>
 <p>Publish to your own connected channel. Public subscriber publishing remains closed until launch checks are complete. Invited Sandbox testers can submit private tests within their trial allowance.</p>
 <p>This sends a new copy to your connected channel. It does not change existing Metricool posts. MP4 only, up to 50 MB.</p>
 {message&&<p className="activity-message" role="status">{message}</p>}
 <button disabled={busy} onClick={load}>{busy?'Working…':'Refresh upload status'}</button>
 {data&&<>
 <Usage at={mode==='scheduled' && date && Number.isFinite(Date.parse(date))?new Date(date).toISOString():undefined} refreshKey={data}/>
 <section className={`activity-panel activity-${state}`} role="status" aria-live="polite" aria-busy={busy}><span className="activity-kicker">{busy?'Checking latest status…':'LIVE UPLOAD STATUS'}</span>
 {!data.owner && !data.canPublish?<><strong>Subscriber publishing is being prepared</strong><p>Your allowance appears above. Connecting your channel does not activate publishing before launch.</p></>:data.privateTestAllowed?<><strong>Private customer test available</strong><p>Only private uploads are enabled for this invited Sandbox test account. Each attempt reserves one trial promotion, including an unconfirmed attempt.</p></>:data.publicReady?<><strong>✓ Ready for public publishing</strong><p>You can now choose Public now or Schedule public release. Your allowance is checked again when you publish.</p></>:data.uploads.some(u=>u.liveVerified && u.processingStatus==='processing' && !u.failed)?<><strong>⏳ YouTube is still processing your video</strong><p>Your upload has arrived. Please wait while YouTube prepares it for playback. Public publishing and scheduling will unlock after processing finishes.</p><p>You do not need to upload it again. This page checks automatically every 30 seconds while open. You can also use Refresh upload status.</p></>:data.uploads.some(u=>u.failed)?<><strong>Video needs attention</strong><p>YouTube reported a processing failure. Open the video in YouTube Studio for details before trying again.</p></>:data.uploads.length?<><strong>Waiting for YouTube confirmation</strong><p>We cannot yet confirm that processing has finished. Refresh upload status, or check the video in YouTube Studio. You do not need to upload another copy.</p></>:<><strong>Start with a private test</strong><p>Upload your video privately first. Its processing progress will appear here.</p></>}
 </section>
 <form className="studio-form" onSubmit={e=>{e.preventDefault();setReview(true);}} onChange={()=>setReview(false)}>
 <p><label>Saved video <select required value={draftId} onChange={e=>setDraft(e.target.value)}><option value="">Choose your video</option>{data.drafts.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label></p>
 {!data.drafts.length&&<p><a href="/dashboard">Upload an MP4 in the release studio and save its draft first.</a></p>}
 <p><label>Visibility <select value={mode} onChange={e=>setMode(e.target.value)}>{(data.owner||data.privateTestAllowed)&&<option value="private">Private test</option>}{data.publicReady&&<><option value="public">Public now</option><option value="scheduled">Schedule public release</option></>}</select></label></p>
 {mode==='scheduled'&&<p><label>Publication date and time (your device timezone)<input required type="datetime-local" value={date} onChange={e=>setDate(e.target.value)}/></label></p>}
 <p><label>Made for children? <select required value={kids} onChange={e=>setKids(e.target.value)}><option value="">Choose audience</option><option value="no">No</option><option value="yes">Yes</option></select></label></p>
 <p><label>Contains realistic altered or synthetic content? <select required value={synthetic} onChange={e=>setSynthetic(e.target.value)}><option value="">Choose disclosure</option><option value="no">No</option><option value="yes">Yes</option></select></label></p>
 <p><label><input required type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/> I have permission to upload this video and its music.</label></p>
 <button className="button" disabled={busy || !data.drafts.length || !data.canPublish}>Ready to Publish</button>
 </form>
 {review&&<section className="publish-review" aria-label="Review upload"><h2>Review your upload</h2><p>{data.drafts.find(d=>d.id===draftId)?.title}</p><p>Visibility: {mode}. {mode==='scheduled'&&new Date(date).toLocaleString()}</p><p>YouTube receives a new video copy. A private test is visible only to authorized viewers.</p><button className="button" disabled={busy || !data.canPublish} onClick={publish}>{mode==='private'?'Upload private test':'Publish'}</button></section>}
 <h2>Your direct uploads</h2>
 {data.uploads.map(u=><article className={`upload-receipt ${u.failed?'receipt-failed':u.liveVerified && u.processed?'receipt-ready':'receipt-pending'}`} key={u.id}><p>{u.mode} · {u.privacy || 'Unconfirmed'} · {u.failed?'YouTube reported a failure':u.processed?'Processed':u.liveVerified && u.processingStatus==='processing'?'⏳ Still processing on YouTube':'Awaiting processing confirmation'}{!u.liveVerified?' · Current status not verified':''}</p>{u.publishAt&&<p>Release: {new Date(u.publishAt).toLocaleString()}</p>}<p>{u.message}</p>{u.url&&<a href={u.url} target="_blank" rel="noopener noreferrer">Open video on YouTube</a>}</article>)}
 </>}
 <p><a href="/publishing-setup">Connection setup</a> · <a href="/dashboard">Dashboard</a></p>
 </section></main>;
}
