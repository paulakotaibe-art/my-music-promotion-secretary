'use client';
import {useEffect,useState} from 'react';
import {supabase} from '../../lib/supabaseClient';
export default function FacebookStudio(){
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[draftId,setDraft]=useState(''),[rights,setRights]=useState(false),[review,setReview]=useState(false);
 const [uploadId,setUpload]=useState(''),[mode,setMode]=useState('public'),[date,setDate]=useState(''),[releaseRights,setReleaseRights]=useState(false),[releaseReview,setReleaseReview]=useState(null),[zone,setZone]=useState('');
 async function api(body,path='/api/facebook/uploads'){
  const {data:{session}}=await supabase.auth.getSession();if(!session)throw Error('Sign in to the app first.');
  const r=await fetch(path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(55000)});
  const d=await r.json();if(!r.ok)throw Error(d.message||'Unable to finish.');return d;
 }
 async function load(){setBusy(true);try{setData(await api());}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 useEffect(()=>{setZone(Intl.DateTimeFormat().resolvedOptions().timeZone);load();},[]);
 const waiting=data?.uploads?.some(u=>(u.liveVerified&&u.processingStatus==='processing')||u.release&&!['published','failed','published_early'].includes(u.release.state));
 useEffect(()=>{if(!waiting||busy)return;const timer=setTimeout(load,30000);return()=>clearTimeout(timer);},[waiting,busy,data]);
 async function submit(){
  if(busy)return;setReview(false);setBusy(true);setMessage('Sending your unpublished test to Facebook…');
  try{const d=await api({draftId,mode:'unpublished',rightsConfirmed:rights,confirmed:true});setMessage(d.message);}catch(e){setMessage(e.message);}
  finally{try{setData(await api());}catch{}setBusy(false);}
 }
 function prepareRelease(e){
  e.preventDefault();setMessage('');
  try{
   const selected=data.uploads.find(u=>u.id===uploadId&&(u.canRelease||u.canSchedule));if(!selected)throw Error('Choose a verified unpublished video.');if(!selected.canRelease&&mode!=='scheduled')throw Error('Choose Schedule to replace the previous unconfirmed schedule.');
   const publishAt=mode==='scheduled'?new Date(date).toISOString():null;
   setReleaseReview({uploadId,mode,publishAt,rightsConfirmed:releaseRights,confirmed:true,title:selected.title});
  }catch(e){setMessage(e.message);}
 }
 async function publish(){
  if(busy||!releaseReview)return;setBusy(true);const reviewed=releaseReview;setReleaseReview(null);setMessage('Sending your release request to Facebook…');
  try{const d=await api(reviewed,'/api/facebook/releases');setMessage(d.message);}catch(e){setMessage(e.message);}
  finally{try{setData(await api());}catch{}setBusy(false);}
 }
 const eligible=data?.uploads?.filter(u=>u.canRelease||u.canSchedule)||[];
 const formatDate=value=>new Date(value).toLocaleString(undefined,{dateStyle:'full',timeStyle:'long'});
 return <main className="container studio-ui"><section className="hero dashboard-shell">
 <header className="studio-header"><div><span className="studio-eyebrow">FACEBOOK · OWNER STUDIO</span><h1>Your Facebook publishing studio</h1><p>Upload once. Review your video. Publish now or choose a release time.</p></div><a href="/dashboard">← Dashboard</a></header>
 <section className="activity-panel activity-waiting"><strong>Owner publishing pilot</strong><p>Each new video starts with an unpublished upload. Once processing is verified, release the same video without uploading another copy.</p><p>Unpublished does not mean private. Subscriber publishing stays closed; owner releases use no subscriber allowance.</p></section>
 {message&&<p role="status" className="activity-message">{message}</p>}
 <p><a href="/social-connections">Facebook connection</a> · <a href="https://business.facebook.com/" target="_blank" rel="noopener noreferrer">Meta Business Suite</a></p>
 <button disabled={busy} onClick={load}>{busy?'Working…':'Refresh Facebook status'}</button>
 {data&&<>
 <section className={'activity-panel activity-'+(data.page?'ready':'waiting')}><strong>{data.page?'Connected Page: '+data.page.name:'Page connection needs attention'}</strong>{data.connectionError&&<p>{data.connectionError}</p>}</section>
 <section className="upload-panel"><h2>Publish your verified video</h2>
 {eligible.length?<form className="studio-form" onSubmit={prepareRelease} onChange={()=>setReleaseReview(null)}>
 <p><label>Video<select required disabled={busy} value={uploadId} onChange={e=>{setUpload(e.target.value);if(eligible.find(u=>u.id===e.target.value)?.canSchedule)setMode('scheduled');}}><option value="">Choose your verified video</option>{eligible.map(u=><option key={u.id} value={u.id}>{u.title}</option>)}</select></label></p>
 <p><label>Release<select disabled={busy} value={mode} onChange={e=>setMode(e.target.value)}><option value="public" disabled={!!eligible.find(u=>u.id===uploadId)?.canSchedule}>Public now</option><option value="scheduled">Schedule public release</option></select></label></p>
 {mode==='scheduled'&&<p><label>Release date and time ({zone||'device timezone'})<input disabled={busy} required type="datetime-local" value={date} onChange={e=>setDate(e.target.value)}/></label><small>Choose between 10 minutes and 28 days ahead. The review shows the exact time and timezone.</small></p>}
 {mode==='scheduled'&&<p>The app's server will publish at the chosen time, normally within one minute. You can close the app after the schedule is saved. Final publication still depends on Facebook accepting the request.</p>}
 <p><label><input disabled={busy} required type="checkbox" checked={releaseRights} onChange={e=>setReleaseRights(e.target.checked)}/> I have permission to publish this video and its music publicly.</label></p>
 <button className="button" disabled={busy||!data.page}>Ready to Publish</button>
 </form>:<p>Processed, unpublished videos with no release attempt appear here. Check your video status below.</p>}
 {releaseReview&&<section className="publish-review"><h3>Review your release</h3><p>{releaseReview.title}</p><p>Page: {data.page?.name}</p><p>{releaseReview.mode==='public'?'Public now: Facebook may show the video publicly as soon as the request is accepted.':'Scheduled public release: '+formatDate(releaseReview.publishAt)}</p><p>This releases the existing Facebook video. No new upload is created.</p><button className="button" disabled={busy} onClick={publish}>Publish</button></section>}
 </section>
 <details className="upload-panel"><summary>Upload a new video for testing</summary>
 <p>Use this only for a new video. Your existing upload is listed below.</p>
 <form className="studio-form" onSubmit={e=>{e.preventDefault();setReview(true);}} onChange={()=>setReview(false)}>
 <p><label>Saved video<select required disabled={busy} value={draftId} onChange={e=>setDraft(e.target.value)}><option value="">Choose your MP4 video</option>{data.drafts.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label></p>
 {!data.drafts.length&&<p><a href="/dashboard">Upload an MP4 in the release studio and save its draft first.</a></p>}
 <p><label><input required disabled={busy} type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/> I have permission to upload this video and its music.</label></p>
 <button className="button" disabled={busy||!data.page||!data.drafts.length}>Ready to test</button></form>
 {review&&<section className="publish-review"><h3>Review your test</h3><p>{data.drafts.find(d=>d.id===draftId)?.title}</p><p>Destination: {data.page?.name}. A new unpublished copy will be sent. No public post is requested.</p><button className="button" disabled={busy} onClick={submit}>Upload unpublished test</button></section>}
 </details>
 <h2>Your Facebook videos</h2>{data.uploads.map(u=>{
 const r=u.release,verified=r?r.liveVerified&&r.verified:u.liveVerified&&u.verified&&u.processed;
 const label=r?(r.liveVerified&&r.state==='queued'?'✓ Saved in app schedule':r.state==='publishing'?'⏳ Publication in progress':r.state==='missed'?'Dispatch window missed':r.liveVerified&&r.verified?(r.state==='published'?'✓ Published on Facebook':'✓ Schedule confirmed by Facebook'):r.state==='failed'?'Release needs attention':'Release awaiting confirmation'):!u.liveVerified?'Current status unconfirmed':u.failed?'Facebook reported a processing error':u.published===true?'Facebook reports this video as published':u.processed&&u.verified?'✓ Processed · unpublished test verified':u.processingStatus==='processing'?'⏳ Facebook is still processing your video':'Waiting for confirmation';
 return <article className={'upload-receipt '+(u.failed||r?.state==='failed'?'receipt-failed':verified?'receipt-ready':'receipt-pending')} key={u.id}><h3>{u.title}</h3><p>{label}</p>{r?.publishAt&&<p>Requested release: {formatDate(r.publishAt)}</p>}<p>{r?r.message:u.message}</p>{u.url&&<a href={u.url} target="_blank" rel="noopener noreferrer">Open video on Facebook</a>}</article>;
 })}
 </>}
 </section></main>;
}
