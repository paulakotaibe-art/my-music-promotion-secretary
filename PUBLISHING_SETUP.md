# Three-platform publishing rollout

## Delivered
- Private campaign drafts for YouTube, Facebook and TikTok.
- A registered Metricool public OAuth client with authorization-code flow and S256 PKCE.
- Ten-minute encrypted HttpOnly/Secure state cookie, fixed production callback, server-verified Supabase identity.
- Per-user encrypted OAuth token storage protected by database ownership policies.
- Read-only MCP account verification and local disconnect endpoint.
- No media upload, scheduling or publishing route is enabled yet.

## Production configuration
- METRICOOL_OAUTH_CLIENT_ID: registered public client ID.
- METRICOOL_OAUTH_ENCRYPTION_KEY: 32-byte AES key encoded as 64 hex characters. Keep server-side and preserve across releases; changing it invalidates saved connections.
- Existing NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
- No paid Metricool REST API token or OpenAI API key is required for this connection stage.

Callback: https://my-music-promotion-secretary-x96x.vercel.app/api/integrations/metricool/callback
Open the production dashboard, select Connect Metricool, authorize, then Check publishing connection.
A chat connector authorization cannot be reused by the deployed app.

## Verification completed
Provider registration returned HTTP 201 and accepted the production callback, public-client authentication and requested MCP scopes.
Local tests cover encryption tampering, PKCE/state expiry and a read-only MCP account handshake.
Database transaction checks owner read/write and cross-account isolation, then rolls back test data.
Production build passes. User authorization and a real MCP account check remain to be completed after deployment.

## Remaining in order
1. Complete owner consent and verify live MCP account-tool name/response compatibility. Reconnect is currently required after access-token expiry; automatic refresh and rotation are pending.
2. Confirm Metricool supports this customer-facing OAuth use and document provider limits and costs.
3. Add brand selection, disconnect UI, durable media upload/validation, YouTube audience choices and TikTok settings.
4. Add scheduling with durable records, duplicate protection, provider IDs, cancellation and status reconciliation.
5. Add OpenAI caption/campaign assistance only after publishing integration works, with measured usage limits; no OpenAI spend is enabled now.
6. Complete Stripe webhooks, entitlements, plan limits and cancellation. Provide owner a checkout link when ready to test.
7. Improve email delivery, onboarding, policies, mobile verification, then run A Beautiful Life pilot and verify public posts and reporting.
