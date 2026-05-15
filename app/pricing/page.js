"use client";

import { useState } from "react";

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState("");

  const startCheckout = async (plan) => {
    try {
      setLoadingPlan(plan);

      const response = await fetch(
        "/api/create-checkout-session",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({ plan }),
        }
      );

      const data = await response.json();

      if (data.error) {
        alert(data.error);
        setLoadingPlan("");
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      alert("Something went wrong.");
      setLoadingPlan("");
    }
  };

  return (
    <main className="container">
      <section className="hero">
        <h1>Choose Your Artist Plan</h1>

        <p>
          Start promoting your music professionally.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "20px",
            marginTop: "40px",
          }}
        >
          <div style={cardStyle}>
            <h2>Starter Artist</h2>

            <h3>£5/month</h3>

            <p>
              Perfect for upcoming artists.
            </p>

            <button
              className="button"
              onClick={() =>
                startCheckout("starter")
              }
              disabled={loadingPlan === "starter"}
            >
              {loadingPlan === "starter"
                ? "Loading..."
                : "Subscribe"}
            </button>
          </div>

          <div style={cardStyle}>
            <h2>Growth Artist</h2>

            <h3>£10/month</h3>

            <p>
              Stronger campaign and promotion support.
            </p>

            <button
              className="button"
              onClick={() =>
                startCheckout("growth")
              }
              disabled={loadingPlan === "growth"}
            >
              {loadingPlan === "growth"
                ? "Loading..."
                : "Subscribe"}
            </button>
          </div>

          <div style={cardStyle}>
            <h2>Executive Artist</h2>

            <h3>£20/month</h3>

            <p>
              Premium artist growth tools and support.
            </p>

            <button
              className="button"
              onClick={() =>
                startCheckout("executive")
              }
              disabled={loadingPlan === "executive"}
            >
              {loadingPlan === "executive"
                ? "Loading..."
                : "Subscribe"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

const cardStyle = {
  background: "#111827",
  padding: "25px",
  borderRadius: "14px",
  textAlign: "center",
};
