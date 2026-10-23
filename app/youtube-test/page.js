'use client';
import {useEffect,useState} from 'react';
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
 return <main className="container"><section className="hero"><h1>Owner: direct YouTube publishing</h1>
 <p>First upload a private test. Once YouTube confirms that it processed successfully and remains private, public publishing and scheduling become available for this owner pilot.</p>
 <p>This sends a new copy to your connected channel. It does not change existing Metricool posts. MP4 only, up to 50 MB.</p>
 {message&&<p role="status">{message}</p>}
 <button disabled={busy} onClick={load}>{busy?'Working…':'Refresh upload status'}</button>
 {data&&<>
 <section role="status" aria-live="polite" style={{padding:'16px',margin:'16px 0',border:'1px solid currentColor',borderRadius:12}}>
 {data.publicReady?<><strong>✓ Ready for public publishing</strong><p>Your private test has finished processing. You can now choose Public now or Schedule public release.</p></>:data.uploads.some(u=>u.liveVerified && u.processingStatus==='processing' && !u.failed)?<><strong>⏳ YouTube is still processing your video</strong><p>Your upload has arrived. Please wait while YouTube prepares it for playback. Public publishing and scheduling will unlock after processing finishes.</p><p>You do not need to upload it again. Use Refresh upload status to check progress.</p></>:data.uploads.some(u=>u.failed)?<><strong>Video needs attention</strong><p>YouTube reported a processing failure. Open the video in YouTube Studio for details before trying again.</p></>:data.uploads.length?<><strong>Waiting for YouTube confirmation</strong><p>We cannot yet confirm that processing has finished. Refresh upload status, or check the video in YouTube Studio. You do not need to upload another copy.</p></>:<><strong>Start with a private test</strong><p>Upload your video privately first. Its processing progress will appear here.</p></>}
 </section>
 <form onSubmit={e=>{e.preventDefault();setReview(true);}} onChange={()=>setReview(false)}>
 <p><label>Saved video <select required value={draftId} onChange={e=>setDraft(e.target.value)}><option value="">Choose your video</option>{data.drafts.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label></p>
 {!data.drafts.length&&<p><a href="/dashboard">Upload an MP4 in the release studio and save its draft first.</a></p>}
 <p><label>Visibility <select value={mode} onChange={e=>setMode(e.target.value)}><option value="private">Private test</option>{data.publicReady&&<><option value="public">Public now</option><option value="scheduled">Schedule public release</option></>}</select></label></p>
 {mode==='scheduled'&&<p><label>Publication date and time (your device timezone)<input required type="datetime-local" value={date} onChange={e=>setDate(e.target.value)}/></label></p>}
 <p><label>Made for children? <select required value={kids} onChange={e=>setKids(e.target.value)}><option value="">Choose audience</option><option value="no">No</option><option value="yes">Yes</option></select></label></p>
 <p><label>Contains realistic altered or synthetic content? <select required value={synthetic} onChange={e=>setSynthetic(e.target.value)}><option value="">Choose disclosure</option><option value="no">No</option><option value="yes">Yes</option></select></label></p>
 <p><label><input required type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/> I have permission to upload this video and its music.</label></p>
 <button className="button" disabled={busy || !data.drafts.length}>Ready to Publish</button>
 </form>
 {review&&<section aria-label="Review upload"><h2>Review your upload</h2><p>{data.drafts.find(d=>d.id===draftId)?.title}</p><p>Visibility: {mode}. {mode==='scheduled'&&new Date(date).toLocaleString()}</p><p>YouTube receives a new video copy. A private test is visible only to authorized viewers.</p><button className="button" disabled={busy} onClick={publish}>{mode==='private'?'Upload private test':'Publish'}</button></section>}
 <h2>Your direct uploads</h2>
 {data.uploads.map(u=><article key={u.id}><p>{u.mode} · {u.privacy || 'Unconfirmed'} · {u.failed?'YouTube reported a failure':u.processed?'Processed':u.liveVerified && u.processingStatus==='processing'?'⏳ Still processing on YouTube':'Awaiting processing confirmation'}{!u.liveVerified?' · Current status not verified':''}</p>{u.publishAt&&<p>Release: {new Date(u.publishAt).toLocaleString()}</p>}<p>{u.message}</p>{u.url&&<a href={u.url} target="_blank" rel="noopener noreferrer">Open video on YouTube</a>}</article>)}
 </>}
 <p><a href="/publishing-setup">Connection setup</a> · <a href="/dashboard">Dashboard</a></p>
 </section></main>;
}
