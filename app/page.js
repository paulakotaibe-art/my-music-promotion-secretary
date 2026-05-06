export default function Home() {
  return (
    <main className="container">
      <section className="hero">
        <h1>My Music Promotion Secretary</h1>

        <p>
          A smart SaaS platform helping artists upload songs, manage music
          promotion, prepare campaigns, and automate their music marketing.
        </p>

        <a className="button" href="/login">
          Artist Login
        </a>

        <br />
        <br />

        <a className="button" href="/dashboard">
          Go to Dashboard
        </a>
      </section>
    </main>
  );
}
