export default function CancelPage() {
  return (
    <main className="container">
      <section className="hero">
        <h1>Subscription Not Completed</h1>

        <p>
          Your payment was not completed. You can return to the pricing page
          and try again when you are ready.
        </p>

        <a className="button" href="/pricing">
          Return to Pricing
        </a>
      </section>
    </main>
  );
}
