'use client';
import {useEffect,useState} from 'react';
import {supabase} from '../../lib/supabaseClient';
export default function FacebookTest(){
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[draftId,setDraft]=useState(''),[rights,setRights]=useState(false),[review,setReview]=useState(false);
 async function api(body){const {data:{session}}=await supabase.auth.getSession();if(!session)throw Error('Sign in to the app first.');const r=await fetch('/api/facebook/uploads',{method:body?'POST':'GET',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(55000)});const d=await r.json();if(!r.ok)throw Error(d.message||'Unable to finish.');return d;}
 async function load(){setBusy(true);try{setData(await api());}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 useEffect(()=>{load();},[]);
 const processing=data?.uploads?.some(u=>u.liveVerified&&u.processingStatus==='processing');
 useEffect(()=>{if(!processing||busy)return;const timer=setTimeout(load,30000);return()=>clearTimeout(timer);},[processing,busy,data]);
 async function submit(){if(busy)return;setReview(false);setBusy(true);setMessage('Sending your unpublished test to Facebook…');try{const d=await api({draftId,mode:'unpublished',rightsConfirmed:rights,confirmed:true});setMessage(d.message);}catch(e){setMessage(e.message);}finally{try{setData(await api());}catch{}setBusy(false);}}
 return <main className="container studio-ui"><section className="hero dashboard-shell"><header className="studio-header"><div><span className="studio-eyebrow">FACEBOOK · OWNER PILOT</span><h1>Your Facebook test studio</h1><p>Choose a saved video, review it, then send an unpublished test.</p></div><a href="/dashboard">← Dashboard</a></header>
 <section className="activity-panel activity-waiting"><strong>First: verify an unpublished upload</strong><p>This pilot does not request public publication or scheduling. An unpublished Facebook video is not the same as a private YouTube video. Your source promotional file remains accessible through its existing upload link.</p><p>Subscriber publishing stays closed. Owner tests use no subscriber promotion allowance.</p></section>
 {message&&<p role="status" className="activity-message">{message}</p>}
 <p><a href="/social-connections">Facebook connection</a> · <a href="https://business.facebook.com/" target="_blank" rel="noopener noreferrer">Meta Business Suite</a></p>
 <button disabled={busy} onClick={load}>{busy?'Working…':'Refresh test status'}</button>
 {data&&<><section className={`activity-panel activity-${data.page?'ready':'waiting'}`}><strong>{data.page?'Connected Page: '+data.page.name:'Page connection needs attention'}</strong>{data.connectionError&&<p>{data.connectionError}</p>}</section>
 <form className="studio-form" onSubmit={e=>{e.preventDefault();setReview(true);}} onChange={()=>setReview(false)}><p><label>Saved video<select required value={draftId} onChange={e=>setDraft(e.target.value)}><option value="">Choose your MP4 video</option>{data.drafts.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label></p>
 {!data.drafts.length&&<p><a href="/dashboard">Upload an MP4 in the release studio and save its draft first.</a></p>}
 <p><label><input required type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/> I have permission to upload this video and its music.</label></p><button className="button" disabled={busy||!data.page||!data.drafts.length}>Ready to test</button></form>
 {review&&<section className="publish-review"><h2>Review your test</h2><p>{data.drafts.find(d=>d.id===draftId)?.title}</p><p>Destination: {data.page?.name}. A new unpublished copy will be sent. No public post is requested.</p><button className="button" disabled={busy} onClick={submit}>Upload unpublished test</button></section>}
 <h2>Your Facebook tests</h2>{data.uploads.map(u=><article className={`upload-receipt ${u.failed?'receipt-failed':u.liveVerified&&u.verified&&u.processed?'receipt-ready':'receipt-pending'}`} key={u.id}><h3>{u.title}</h3><p>{!u.liveVerified?'Current status unconfirmed':u.failed?'Facebook reported a processing error':u.published===true?'Attention: Facebook reports this video as published':u.processed&&u.verified?'✓ Processed · unpublished test verified':u.processingStatus==='processing'?'⏳ Facebook is still processing your video':'Waiting for processing and unpublished-status confirmation'}</p><p>{u.message}</p>{u.url&&<a href={u.url} target="_blank" rel="noopener noreferrer">Open video on Facebook</a>}</article>)}</>}
 </section></main>;
}
