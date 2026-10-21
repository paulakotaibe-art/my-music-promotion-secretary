# Three-platform publishing rollout

## Delivered
- Private campaign drafts: title, caption, HTTPS media link, three platform choices, planned date, edit.
- Authenticated, read-only provider connection check with a server-controlled pilot user binding.
- No route schedules, publishes, or uploads media yet. Dates remain planning dates.

## Server configuration
Set sensitive variables in Vercel, never in NEXT_PUBLIC variables or repository files:
- METRICOOL_API_TOKEN: eligible Metricool account's REST API token.
- METRICOOL_USER_ID: Metricool account ID.
- METRICOOL_BRAND_ID: pilot brand ID.
- METRICOOL_PILOT_USER_ID: verified Supabase user UUID owning that brand.

Missing configuration leaves drafts usable and displays setup required. The connection check is read-only and does not prove publication permissions or media compatibility.

Official setup: https://help.metricool.com/basic-guide-for-api-integration-r97af
API access requires Advanced or Custom. The ChatGPT Metricool connection is separate.
Do not purchase an upgrade without reviewing costs and suitability for a customer-facing product.

## Remaining, in order
1. Confirm API eligibility and configure pilot credentials securely. Verify live read-only check.
2. Add durable media uploads and validation; collect YouTube audience/title and TikTok publishing options.
3. Add server-owned customer-to-brand bindings and a supported account connection flow; never reuse pilot brand for subscribers.
4. Implement scheduling with durable submission records, duplicate protection, provider IDs, cancellation, status reconciliation and clear retry handling.
5. Complete Stripe webhook verification, entitlements, limits and cancellation; supply owner with checkout test link when ready.
6. Reliable login email, onboarding, mobile verification, customer policies and support.
7. Run A Beautiful Life pilot across Facebook, TikTok and YouTube; verify public URLs and report results before advertising automation.
