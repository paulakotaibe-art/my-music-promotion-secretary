"use client";
import {useState,useEffect,useCallback} from "react";
import {supabase} from "../../lib/supabaseClient";

export default function Scheduler({drafts,connection,userId}) {
  const [draftId,setDraftId]=useState("");
  const [brandId,setBrandId]=useState("");
  const [kids,setKids]=useState("");
  const [privacy,setPrivacy]=useState("");
  const [rights,setRights]=useState(false);
  const [ownBrand,setOwnBrand]=useState(false);
  const [thirdParty,setThirdParty]=useState(false);
  const [preview,setPreview]=useState(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [records,setRecords]=useState([]);
  const [confirmed,setConfirmed]=useState(false);
  const [error,setError]=useState("");
  const draft=drafts.find(d=>d.id===draftId);
  const api=useCallback(async(body)=>{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session) throw new Error("Please sign in again.");
    const response=await fetch("/api/publishing/schedule",{method:body ? "POST" : "GET",headers:{Authorization:`Bearer ${session.access_token}`,...(body ? {"Content-Type":"application/json"} : {})},...(body ? {body:JSON.stringify(body)} : {}),cache:"no-store"});
    const result=await response.json();
    if(!response.ok) throw new Error(result.message || "Unable to complete request.");
    return result;
  },[]);
  const reload=useCallback(async()=>{const result=await api();setRecords(result.submissions);},[api]);
  useEffect(()=>{reload().catch(e=>setError(e.message));},[reload,userId]);
  useEffect(()=>{setPreview(null);setConfirmed(false);},[draftId,brandId,kids,privacy,rights,ownBrand,thirdParty,drafts]);
  async function prepare(e) {
    e.preventDefault();setBusy(true);setError("");setMessage("");
    try {setPreview(await api({action:"preview",draftId,brandId:brandId || undefined,madeForKids:kids==="" ? undefined : kids==="yes",tiktokPrivacy:privacy,rightsConfirmed:rights,ownBrand,thirdParty}));setConfirmed(false);}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function submit() {
    setBusy(true);setError("");
    try {const result=await api({action:"submit",ticket:preview.ticket,confirmed});setMessage(result.message);}
    catch(e){setError(e.message);}finally{setPreview(null);setConfirmed(false);await reload().catch(e=>setError(e.message));setBusy(false);}
  }
  return <section aria-labelledby="schedule-heading">
    <h2 id="schedule-heading">Schedule a saved campaign</h2>
    <p>Save your draft first, then check your publishing connection. Previewing sends no posts. Confirming submits one scheduling request to Metricool.</p>
    <p>Use an original public video file URL ending in .mp4, .mov or .webm. File format, duration and publishing permissions remain subject to the provider’s checks. This pilot does not upload files.</p>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <form onSubmit={prepare}><fieldset disabled={busy}><legend>Scheduling details</legend>
      <label>Saved campaign<select required value={draftId} onChange={e=>setDraftId(e.target.value)}><option value="">Choose a draft</option>{drafts.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label>
      {(connection?.brands?.length>1) && <label>Brand<select required value={brandId} onChange={e=>setBrandId(e.target.value)}><option value="">Choose your brand</option>{connection.brands.map(b=><option key={b.id} value={b.id}>{b.label}</option>)}</select></label>}
      {draft && <p>Platforms: {draft.platforms.join(", ")}<br/>Time: {draft.planned_at ? new Date(draft.planned_at).toLocaleString() : "Set a date in the draft"} ({Intl.DateTimeFormat().resolvedOptions().timeZone})</p>}
      {draft?.platforms.includes("youtube") && <label>Is this YouTube video made for children?<select required value={kids} onChange={e=>setKids(e.target.value)}><option value="">Choose audience</option><option value="no">No, not made for children</option><option value="yes">Yes, made for children</option></select></label>}
      {draft?.platforms.includes("tiktok") && <><label>TikTok visibility<select required value={privacy} onChange={e=>setPrivacy(e.target.value)}><option value="">Choose visibility</option><option value="PUBLIC_TO_EVERYONE">Public</option><option value="SELF_ONLY">Only me</option></select></label><label><input type="checkbox" checked={ownBrand} onChange={e=>setOwnBrand(e.target.checked)}/> Promotes my own brand</label><label><input type="checkbox" checked={thirdParty} onChange={e=>setThirdParty(e.target.checked)}/> Paid partnership or promotes another brand</label><small>TikTok comments, duets and stitches are disabled for this pilot. Review disclosure and music permissions in Metricool.</small></>}
      <label><input type="checkbox" required checked={rights} onChange={e=>setRights(e.target.checked)}/> I have permission to publish this video, music and caption.</label>
      <button type="submit" className="button">{busy ? "Working…" : "Preview schedule"}</button>
    </fieldset></form>
    {preview && <div className="campaign-card"><h3>Review before scheduling</h3><p><strong>{preview.preview.title}</strong><br/>{preview.preview.brand}<br/>{preview.preview.platforms.join(", ")}<br/>{new Date(preview.preview.date).toLocaleString()}</p><p style={{whiteSpace:"pre-wrap"}}>{preview.preview.caption}</p>{preview.preview.media_url && <p><a href={preview.preview.media_url} target="_blank" rel="noopener noreferrer">Review original video</a></p>}
      {preview.preview.platforms.includes("youtube") && <p>YouTube: public video; {preview.preview.options.madeForKids ? "made for children" : "not made for children"}.</p>}
      {preview.preview.platforms.includes("tiktok") && <p>TikTok: {preview.preview.options.tiktokPrivacy==="SELF_ONLY" ? "Only me" : "Public"}; own-brand promotion: {preview.preview.options.ownBrand ? "yes" : "no"}; third-party promotion: {preview.preview.options.thirdParty ? "yes" : "no"}.</p>}
      <label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I reviewed the caption, media, accounts, audience choices and publication time.</label><button type="button" className="button" disabled={busy || !confirmed} onClick={submit}>Confirm and schedule</button><button type="button" disabled={busy} onClick={()=>setPreview(null)}>Cancel preview</button></div>}
    <h3>Submission history</h3><button type="button" disabled={busy} onClick={()=>reload().catch(e=>setError(e.message))}>Reload submission history</button>
    <p>Accepted means scheduled by the provider, not published. If an outcome is uncertain, check Metricool before creating another post; the app will not automatically retry.</p>
    {records.length===0 ? <p>No scheduling attempts yet.</p> : records.map(r=><article className="campaign-card" key={r.id}><h4>{r.title}</h4><strong>{r.status}</strong><p>{r.message}</p><p>{r.platforms.join(", ")} — {new Date(r.date).toLocaleString()}</p>{r.plannerUrl && <a href={r.plannerUrl} target="_blank" rel="noopener noreferrer">Review in Metricool</a>}</article>)}
  </section>;
}
