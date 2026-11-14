'use client';
import {useEffect} from 'react';

export default function Home() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (params.get('type') === 'recovery') {
      window.location.replace('/update-password' + window.location.hash);
    }
  }, []);
  return (
    <main className="container">
      <section className="hero">
        <h1>My Music Promotion Secretary</h1>

        <p>
          A smart SaaS platform helping artists upload songs successfully,
          manage music promotion, prepare campaigns, and automate their music
          marketing.
        </p>

        <a className="button" href="/join">
          Register as an artist
        </a>

        <p><a href="/login">Already registered? Sign in</a> · <a href="/pricing">View plans</a> · <a href="/update-password">Reset app password</a></p>

        <a className="button" href="/dashboard">
          Go to Dashboard
        </a>
      </section>
    </main>
  );
}
