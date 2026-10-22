"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {supabase} from "../../lib/supabaseClient";
import Usage from "./Usage";
import Scheduler from "./Scheduler";
import MediaUpload from "./MediaUpload";
import {withDeadline} from "../../lib/deadline.mjs";
const networks={youtube:"YouTube",facebook:"Facebook",tiktok:"TikTok"};
const empty={title:"",artist:"",caption:"",media_url:"",cover_url:"",media_kind:"video",platforms:["youtube","facebook","tiktok"],is_public:false};
export default function Campaigns({user}){
 const [form,setForm]=useState(empty),[draftId,setDraftId]=useState(null),[drafts,setDrafts]=useState([]);
 const [busy,setBusy]=useState(false),[uploading,setUploading]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [connection,setConnection]=useState(null),[brandId,setBrandId]=useState(""),[preview,setPreview]=useState(null),[historyKey,setHistoryKey]=useState(0);
 const [timing,setTiming]=useState("now"),[date,setDate]=useState(""),[time,setTime]=useState("");
 const [kids,setKids]=useState(""),[privacy,setPrivacy]=useState(""),[ownBrand,setOwnBrand]=useState(false),[thirdParty,setThirdParty]=useState(false),[rights,setRights]=useState(false);
 const lock=useRef(false),reviewRef=useRef(null),errorRef=useRef(null);
 const [stage,setStage]=useState("");
 useEffect(()=>{if(preview){reviewRef.current?.focus();reviewRef.current?.querySelector("[data-final-publish]")?.scrollIntoView({behavior:"smooth",block:"center"});}},[preview]);
 useEffect(()=>{if(error){errorRef.current?.focus();errorRef.current?.scrollIntoView({behavior:"smooth",block:"center"});}},[error]);
 const api=useCallback(async(path,body)=>{
  const {data:{session}}=await withDeadline(()=>supabase.auth.getSession(),8000,"Your sign-in check took too long. Please save your work and sign in again.");if(!session)throw new Error("Please sign in again.");
  const controller=new AbortController();
  return withDeadline(async()=>{
  const response=await fetch(path,{method:body ? "POST":"GET",headers:{Authorization:`Bearer ${session.access_token}`,...(body ? {"Content-Type":"application/json"}:{})},...(body ? {body:JSON.stringify(body)}:{}),cache:"no-store",signal:controller.signal});
  const result=await response.json().catch(()=>{throw new Error(body?.action==="submit" ? "The publishing result is not confirmed. Do not retry; check Your posts first." : "Preparation could not finish. Your draft is saved; please try Ready to Publish again.");});if(!response.ok)throw new Error(result.message || "Please try again.");return result;
  },30000,body?.action==="submit" ? "The publishing result is not confirmed. Do not retry; check Your posts first." : "Account checks took too long. Your saved draft is safe. Please try Ready to Publish again.",()=>controller.abort());
 },[]);
 const refresh=useCallback(async()=>{
  const {data,error}=await supabase.from("campaign_drafts").select("*").eq("user_id",user.id).order("created_at",{ascending:false});
  if(error)throw new Error("Unable to load your saved posts.");setDrafts(data || []);return data || [];
 },[user.id]);
 useEffect(()=>{
  refresh().then(items=>{const key=`pending-post:${user.id}`,id=sessionStorage.getItem(key);const found=items.find(d=>d.id===id);if(found){edit(found);sessionStorage.removeItem(key);}}).catch(e=>setError(e.message));
  api("/api/publishing/connection").then(setConnection).catch(()=>setConnection(null));
  const url=new URL(window.location.href),outcome=url.searchParams.get("metricool");
  if(outcome){setNotice(outcome==="authorized" ? "Social account authorization saved." : "Account authorization was not completed.");url.searchParams.delete("metricool");window.history.replaceState(null,"",url);}
 },[refresh,api]);
 const change=(key,value)=>setForm(prev=>({...prev,[key]:value}));
 async function connect(){
  if(lock.current)return;lock.current=true;setBusy(true);setError("");
  try{
   // Preserve work before navigating to the one-time authorization screen.
   if(form.title.trim()){const id=await persist(false);sessionStorage.setItem(`pending-post:${user.id}`,id);}
   const result=await api("/api/integrations/metricool/connect",{});
   const destination=new URL(result.url);
   if(destination.origin!=="https://app.metricool.com" || destination.pathname!=="/oauth/authorize")throw new Error("Unable to open secure account setup.");
   window.location.assign(destination.href);
  }catch(e){setError(e.message);setBusy(false);lock.current=false;}
 }
 function planned(){
  if(timing==="now")return null;
  if(!date || !time)throw new Error("Choose both a date and time, or choose As soon as possible.");
  const value=new Date(`${date}T${time}`);
  if(!Number.isFinite(value.getTime()) || value.getTime()<Date.now()+600000)throw new Error("Choose a time at least ten minutes ahead.");
  return value.toISOString();
 }
 async function persist(ready){
  if(!form.title.trim())throw new Error("Add a title for your post.");
  if(!form.platforms.length)throw new Error("Choose at least one platform.");
  if(ready && !form.media_url)throw new Error("Upload your video or audio first.");
  if(ready && !rights)throw new Error("Confirm that you have permission to publish this content.");
  const details={...form,title:form.title.trim(),caption:form.caption.trim(),planned_at:planned()};
  const query=draftId ? supabase.from("campaign_drafts").update(details).eq("id",draftId).eq("user_id",user.id) : supabase.from("campaign_drafts").insert({...details,user_id:user.id});
  const controller=new AbortController();
  const {data,error}=await withDeadline(()=>query.select("id").single().abortSignal(controller.signal),12000,"Saving took too long. Check Saved drafts before trying again.",()=>controller.abort());
  if(error || !data)throw new Error("Unable to save your post. Please try again.");
  setDraftId(data.id);return data.id;
 }
 async function prepare(event){
  event.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError("");setNotice("");
  try{
   setStage("Saving your post…");
   const id=await persist(true);
   setStage("Checking your social accounts…");
   const result=await api("/api/publishing/schedule",{action:"preview",draftId:id,brandId:brandId || undefined,publishNow:timing==="now",madeForKids:kids==="" ? undefined:kids==="yes",tiktokPrivacy:privacy,ownBrand,thirdParty,rightsConfirmed:rights});
   setPreview(result);refresh().catch(()=>{});
  }catch(e){setError(e.message);}finally{setBusy(false);setStage("");lock.current=false;}
 }
 async function save(){
  if(lock.current)return;lock.current=true;setBusy(true);setError("");
  try{await persist(false);await refresh();setNotice("Draft saved. Continue whenever you are ready.");}catch(e){setError(e.message);}finally{setBusy(false);lock.current=false;}
 }
 async function publish(){
  if(lock.current || !preview)return;lock.current=true;setBusy(true);setError("");setNotice("");
  try{const result=await api("/api/publishing/schedule",{action:"submit",ticket:preview.ticket,confirmed:true});setNotice(result.message);if(result.status==="accepted"){setForm(empty);setDraftId(null);setRights(false);setKids("");setPrivacy("");setTiming("now");setDate("");setTime("");}}
  catch(e){setError(e.message);}
  finally{setPreview(null);setHistoryKey(k=>k+1);setBusy(false);lock.current=false;}
 }
 function edit(draft){
  setPreview(null);setDraftId(draft.id);setForm({title:draft.title,artist:draft.artist || "",caption:draft.caption,media_url:draft.media_url,cover_url:draft.cover_url || "",media_kind:draft.media_kind || "video",platforms:draft.platforms,is_public:!!draft.is_public});
  setTiming(draft.planned_at ? "later":"now");
  if(draft.planned_at){const value=new Date(draft.planned_at);const local=new Date(value.getTime()-value.getTimezoneOffset()*60000).toISOString();setDate(local.slice(0,10));setTime(local.slice(11,16));}else{setDate("");setTime("");}
  setKids("");setPrivacy("");setOwnBrand(false);setThirdParty(false);setRights(false);setError("");setNotice("");
  document.getElementById("campaign-heading")?.scrollIntoView({behavior:"smooth"});
 }
 return <section className="campaigns" aria-labelledby="campaign-heading">
  <Usage at={timing==="later" && date && time && Number.isFinite(Date.parse(`${date}T${time}`)) ? new Date(`${date}T${time}`).toISOString() : undefined} refreshKey={historyKey}/>
  <h2 id="campaign-heading">Create your post</h2><p>Upload. Choose your platforms. Get ready, then publish.</p>
  {notice && <p role="status">{notice}</p>}
  <details className="social-settings"><summary>Social accounts · one-time setup</summary><p>Authorize your social accounts once. We check them automatically when you prepare a post. Secure authorization opens our publishing partner; your passwords are never entered here.</p>
   <button type="button" disabled={busy || uploading || !!preview} onClick={connect}>Connect or reconnect social accounts</button>
   {connection?.brands?.flatMap(b=>b.networks || []).map((n,i)=><span className="account-badge" key={i}>{networks[n.network] || n.network}: {n.connected ? "Connected":"Needs setup"}</span>)}
  </details>
  <form onSubmit={prepare}><fieldset disabled={busy || uploading || !!preview}><legend>Your post</legend>
   <label>Title<input required maxLength={100} value={form.title} onChange={e=>change("title",e.target.value)}/></label>
   <label>Artist or album name<input maxLength={120} value={form.artist} onChange={e=>change("artist",e.target.value)}/></label>
   <label>Caption<textarea required rows={4} maxLength={2000} value={form.caption} onChange={e=>change("caption",e.target.value)}/></label>
   <div className="upload-grid"><MediaUpload slot="media" userId={user.id} value={form.media_url} kind={form.media_kind} onBusy={setUploading} onChange={(url,kind)=>setForm(prev=>({...prev,media_url:url,media_kind:kind,...(kind==="audio" ? {platforms:["facebook"]}: {})}))}/><MediaUpload slot="cover" userId={user.id} value={form.cover_url} onBusy={setUploading} onChange={url=>change("cover_url",url)}/></div>
   <fieldset><legend>Where should it go?</legend>{Object.entries(networks).map(([key,label])=><label className="network-choice" key={key}><input type="checkbox" disabled={form.media_kind==="audio" && key!=="facebook"} checked={form.platforms.includes(key)} onChange={e=>change("platforms",e.target.checked ? [...form.platforms,key]:form.platforms.filter(p=>p!==key))}/>{label}</label>)}</fieldset>
   {form.media_kind==="audio" && <small>Audio shares a playable album page on Facebook. Upload a video version for YouTube or TikTok; automatic audio-to-video conversion is not available yet.</small>}
   {connection?.brands?.length>1 && <label>Posting profile<select required value={brandId} onChange={e=>setBrandId(e.target.value)}><option value="">Choose your profile</option>{connection.brands.map(b=><option key={b.id} value={b.id}>{b.label}</option>)}</select></label>}
   <label>When?<select value={timing} onChange={e=>setTiming(e.target.value)}><option value="now">As soon as possible</option><option value="later">Choose a date and time</option></select></label>
   {timing==="later" && <div className="upload-grid"><label>Date<input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Time<input required type="time" value={time} onChange={e=>setTime(e.target.value)}/></label></div>}
   <small>Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. As soon as possible allows a few minutes for processing.</small>
   {form.platforms.includes("youtube") && <label>Is this video made for children?<select required value={kids} onChange={e=>setKids(e.target.value)}><option value="">Choose the YouTube audience</option><option value="no">No</option><option value="yes">Yes</option></select></label>}
   {form.platforms.includes("tiktok") && <><label>TikTok visibility<select required value={privacy} onChange={e=>setPrivacy(e.target.value)}><option value="">Choose who can see it</option><option value="PUBLIC_TO_EVERYONE">Public</option><option value="SELF_ONLY">Only me</option></select></label><label><input type="checkbox" checked={ownBrand} onChange={e=>setOwnBrand(e.target.checked)}/> Promotes my own brand</label><label><input type="checkbox" checked={thirdParty} onChange={e=>setThirdParty(e.target.checked)}/> Paid partnership or promotes another brand</label><small>TikTok comments, duets and stitches are off for this pilot.</small></>}
   <label><input type="checkbox" checked={form.is_public} onChange={e=>change("is_public",e.target.checked)}/> Include a public album page with artwork and playback{form.media_kind==="audio" ? " (required for audio sharing)":""}</label>
   <label><input type="checkbox" required checked={rights} onChange={e=>setRights(e.target.checked)}/> I have permission to publish this media, artwork and caption.</label>
   {error && <p className="publish-error" ref={errorRef} tabIndex={-1} role="alert">{error}</p>}{busy && <p role="status">{stage || "Working…"}</p>}<div className="publish-actions"><button type="button" onClick={save}>Save draft for later</button><button type="submit" className="button">{busy ? stage || "Preparing…" : "Ready to Publish"}</button></div>
  </fieldset></form>
  {preview && <div ref={reviewRef} tabIndex={-1} className="publish-review" role="region" aria-label="Ready to publish"><h3>Ready to publish</h3><p>Accounts checked. Your post is prepared.</p><div className="album-preview"><div>{preview.preview.cover_url ? <img src={preview.preview.cover_url} alt="Album artwork"/>:<div className="artwork-placeholder">♫</div>}</div><div><h3>{preview.preview.title}</h3><p>{preview.preview.brand}</p><p>{preview.preview.platforms.map(p=>networks[p]).join(" · ")}</p><p>{preview.preview.options.publishNow ? "As soon as possible":new Date(preview.preview.date).toLocaleString()}</p></div></div>
   <p style={{whiteSpace:"pre-wrap"}}>{preview.preview.caption}</p>
   {preview.preview.media_kind==="audio" ? <audio controls src={preview.preview.media_url}/> : <video controls preload="metadata" poster={preview.preview.cover_url || undefined} src={preview.preview.media_url}/>}
   {preview.preview.platforms.includes("youtube") && <small>YouTube: public · {preview.preview.options.madeForKids ? "made for children":"not made for children"}</small>}
   {preview.preview.platforms.includes("tiktok") && <small>TikTok: {preview.preview.options.tiktokPrivacy==="SELF_ONLY" ? "Only me":"Public"} · Own-brand promotion: {preview.preview.options.ownBrand ? "yes":"no"} · Paid/third-party promotion: {preview.preview.options.thirdParty ? "yes":"no"}</small>}
   <div className="publish-actions"><button type="button" disabled={busy} onClick={()=>setPreview(null)}>Edit post</button><button type="button" className="button" data-final-publish disabled={busy} onClick={publish}>{busy ? "Sending…" : "Publish"}</button></div>
  </div>}
  <details className="saved-posts"><summary>Saved drafts</summary>{drafts.length===0 ? <p>No saved drafts yet.</p>:drafts.map(d=><article className="campaign-card" key={d.id}><h3>{d.title}</h3><p>{d.platforms.map(p=>networks[p]).join(" · ")}</p><button type="button" disabled={busy || uploading} onClick={()=>edit(d)}>Continue editing</button>{d.is_public && <a href={`/releases/${d.id}`} target="_blank" rel="noopener noreferrer">Open album page</a>}</article>)}</details>
  <Scheduler userId={user.id} refreshKey={historyKey}/>
 </section>;
}

