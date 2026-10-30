import HomeEmailReturn from './components/HomeEmailReturn';
export default function Home() {
  return (
    <main className="container">
      <HomeEmailReturn><section className="hero">
        <h1>My Music Promotion Secretary</h1>

        <p>
          A smart SaaS platform helping artists upload songs successfully,
          manage music promotion, prepare campaigns, and automate their music
          marketing.
        </p>

        <a className="button" href="/join">
          Register as an artist
        </a>

        <p><a href="/login">Already registered? Sign in</a> · <a href="/pricing">View plans</a></p>

        <a className="button" href="/dashboard">
          Go to Dashboard
        </a>
      </section></HomeEmailReturn>
    </main>
  );
}
