"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Scheduler from "./Scheduler";
import MediaUpload from "./MediaUpload";

const networks = {youtube: "YouTube", facebook: "Facebook", tiktok: "TikTok"};
const empty = {title: "", caption: "", media_url: "", platforms: ["youtube", "facebook", "tiktok"], planned_at: "", artist:"",cover_url:"",media_kind:"video",is_public:false};

export default function Campaigns({user}) {
  const [form, setForm] = useState(empty);
  const [drafts, setDrafts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading,setUploading]=useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [connection, setConnection] = useState(null);
  const [checking, setChecking] = useState(false);
  async function connectMetricool() {
    setChecking(true); setError("");
    try {
      const {data:{session}}=await supabase.auth.getSession();
      if(!session) throw new Error("Please sign in again.");
      const response=await fetch("/api/integrations/metricool/connect",{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`}});
      const result=await response.json();
      if(!response.ok) throw new Error(result.message || "Unable to connect.");
      const destination=new URL(result.url);
      if(destination.origin!=="https://app.metricool.com" || destination.pathname!=="/oauth/authorize") throw new Error("Invalid connection destination.");
      window.location.assign(destination.href);
    } catch(e) {setError(e.message);setChecking(false);}
  }
  useEffect(()=>{
    const url=new URL(window.location.href);
    const outcome=url.searchParams.get("metricool");
    if(outcome) {
      if(outcome==="authorized") setNotice("Metricool authorization saved. Use Check publishing connection to verify your platforms.");
      else setError("Metricool authorization did not complete. Please reconnect and try again.");
      url.searchParams.delete("metricool"); window.history.replaceState(null,"",url);
    }
  },[]);
  async function checkConnection() {
    setChecking(true);
    try {
      const {data:{session}} = await supabase.auth.getSession();
      if (!session) throw new Error("Please sign in again.");
      const response = await fetch("/api/publishing/connection", {headers:{Authorization:`Bearer ${session.access_token}`}, cache:"no-store"});
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to check connection.");
      setConnection(result);
    } catch(e) {setConnection({state:"connection_error",message:e.message,networks:[]});}
    finally {setChecking(false);}
  }
  const refresh = useCallback(async () => {
    const {data, error} = await supabase.from("campaign_drafts").select("*").eq("user_id", user.id).order("created_at", {ascending:false});
    if (error) throw new Error("Unable to load campaign drafts. Please retry.");
    setDrafts(data || []);
  }, [user.id]);
  useEffect(() => {refresh().catch(e => setError(e.message)).finally(() => setLoading(false));}, [refresh]);
  const change = (key, value) => setForm(prev => ({...prev, [key]:value}));
  async function save(event) {
    event.preventDefault(); setError(""); setNotice("");
    if (!form.platforms.length) {setError("Choose at least one platform."); return;}
    let media = form.media_url.trim();
    if (media) {
      try {const url = new URL(media); if (url.protocol !== "https:") throw new Error(); media = url.href;}
      catch {setError("Use an HTTPS video file link, or leave it blank for now."); return;}
    }
    const planned = form.planned_at ? new Date(form.planned_at) : null;
    if (planned && (!Number.isFinite(planned.getTime()) || planned <= new Date())) {setError("Choose a future planned date and time."); return;}
    const details = {...form, title:form.title.trim(), caption:form.caption.trim(), media_url:media, planned_at:planned?.toISOString() || null};
    if (!details.title) {setError("Enter a campaign title."); return;}
    setBusy(true);
    try {
      const result = editing
        ? await supabase.from("campaign_drafts").update(details).eq("id", editing).eq("user_id", user.id).select("id")
        : await supabase.from("campaign_drafts").insert({...details, user_id:user.id}).select("id");
      if (result.error || !result.data?.length) throw new Error("Unable to save your draft. Please retry.");
      setForm(empty); setEditing(null); setNotice("Draft saved. No post has been scheduled or published.");
      await refresh();
    } catch(e) {setError(e.message);} finally {setBusy(false);}
  }
  function edit(draft) {
    let local = "";
    if (draft.planned_at) {
      const date = new Date(draft.planned_at);
      local = new Date(date.getTime() - date.getTimezoneOffset()*60000).toISOString().slice(0,16);
    }
    setEditing(draft.id); setForm({title:draft.title, caption:draft.caption, media_url:draft.media_url, platforms:draft.platforms, planned_at:local,artist:draft.artist || "",cover_url:draft.cover_url || "",media_kind:draft.media_kind || "video",is_public:!!draft.is_public});
    setNotice(""); setError("");
  }
  return <section className="campaigns" aria-labelledby="campaign-heading">
    <h2 id="campaign-heading">Your release studio</h2>
    <p>Upload your music or video, add album artwork, and prepare your social campaign. Your album page stays private until you choose to share it.</p>
    <p className="campaign-info"><strong>Draft workspace:</strong> saving a draft does not schedule a post. Use the scheduling preview below to submit it.</p>
    <button type="button" disabled={checking} onClick={checkConnection}>{checking ? "Checking…" : "Check publishing connection"}</button>
    <button type="button" className="button" disabled={checking} onClick={connectMetricool}>Connect Metricool</button>
    {connection && <div role="status"><p>{connection.message}</p>{connection.networks.map(n=><p key={n.network}>{networks[n.network]}: {n.connected ? "Connected to provider" : "Not connected to provider"}</p>)}</div>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <form onSubmit={save}>
      <fieldset disabled={busy || uploading}>
        <legend>{editing ? "Edit campaign draft" : "New campaign draft"}</legend>
        <label>Campaign title<input required maxLength={100} value={form.title} onChange={e=>change("title",e.target.value)}/></label>
        <label>Artist or album name<input maxLength={120} value={form.artist} onChange={e=>change("artist",e.target.value)}/></label>
        <label>Post caption<textarea rows={5} maxLength={2200} value={form.caption} onChange={e=>change("caption",e.target.value)}/></label>
        <div className="upload-grid">
          <MediaUpload slot="media" userId={user.id} value={form.media_url} kind={form.media_kind} onBusy={setUploading} onChange={(url,kind)=>setForm(prev=>({...prev,media_url:url,media_kind:kind,...(kind==="audio" ? {platforms:["facebook"]} : {})}))}/>
          <MediaUpload slot="cover" userId={user.id} value={form.cover_url} onBusy={setUploading} onChange={url=>change("cover_url",url)}/>
        </div>
        {form.media_kind==="audio" && <p className="campaign-info">Audio plays on your album page. Facebook can share that page with your cover. For a native YouTube or TikTok post, upload a video version of your song.</p>}
        <div className="album-preview"><div>{form.cover_url ? <img src={form.cover_url} alt="Album preview"/> : <div className="artwork-placeholder" aria-label="Album artwork placeholder">♫</div>}</div><div><small>ALBUM PAGE PREVIEW</small><h3>{form.title || "Your release title"}</h3><p>{form.artist || "Your artist name"}</p><p>{form.caption || "Your introduction will appear here."}</p></div></div>
        <label><input type="checkbox" checked={form.is_public} onChange={e=>change("is_public",e.target.checked)}/> Make an album page anyone can open and share</label>
        <small>Save to generate the album-page link. Switching this off and saving hides the page; previously uploaded file links remain accessible.</small>
        <details><summary>Advanced: use an existing file link</summary><label>Direct media link<input type="url" value={form.media_url} onChange={e=>change("media_url",e.target.value)} placeholder="https://…/video.mp4"/></label><label>Media type<select value={form.media_kind} onChange={e=>change("media_kind",e.target.value)}><option value="video">Video</option><option value="audio">Audio</option></select></label></details>
        <fieldset><legend>Intended platforms</legend>{Object.entries(networks).map(([key,label])=><label className="network-choice" key={key}><input type="checkbox" checked={form.platforms.includes(key)} onChange={e=>change("platforms",e.target.checked ? [...form.platforms,key] : form.platforms.filter(p=>p!==key))}/>{label}</label>)}</fieldset>
        <label>Planned date and time (optional)<input type="datetime-local" value={form.planned_at} onChange={e=>change("planned_at",e.target.value)}/></label>
        <small>Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Save this time, then review and confirm it in Schedule a saved campaign.</small>
        <div><button className="button" type="submit">{busy ? "Saving…" : "Save draft"}</button>{editing && <button type="button" onClick={()=>{setEditing(null);setForm(empty);}}>Cancel editing</button>}</div>
      </fieldset>
    </form>
    <h3>My campaign drafts</h3>
    <button type="button" disabled={busy} onClick={()=>refresh().then(()=>setError("")).catch(e=>setError(e.message))}>Reload drafts</button>
    {loading ? <p>Loading drafts…</p> : drafts.length===0 ? <p>No campaign drafts yet.</p> : drafts.map(d=><article key={d.id} className="campaign-card">
      {d.cover_url && <img className="cover-preview" src={d.cover_url} alt={`${d.title} cover`}/>}<h3>{d.title}</h3><p>{d.artist}</p><strong>Campaign draft · {d.media_kind=== "audio" ? "Audio" : "Video"}</strong><p>{d.platforms.map(p=>networks[p]).join(" · ")}</p>
      <p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{d.caption}</p>
      {d.media_url && <a href={d.media_url} target="_blank" rel="noopener noreferrer">Review media link</a>}
      <p>{d.planned_at ? `Planned: ${new Date(d.planned_at).toLocaleString()}` : "No date planned"}</p>
      {d.is_public && <p><a href={`/releases/${d.id}`} target="_blank" rel="noopener noreferrer">Open album page</a><br/><span className="generated-link">{`https://my-music-promotion-secretary-x96x.vercel.app/releases/${d.id}`}</span></p>}
      <button type="button" disabled={busy || uploading} onClick={()=>edit(d)}>Edit draft</button>
    </article>)}
    <Scheduler drafts={drafts} connection={connection} userId={user.id}/>
  </section>;
}
