"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!supabase) {
      alert("Supabase is not connected.");
      return;
    }

    setSending(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          "https://my-music-promotion-secretary-x96x-kgwnhtbi5.vercel.app/dashboard",
      },
    });

    setSending(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Login link sent. Please check your email.");
    setEmail("");
  };

  return (
    <main className="container">
      <section className="hero">
        <h1>Artist Login</h1>
        <p>Enter your email to receive a secure login link.</p>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "10px", margin: "10px", width: "80%" }}
            required
          />

          <br />

          <button type="submit" className="button" disabled={sending}>
            {sending ? "Sending..." : "Send Login Link"}
          </button>
        </form>
      </section>
    </main>
  );
}
