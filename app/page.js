"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!supabase) {
      alert("Supabase is not connected. Check Vercel environment variables.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Check your email for login link!");
    }
  };

  return (
    <main className="container">
      <section className="hero">
        <h1>Artist Login</h1>

        <p>Login securely to access your music promotion dashboard.</p>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "10px", margin: "10px", width: "80%" }}
            required
          />

          <br />

          <button type="submit" className="button">
            Send Login Link
          </button>
        </form>
      </section>
    </main>
  );
}
