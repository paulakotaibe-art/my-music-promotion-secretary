"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

function safeLink(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [songs, setSongs] = useState([]);
  const [form, setForm] = useState({ song_title: "", artist_name: "", song_link: "" });
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [campaign, setCampaign] = useState("");
  const [activity, setActivity] = useState([]);

  const record = (text) => setActivity(items => [text, ...items].slice(0, 12));
  async function fetchSongs(userId) {
    const result = await supabase.from("songs").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (result.error) throw result.error;
    setSongs(result.data || []);
  }

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase) {
        setError("The music account connection is not configured. Please contact the owner.");
        setLoading(false);
        return;
      }
      try {
        const result = await supabase.auth.getUser();
        if (result.error || !result.data.user) { router.replace("/login"); return; }
        if (!alive) return;
        setUser(result.data.user);
        await fetchSongs(result.data.user.id);
      } catch { if (alive) setError("We could not load your songs. Please refresh and try again."); }
      finally { if (alive) setLoading(false); }
    }
    load();
    const subscription = supabase?.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/login");
    });
    return () => { alive = false; subscription?.data.subscription.unsubscribe(); };
  }, [router]);

  async function save(e) {
    e.preventDefault();
    if (!supabase || !user || busy) return;
    const values = {
      song_title: form.song_title.trim(),
      artist_name: form.artist_name.trim(),
      song_link: safeLink(form.song_link.trim()),
    };
    if (!values.song_title || !values.artist_name || !values.song_link) {
      setError("Enter a title, artist and a valid http or https song link."); return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const request = editing
        ? supabase.from("songs").update(values).eq("id", editing).eq("user_id", user.id).select("id")
        : supabase.from("songs").insert([{ ...values, user_id: user.id }]).select("id");
      const result = await request;
      if (result.error) throw result.error;
      if (!result.data?.length) throw new Error("No saved record");
      setMessage(editing ? "Song updated." : "Song saved.");
      record((editing ? "Updated: " : "Added: ") + values.song_title);
      setForm({ song_title: "", artist_name: "", song_link: "" }); setEditing(null);
      await fetchSongs(user.id);
    } catch { setError("The song could not be saved. Check your connection and account permissions, then try again."); }
    finally { setBusy(false); }
  }

  async function remove(song) {
    if (busy || !user || !window.confirm('Remove "' + song.song_title + '" from your saved song list? This removes the record, not the original media.')) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await supabase.from("songs").delete().eq("id", song.id).eq("user_id", user.id).select("id");
      if (result.error || !result.data?.length) throw result.error || new Error("No record removed");
      if (editing === song.id) { setEditing(null); setForm({ song_title: "", artist_name: "", song_link: "" }); }
      setSongs(items => items.filter(item => item.id !== song.id));
      setMessage("Song record removed."); record("Removed: " + song.song_title);
    } catch { setError("The record could not be removed. Your account may not have permission."); }
    finally { setBusy(false); }
  }

  function prepare(song) {
    const link = safeLink(song.song_link);
    if (!link) { setError("Edit this song to provide a valid link first."); return; }
    setCampaign('Discover "' + song.song_title + '" by ' + song.artist_name + '.\n\nListen or watch: ' + link + '\n\nExplore books, music and videos at Dr Paul’s Digital Library: https://www.drpaulslibrary.com/\n\n#DrPaulsDigitalLibrary');
    record("Prepared campaign copy: " + song.song_title);
    setMessage("Campaign copy prepared below. Nothing has been published.");
  }

  if (loading) return <main className="container"><h1>Loading your editor’s board…</h1></main>;
  return (
    <main className="container">
      <section className="hero">
        <h1>Music Promotion Editor’s Board</h1>
        <p>Save song links, edit your collection and prepare promotional messages.</p>
        {user && <p>Signed in as {user.email}</p>}
        {user && <button className="button" disabled={busy} onClick={async () => {
          const result = await supabase.auth.signOut();
          if (result.error) setError("Sign out failed. Please try again."); else router.replace("/login");
        }}>Sign out</button>}
        <p role="status" aria-live="polite">{message}</p>
        {error && <p role="alert">{error}</p>}
        {user && <>
          <h2>{editing ? "Edit song" : "Add a song link"}</h2>
          <p>This form saves a link to media hosted elsewhere. File uploading is not connected yet.</p>
          <form onSubmit={save} style={{ display: "grid", gap: 14, maxWidth: 720 }}>
            {[["song_title", "Song title"], ["artist_name", "Artist name"], ["song_link", "Song or advert URL"]].map(([key, label]) =>
              <label key={key}>{label}<input style={{ display: "block", width: "100%", padding: 12, boxSizing: "border-box" }}
                type={key === "song_link" ? "url" : "text"} required maxLength={key === "song_link" ? 2048 : 200}
                value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} disabled={busy} /></label>)}
            <button className="button" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Save song"}</button>
            {editing && <button type="button" disabled={busy} onClick={() => { setEditing(null); setForm({ song_title: "", artist_name: "", song_link: "" }); }}>Cancel editing</button>}
          </form>
          <h2>My saved songs ({songs.length})</h2>
          <label>Find a song<input type="search" value={query} onChange={e => setQuery(e.target.value)} style={{ margin: 12, padding: 12 }} /></label>
          {!songs.length && <p>No song links saved yet.</p>}
          {!!songs.length && !songs.some(s => (s.song_title + " " + s.artist_name).toLowerCase().includes(query.toLowerCase())) && <p>No matching songs.</p>}
          {songs.filter(s => (s.song_title + " " + s.artist_name).toLowerCase().includes(query.toLowerCase())).map(song =>
            <article key={song.id} style={{ border: "1px solid #64748b", padding: 20, margin: "16px 0", borderRadius: 12 }}>
              <h3>{song.song_title}</h3><p>{song.artist_name}</p>
              {safeLink(song.song_link) && <p><a href={safeLink(song.song_link)} target="_blank" rel="noopener noreferrer">Open song or video ↗</a></p>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <button disabled={busy} onClick={() => { setEditing(song.id); setForm({ song_title: song.song_title, artist_name: song.artist_name, song_link: song.song_link }); setError(""); setMessage("Song loaded into the editing form above."); }}>Edit</button>
                <button disabled={busy} onClick={() => prepare(song)}>Prepare advert copy</button>
                <button disabled={busy} onClick={() => remove(song)}>Remove record</button>
              </div>
            </article>)}
          {campaign && <section aria-label="Prepared campaign">
            <h2>Your campaign draft</h2><p>Review and edit before sharing. This board does not publish automatically.</p>
            <textarea aria-label="Campaign draft" rows={9} value={campaign} onChange={e => setCampaign(e.target.value)} style={{ width: "100%", padding: 12, boxSizing: "border-box" }} />
            <button onClick={async () => { try { await navigator.clipboard.writeText(campaign); setMessage("Campaign copy copied."); } catch { setError("Copy is unavailable. Select the text and copy it manually."); } }}>Copy text</button>
          </section>}
          <h2>Activity this session</h2>
          <p>Session activity is cleared when you reload. This is not a permanent publishing log.</p>
          {activity.length ? <ul>{activity.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p>No changes made this session.</p>}
        </>}
      </section>
    </main>
  );
}
