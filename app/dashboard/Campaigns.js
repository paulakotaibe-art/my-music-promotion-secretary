"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const networks = {youtube: "YouTube", facebook: "Facebook", tiktok: "TikTok"};
const empty = {title: "", caption: "", media_url: "", platforms: ["youtube", "facebook", "tiktok"], planned_at: ""};

export default function Campaigns({user}) {
  const [form, setForm] = useState(empty);
  const [drafts, setDrafts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [connection, setConnection] = useState(null);
  const [checking, setChecking] = useState(false);
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
    setEditing(draft.id); setForm({title:draft.title, caption:draft.caption, media_url:draft.media_url, platforms:draft.platforms, planned_at:local});
    setNotice(""); setError("");
  }
  return <section className="campaigns" aria-labelledby="campaign-heading">
    <h2 id="campaign-heading">Plan a promotion campaign</h2>
    <p>Prepare posts for YouTube, Facebook, and TikTok. Drafts are private to your account.</p>
    <p className="campaign-info"><strong>Draft workspace:</strong> automatic publishing is not connected yet. A planned date does not schedule a post.</p>
    <button type="button" disabled={checking} onClick={checkConnection}>{checking ? "Checking…" : "Check publishing connection"}</button>
    {connection && <div role="status"><p>{connection.message}</p>{connection.networks.map(n=><p key={n.network}>{networks[n.network]}: {n.connected ? "Connected to provider" : "Not connected to provider"}</p>)}</div>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <form onSubmit={save}>
      <fieldset disabled={busy}>
        <legend>{editing ? "Edit campaign draft" : "New campaign draft"}</legend>
        <label>Campaign title<input required maxLength={100} value={form.title} onChange={e=>change("title",e.target.value)}/></label>
        <label>Post caption<textarea rows={5} maxLength={5000} value={form.caption} onChange={e=>change("caption",e.target.value)}/></label>
        <label>Video file link (optional)<input type="url" value={form.media_url} onChange={e=>change("media_url",e.target.value)} placeholder="https://…/video.mp4"/></label>
        <small>Use a link to the original video file. A YouTube watch link is not a video upload. Media validation comes before publishing.</small>
        <fieldset><legend>Intended platforms</legend>{Object.entries(networks).map(([key,label])=><label className="network-choice" key={key}><input type="checkbox" checked={form.platforms.includes(key)} onChange={e=>change("platforms",e.target.checked ? [...form.platforms,key] : form.platforms.filter(p=>p!==key))}/>{label}</label>)}</fieldset>
        <label>Planned date and time (optional)<input type="datetime-local" value={form.planned_at} onChange={e=>change("planned_at",e.target.value)}/></label>
        <small>Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. This is a planning reminder only.</small>
        <div><button className="button" type="submit">{busy ? "Saving…" : "Save draft"}</button>{editing && <button type="button" onClick={()=>{setEditing(null);setForm(empty);}}>Cancel editing</button>}</div>
      </fieldset>
    </form>
    <h3>My campaign drafts</h3>
    <button type="button" disabled={busy} onClick={()=>refresh().then(()=>setError("")).catch(e=>setError(e.message))}>Reload drafts</button>
    {loading ? <p>Loading drafts…</p> : drafts.length===0 ? <p>No campaign drafts yet.</p> : drafts.map(d=><article key={d.id} className="campaign-card">
      <h3>{d.title}</h3><strong>Draft — unpublished</strong><p>{d.platforms.map(p=>networks[p]).join(" · ")}</p>
      <p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{d.caption}</p>
      {d.media_url && <a href={d.media_url} target="_blank" rel="noopener noreferrer">Review media link</a>}
      <p>{d.planned_at ? `Planned: ${new Date(d.planned_at).toLocaleString()}` : "No date planned"}</p>
      <button type="button" disabled={busy} onClick={()=>edit(d)}>Edit draft</button>
    </article>)}
  </section>;
}
