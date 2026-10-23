"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import Campaigns from "./Campaigns";

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [songLink, setSongLink] = useState("");
  const [songs, setSongs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
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
      setErrorMessage(error.message);
      return;
    }

    setErrorMessage("");
    setSongs(data || []);
  };

  useEffect(() => {
    const protectDashboard = async () => {
      if (!supabase) {
        router.push("/login");
        return;
      }

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.push("/login");
        return;
      }

      setUser(user);
      try {
        await fetchSongs(user.id);
      } catch {
        setErrorMessage("Unable to load songs. Check your connection and retry.");
      } finally {
        setLoading(false);
      }
    };

    protectDashboard();
  }, [router]);

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
      setErrorMessage(error.message || "Unable to save. Please try again.");
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
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <main className="container studio-ui">
        <section className="hero dashboard-shell">
          <h1>Loading dashboard...</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="container studio-ui">
      <section className="hero dashboard-shell">
        <header className="studio-header"><div><span className="studio-eyebrow">MUSIC PROMOTION SECRETARY</span><h1>Your music. Your next move.</h1><p>Create a release, choose your audience, and watch your promotion take shape.</p></div><a className="studio-nav" href="/help">Help &amp; publishing guide →</a></header><div className="studio-workflow"><a href="#campaign-heading">01 · Create your post</a><span>02 · Review your release</span><span>03 · Publish &amp; track</span></div>

        <p>Welcome, {user?.email}</p><p><a className="button" href="/connections">Connect your YouTube channel</a></p>

        <button onClick={handleLogout} className="button">
          Logout
        </button>

        {user && <Campaigns user={user} />}
        <details className="listening-links"><summary>Saved listening links (optional)</summary>
        <p>Keep existing YouTube or song listening links here. Use the release studio above to upload and schedule media.</p>

        {errorMessage && <div role="alert"><p>{errorMessage}</p><button type="button" onClick={() => fetchSongs(user.id).catch(() => setErrorMessage("Unable to load songs. Please retry."))}>Reload songs</button></div>}
        {notice && <p role="status">{notice}</p>}
        <form onSubmit={handleSubmit} aria-label="Song details">
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
        )}
        </details>
      </section>
    </main>
  );
}
