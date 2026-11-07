"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import Campaigns from "./Campaigns";
import {ENROLMENT_INTENT_KEY,readEnrolmentIntent} from "../../lib/enrolment.mjs";
import {withDeadline} from '../../lib/deadline.mjs';

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [songLink, setSongLink] = useState("");
  const [songs, setSongs] = useState([]);
  const [songsUnavailable, setSongsUnavailable] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState('');
  const [retry, setRetry] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState(null);

  const fetchSongs = async (userId) => {
    const { data, error } = await supabase
      .from("songs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      setSongsUnavailable(true);
      setErrorMessage('Saved listening links are unavailable right now. You can still use the release studio above.');
      return;
    }

    setSongsUnavailable(false);
    setErrorMessage("");
    setSongs(data || []);
  };

  useEffect(() => {
    let active=true;
    const protectDashboard = async () => {
      setLoading(true);setAccessError('');
      try {
      if(new URLSearchParams(window.location.hash.slice(1)).has('error')){router.replace('/login?notice=link');return;}
      if (!supabase) {
        router.push("/login");
        return;
      }

      const {
        data: { user },
        error,
      } = await withDeadline(()=>supabase.auth.getUser(),8000,'Sign-in check timed out. Check your connection and retry.');
      if(!active)return;

      if (error || !user) {
        router.push("/login");
        return;
      }

      try {
        const next=readEnrolmentIntent(localStorage.getItem(ENROLMENT_INTENT_KEY));
        localStorage.removeItem(ENROLMENT_INTENT_KEY);
        if(next&&next!=='/dashboard'){router.replace(next);return;}
      } catch {}
      setUser(user);
      try {
        await withDeadline(()=>fetchSongs(user.id),12000,'Song loading timed out.');
      } catch {
        setErrorMessage("Unable to load songs. Check your connection and retry.");
      } finally {
        if(active)setLoading(false);
      }
      }catch{
        if(active){setAccessError('We could not verify your sign-in. Check your connection and retry, or request a fresh sign-in link.');setLoading(false);}
      }
    };

    protectDashboard();
    return()=>{active=false;};
  }, [router,retry]);


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      alert("Please login again.");
      router.push("/login");
      return;
    }

    setNotice("");
    setErrorMessage("");
    const title = songTitle.trim();
    const artist = artistName.trim();
    let url;
    try {
      url = new URL(songLink.trim());
      if (!["https:", "http:"].includes(url.protocol)) throw new Error();
    } catch {
      setErrorMessage("Enter a valid song link starting with https:// or http://.");
      return;
    }
    if (!title || !artist) {
      setErrorMessage("Enter a song title and artist name.");
      return;
    }
    setSaving(true);
    try {
      const details = {song_title: title, artist_name: artist, song_link: url.href};
      const result = editingId
        ? await supabase.from("songs").update(details).eq("id", editingId).eq("user_id", user.id).select("id")
        : await supabase.from("songs").insert([{...details, user_id: user.id}]).select("id");
      if (result.error) throw result.error;
      if (!result.data?.length) throw new Error("The song was not saved. Refresh and try again.");
      setSongTitle(""); setArtistName(""); setSongLink(""); setEditingId(null);
      setNotice(editingId ? "Song updated successfully." : "Song saved successfully.");
      await fetchSongs(user.id);
    } catch (error) {
      setErrorMessage("The listening link could not be saved. Check your connection and retry.");
    } finally {
      setSaving(false);
    }
  };

  const editSong = (song) => {
    setEditingId(song.id); setSongTitle(song.song_title);
    setArtistName(song.artist_name || ""); setSongLink(song.song_link || "");
    setErrorMessage(""); setNotice("");
  };

  const handleLogout = async () => {
    setLogoutError('');
    try{
      const {error}=await withDeadline(()=>supabase.auth.signOut(),8000,'Sign-out timed out.');
      if(error)throw error;
      setUser(null);setSongs([]);setLoading(true);router.replace('/login');
    }catch{setLogoutError('Sign-out could not be confirmed. Check your connection and try again.');}
  };

  if(accessError)return <main id="main-content" tabIndex={-1} className="container studio-ui"><section className="hero dashboard-shell"><h1>Check your sign-in</h1><p role="alert">{accessError}</p><button className="button" onClick={()=>setRetry(n=>n+1)}>Retry sign-in check</button><p><a href="/login">Request a new sign-in link</a></p></section></main>;

  if (loading) {
    return (
      <main id="main-content" tabIndex={-1} className="container studio-ui">
        <section className="hero dashboard-shell">
          <h1>Loading dashboard...</h1><p role="status">Checking your sign-in.</p>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="container studio-ui">
      <section className="hero dashboard-shell">
        <header className="studio-header"><div><span className="studio-eyebrow">MUSIC PROMOTION SECRETARY</span><h1>Your music. Your next move.</h1><p>Create a release, choose your audience, and watch your promotion take shape.</p></div><a className="studio-nav" href="/help">Help &amp; publishing guide →</a></header><div className="studio-workflow"><a href="#campaign-heading">01 · Create your post</a><span>02 · Review your release</span><span>03 · Publish &amp; track</span></div>

        <p>Welcome, {user?.email}</p><p><a href="/get-started">Artist setup guide</a> · <a href="/publishing-status">Publishing access</a> · <a href="/youtube-test">YouTube studio</a> · <a href="/facebook">Facebook studio</a> · <a href="/tiktok">TikTok studio</a></p><p><a className="button" href="/connections">Connect your YouTube channel</a></p>

        <button onClick={handleLogout} className="button">
          Logout
        </button>
        {logoutError&&<p role="alert">{logoutError}</p>}

        {user && <Campaigns user={user} />}
        <details className="listening-links"><summary>Saved listening links (optional)</summary>
        <p>Keep existing YouTube or song listening links here. Use the release studio above to upload and schedule media.</p>

        {errorMessage && <div role="alert"><p>{errorMessage}</p><button type="button" onClick={() => fetchSongs(user.id).catch(() => setErrorMessage("Unable to load songs. Please retry."))}>Reload songs</button></div>}
        {notice && <p role="status">{notice}</p>}
        {!songsUnavailable&&<><form onSubmit={handleSubmit} aria-label="Song details">
          <input
            type="text"
            aria-label="Song title"
            placeholder="Song Title"
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            style={{ padding: "10px", margin: "10px", width: "80%" }}
            required
          />

          <input
            type="text"
            aria-label="Artist name"
            placeholder="Artist Name"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            style={{ padding: "10px", margin: "10px", width: "80%" }}
            required
          />

          <input
            type="text"
            aria-label="YouTube or song link"
            placeholder="YouTube / Song Link"
            value={songLink}
            onChange={(e) => setSongLink(e.target.value)}
            style={{ padding: "10px", margin: "10px", width: "80%" }}
            required
          />

          <br />

          <button type="submit" className="button" disabled={saving}>
            {saving ? "Saving..." : editingId ? "Update Song" : "Save Song"}
          </button>
          {editingId && <button type="button" disabled={saving} onClick={() => {setEditingId(null); setSongTitle(""); setArtistName(""); setSongLink("");}}>Cancel editing</button>}
        </form>



        <h2>My Saved Songs</h2>

        {songs.length === 0 ? (
          <p>No songs saved yet. Add your first song above.</p>
        ) : (
          songs.map((song) => (
            <div
              key={song.id}
              style={{
                background: "#f0f4ff",
                padding: "20px",
                margin: "15px 0",
                borderRadius: "10px",
              }}
            >
              <h3>{song.song_title}</h3>
              <p>Artist: {song.artist_name}</p>
              {/^https?:\/\//i.test(song.song_link || "") && <p><a style={{color: "#4338ca"}} href={song.song_link} target="_blank" rel="noopener noreferrer">Open song</a></p>}
              <button type="button" className="button" disabled={saving} onClick={() => editSong(song)}>Edit song</button>
            </div>
          ))
        )}</>}
        </details>
      </section>
    </main>
  );
}
