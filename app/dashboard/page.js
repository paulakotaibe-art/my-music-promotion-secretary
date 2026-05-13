"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [songLink, setSongLink] = useState("");
  const [songs, setSongs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSongs = async () => {
    const { data, error } = await supabase
      .from("songs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

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
      await fetchSongs();
      setLoading(false);
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

    setSaving(true);

    const { error } = await supabase.from("songs").insert([
      {
        song_title: songTitle,
        artist_name: artistName,
        song_link: songLink,
      },
    ]);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Song saved successfully!");

    setSongTitle("");
    setArtistName("");
    setSongLink("");

    await fetchSongs();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <main className="container">
        <section className="hero">
          <h1>Loading dashboard...</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="container">
      <section className="hero">
        <h1>Artist Dashboard</h1>

        <p>Welcome, {user?.email}</p>

        <button onClick={handleLogout} className="button">
          Logout
        </button>

        <p>Upload and manage your own song promotion details.</p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Song Title"
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            style={{ padding: "10px", margin: "10px", width: "80%" }}
            required
          />

          <input
            type="text"
            placeholder="Artist Name"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            style={{ padding: "10px", margin: "10px", width: "80%" }}
            required
          />

          <input
            type="text"
            placeholder="YouTube / Song Link"
            value={songLink}
            onChange={(e) => setSongLink(e.target.value)}
            style={{ padding: "10px", margin: "10px", width: "80%" }}
            required
          />

          <br />

          <button type="submit" className="button" disabled={saving}>
            {saving ? "Saving..." : "Save Song"}
          </button>
        </form>

        <hr style={{ margin: "40px 0" }} />

        <h2>My Saved Songs</h2>

        {songs.length === 0 ? (
          <p>No songs uploaded yet.</p>
        ) : (
          songs.map((song) => (
            <div
              key={song.id}
              style={{
                background: "#111827",
                padding: "20px",
                margin: "15px 0",
                borderRadius: "10px",
              }}
            >
              <h3>{song.song_title}</h3>
              <p>Artist: {song.artist_name}</p>
              <p>Link: {song.song_link}</p>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
