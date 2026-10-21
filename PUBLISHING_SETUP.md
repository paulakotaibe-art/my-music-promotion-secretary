# Three-platform publishing rollout

## Delivered
- Private campaign drafts for YouTube, Facebook and TikTok.
- A registered Metricool public OAuth client with authorization-code flow and S256 PKCE.
- Ten-minute encrypted HttpOnly/Secure state cookie, fixed production callback, server-verified Supabase identity.
- Per-user encrypted OAuth token storage protected by database ownership policies.
- Read-only MCP account verification and local disconnect endpoint.
- Three-platform scheduling preview and explicit confirmation, with brand, audience, privacy and rights choices.
- Durable per-user submission attempts, one attempt per draft, and signed provider acceptance/uncertainty results.
- Resumable browser-to-storage uploads for video/audio (50 MB) and album artwork (5 MB), generated public file links, progress and previews. No Vercel function payload proxy is used.
- Optional public album pages with audio/video playback and social Open Graph metadata; private by default. Promotional uploads are public by link, explicitly acknowledged before upload.
- Audio shares its public album page and cover on Facebook. YouTube/TikTok require a video version; audio-to-video rendering is not implemented. Video artwork is passed as videoThumbnailUrl; provider/platform support determines whether it is used.

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
Production build and eleven tests pass, covering scheduling validation, signed evidence and no automatic retry of uncertain writes. Database checks cover duplicate attempts and owner isolation. Owner OAuth consent and live MCP account verification succeeded. No live scheduling/publication test has been completed.

## Scheduling pilot behavior
Select a saved draft with a future date (at least ten minutes ahead). Video destinations require a direct HTTPS MP4, MOV or WebM URL, not a watch-page link. Preview verifies connected destinations. The five-minute encrypted preview ticket is bound to the signed-in user; only explicit confirmation attempts provider scheduling.

A unique database record is created before the external write. Each draft permits one attempt; an uncertain outcome must be checked in Metricool before deliberately creating a new draft. The app never automatically retries a write. Accepted means provider acceptance, not published. Submission evidence is signed to distinguish verified server results from client-modified records. Provider format/duration checks still apply.

## Remaining in order
1. Verify a signed-in browser upload and actual social link preview; automated tests cover file validation and database access rules, not a complete live browser upload. Then run A Beautiful Life with original video media, chosen publication time, audience and privacy settings; verify queue, public posts and reporting. Add status reconciliation and cancellation.
2. Implement automatic OAuth refresh/rotation (expired connections currently require reconnect), disconnect UI, storage lifecycle/quota enforcement and stronger binary/media validation. Upload replacement creates immutable new object names; removing from a draft does not delete the stored file. No automatic deletion of scheduled-post assets. Public page hiding does not revoke public file links.
3. Confirm Metricool supports this customer-facing OAuth use and document provider limits and costs before public customer launch.
4. Add OpenAI caption/campaign assistance with measured usage limits; no OpenAI spend is enabled now.
5. Complete Stripe webhooks, entitlements, plan limits and cancellation. Provide owner a checkout link when ready to test.
6. Improve email delivery, onboarding, policies and mobile verification before advertising.

## Upload rollout verification
Applied promotion_uploads_and_album_pages migration. A rolled-back transaction verified owner-folder uploads, foreign-folder rejection, anonymous public/private page isolation and denial of account-ID reads. Existing security advisor warnings for rls_auto_enable and leaked-password protection are unchanged; no new storage/table findings.

The current attached advert is about 64 MB and needs a smaller export for the 50 MB pilot limit. Do not promise arbitrary file sizes or automatic audio-to-video conversion. Social platforms may crop artwork or cache link previews; public-page metadata is not a guarantee of identical native presentation.
