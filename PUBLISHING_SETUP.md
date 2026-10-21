# Three-platform publishing rollout

## Delivered
- Private campaign drafts for YouTube, Facebook and TikTok.
- A registered Metricool public OAuth client with authorization-code flow and S256 PKCE.
- Ten-minute encrypted HttpOnly/Secure state cookie, fixed production callback, server-verified Supabase identity.
- Per-user encrypted OAuth token storage protected by database ownership policies.
- Read-only MCP account verification and local disconnect endpoint.
- Three-platform scheduling preview and explicit confirmation, with brand, audience, privacy and rights choices.
- Durable per-user submission attempts, one attempt per draft, and signed provider acceptance/uncertainty results.
- Direct video URLs are supported; binary upload and full media validation remain pending.

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
Production build and eight tests pass, covering scheduling validation, signed evidence and no automatic retry of uncertain writes. Database checks cover duplicate attempts and owner isolation. Owner OAuth consent and live MCP account verification succeeded. No live scheduling/publication test has been completed.

## Scheduling pilot behavior
Select a saved draft with a future date (at least ten minutes ahead). Video destinations require a direct HTTPS MP4, MOV or WebM URL, not a watch-page link. Preview verifies connected destinations. The five-minute encrypted preview ticket is bound to the signed-in user; only explicit confirmation attempts provider scheduling.

A unique database record is created before the external write. Each draft permits one attempt; an uncertain outcome must be checked in Metricool before deliberately creating a new draft. The app never automatically retries a write. Accepted means provider acceptance, not published. Submission evidence is signed to distinguish verified server results from client-modified records. Provider format/duration checks still apply.

## Remaining in order
1. Run A Beautiful Life with original video media, chosen publication time, audience and privacy settings; verify queue, public posts and reporting. Add status reconciliation and cancellation.
2. Implement automatic OAuth refresh/rotation (expired connections currently require reconnect), disconnect UI, durable uploads and stronger media validation.
3. Confirm Metricool supports this customer-facing OAuth use and document provider limits and costs before public customer launch.
4. Add OpenAI caption/campaign assistance with measured usage limits; no OpenAI spend is enabled now.
5. Complete Stripe webhooks, entitlements, plan limits and cancellation. Provide owner a checkout link when ready to test.
6. Improve email delivery, onboarding, policies and mobile verification before advertising.
