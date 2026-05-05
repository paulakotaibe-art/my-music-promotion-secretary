export default function SuccessPage() {
  return (
    <main className="container">
      <section className="hero">
        <h1>Subscription Successful</h1>

        <p>
          Thank you for subscribing to My Music Promotion Secretary.
          Your artist promotion account is being prepared.
        </p>

        <p>
          Next, you will be guided to upload your song details and begin your
          music promotion setup.
        </p>

        <a className="button" href="/dashboard">
          Go to Artist Dashboard
        </a>
      </section>
    </main>
  );
}
