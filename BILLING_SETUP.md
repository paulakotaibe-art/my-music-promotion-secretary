# Subscriber launch and billing

Implemented catalog: Starter GBP7.99/month, 3 promotions/week, queue12; Growth GBP14.99,10/week,queue40; Executive GBP24.99,25/week,queue100. Launch trial:7days/3total. All include one artist profile with up to the three supported networks. AI is not active or advertised as included.

## Security and accounting

`app_private` stores billing and owner roles, with RLS and no client table privileges. Public RPC wrappers are security invoker. Narrow private functions enforce either auth.uid ownership or a 256-bit bridge credential held only in Vercel's sensitive BILLING_BRIDGE_TOKEN. Its SHA256 hash is provisioned directly into billing_config; never commit the token. The credential cannot edit owner roles or turn on launch. This avoids adding a broad service-role credential to the app.

A BEFORE INSERT trigger obtains a per-user transaction lock and claims the allowance before any provider write. All existing submissions were explicitly grandfathered; owner exemptions use a verified database role. Attempts are immutable except signed receipt fields. One asset sent to three networks consumes one promotion. Weeks follow the publication date, Monday–Sunday Europe/London including DST. Drafts/previews consume zero. Explicit service rejections release a reservation via the server bridge; ambiguous outcomes remain held. A failed refund safely retains the reservation for manual investigation. No automatic publishing retries.

Subscriber publishing and live checkout remain CLOSED (subscriber_launch=false) until commercial terms, pilot publication, support/tax readiness and payment testing are verified. Owner publishing remains available.

Subscriptions only become entitlements following signature-verified Stripe events and a fresh Stripe subscription read. We validate customer binding, server plan, quantity, currency, amount and recurrence; test subscriptions never grant live publishing. Billing failures and expired/cancelled subscriptions remove paid allowance. Existing future provider posts are not automatically cancelled when a subscription ends; new schedules are bounded to the current paid term. Trials are bounded to their seven-day term. No automatic refunds or recovery of externally deleted posts yet.

## Owner payment test

Visit `/billing-test`, signed in as the verified owner. Prepare secure payment test checks that the configured Stripe key is TEST, creates its webhook and cancellation portal configuration, and stores the signing secret in the private configuration. The signing secret is never returned to the client. Existing webhook with lost secret requires secure owner configuration rather than blind duplication. No live key is used by this setup operation. Keep STRIPE_SECRET_KEY unchanged. Add STRIPE_TEST_SECRET_KEY in Vercel. BILLING_MODE defaults to test; missing or invalid test credentials fail closed and never fall back to live credentials. Never paste secrets into chat.

Choose a plan and finish Stripe test checkout. Confirm verified test subscription on dashboard, replay webhook without duplicated state, test card failure, cancel in portal, and verify no live quota is granted. Checkout return query is never payment proof. Test and live customers are stored separately.

Before real launch: configure the LIVE key and matching LIVE webhook secret and portal in their separate live configuration fields; retain the test configuration. Explicitly set BILLING_MODE=live only after launch readiness is confirmed, confirm tax/customer terms, and validate live Stripe portal configuration. Only then may an administrator enable subscriber_launch directly in the database. Do not enable it from a browser or customer-controlled metadata. Current single switch deliberately gates both paying signups and subscriber publication.

## Publishing vendor assessment (22 October 2026)

- Metricool: existing OAuth/MCP pilot works. White Label for Integrators is the relevant commercial integration offering. Current account authorization is not proof of permission to resell embedded publishing. Obtain a written quote/terms covering independent subscribers, in-app connection flow, all3networks, media, scheduled status/webhooks, support and per-brand costs. https://help.metricool.com/white-label-for-integrators-wli-214tf
- Ayrshare: explicitly built for multi-customer SaaS. Launch USD299/month up to10profiles and Business USD599/month including30profiles were advertised. This is an expensive minimum relative to GBP7.99/month launch pricing. https://www.ayrshare.com/pricing/
- Zernio (formerly Late): API supports the three networks, unlimited posts and status webhooks. Two accounts free, then pay per connected account; published 10-account example is USD48/month. Each artist using3networks consumes3accounts. Do not confuse an account with an artist/brand or assume volume tiers apply to every account retroactively. Confirm exact graduated quote at launch size. https://zernio.com/pricing

Recommendation: retain the Metricool owner pilot. Do not buy or migrate until a commercial quote demonstrates a sustainable cost per artist. These prices are provisional until vendor cost and tax are confirmed. No vendor account, contract or paid plan was purchased for this comparison. OpenAI can power captions/content assistance, not replace social authorization, scheduling infrastructure or platform publication permissions.

## Verification

Run `node --test tests/*.test.mjs` and `npm run build`. Run database/test-billing.sql as a single transaction; fixtures roll back. It checks launch closure, invalid bridge auth, three-trial limit, spoofed exemptions, owner exemption, immutable quota privileges, test/live separation, paid weekly allowance, failed payment removal, paid-term bound and DST. It never writes to the publishing provider.


### Recover an existing sandbox endpoint

If setup finds a webhook but its one-time signing secret was not saved, reveal the signing secret for this app’s endpoint in Stripe’s TEST Workbench. Add it in Vercel as sensitive STRIPE_TEST_WEBHOOK_SECRET (Production). Redeploy, then run Prepare secure payment test. The server uses that mode-specific secret without changing the live API key, live webhook configuration, or creating a duplicate endpoint. STRIPE_WEBHOOK_SECRET is the separate optional live equivalent. Never paste either secret in chat or commit it.
