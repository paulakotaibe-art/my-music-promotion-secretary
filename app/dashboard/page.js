"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function DashboardPage() {
  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [songLink, setSongLink] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from("songs").insert([
        {
          song_title: songTitle,
          artist_name: artistName,
          song_link: songLink,
        },
      ]);

      if (error) {
        alert("Error saving song");
        console.log(error);
      } else {
        alert("Song saved successfully!");
        setSongTitle("");
        setArtistName("");
        setSongLink("");
      }
    } catch (err) {
      console.log("Unexpected error:", err);
      alert("Something went wrong");
    }
  };

  return (
    <main className="container">
      <section className="hero">
        <h1>Artist Dashboard</h1>

        <p>Upload and manage your song promotion details.</p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Song Title"
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            style={{ padding: "10px", margin: "10px", width: "80%" }}
          />

          <input
            type="text"
            placeholder="Artist Name"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            style={{ padding: "10px", margin: "10px", width: "80%" }}
          />

          <input
            type="text"
            placeholder="YouTube / Song Link"
            value={songLink}
            onChange={(e) => setSongLink(e.target.value)}
            style={{ padding: "10px", margin: "10px", width: "80%" }}
          />

          <br />

          <button type="submit" className="button">
            Save Song
          </button>
        </form>
      </section>
    </main>
  );
}
