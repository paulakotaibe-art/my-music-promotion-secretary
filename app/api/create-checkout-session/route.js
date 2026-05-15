import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const priceMap = {
  starter: "price_1TSvMnLLCK65C4jJWDUCrUNn",
  growth: "price_1TSvQFLLCK65C4jJ2tMkf68m",
  executive: "price_1TSvRaLLCK65C4jJkTGmSnHV",
};

export async function POST(request) {
  try {
    const { plan } = await request.json();

    const priceId = priceMap[plan];

    if (!priceId) {
      return Response.json(
        { error: "Invalid subscription plan." },
        { status: 400 }
      );
    }

    const origin = request.headers.get("origin");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      payment_method_types: ["card"],

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      success_url: `${origin}/dashboard?payment=success`,

      cancel_url: `${origin}/pricing?payment=cancelled`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
