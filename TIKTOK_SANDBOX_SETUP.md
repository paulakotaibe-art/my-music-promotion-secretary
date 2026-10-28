# TikTok Sandbox preparation — 28 October 2026

## Status

This branch prepares configuration isolation. No hosted Sandbox deployment, separate database,
OAuth connection, TikTok video submission, demo recording or app approval is established by this change.
Production credentials, database settings and rollout flags have not been changed.

The existing production website origin remains the default. Vercel Preview builds must explicitly
use Sandbox mode. Sandbox builds and API imports reject the known production database, the production
website, inherited production TikTok keys, unrelated platform credentials and live billing mode.
The Sandbox page displays a testing banner. Its own database must contain only test accounts/data.

## Required isolated configuration

Use a branch-scoped Vercel Preview environment for `prepare/tiktok-sandbox-isolation` with a stable
branch URL, or a separate test project. Do not modify the existing Production variables.
Do not promote this preview into the production project.

| Variable | Sandbox value |
| --- | --- |
| `MUSIC_APP_ENV` | `sandbox` |
| `MUSIC_SANDBOX_ORIGIN` | Exact stable HTTPS test website origin, without trailing slash or path |
| `NEXT_PUBLIC_SUPABASE_URL` | Separate test project's `https://<ref>.supabase.co` origin |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Test project's browser-safe key; never a service-role key |
| `METRICOOL_OAUTH_ENCRYPTION_KEY` | Newly generated 64-character hexadecimal key, unique to this test environment |
| `TIKTOK_SANDBOX_CLIENT_KEY` | Client key from TikTok Sandbox 7699826491051280390 |
| `TIKTOK_SANDBOX_CLIENT_SECRET` | Matching Sandbox secret, entered securely in Vercel |
| `BILLING_MODE` | `test`; no Stripe keys are needed for this pilot |

The Sandbox keys are used consistently by authorization, exchange, readiness and renewal.
Missing Sandbox keys never fall back to the production `TIKTOK_CLIENT_*` values.
Neither the app ID nor organization ID is a client key.

## Database and hosting prerequisites

1. Select the Supabase organization and check the actual cost before provisioning. Do not buy an upgrade.
2. Install a reviewed schema-only copy in the separate project. Do not copy production users, media,
   social connections, encrypted tokens, billing records, bridge secrets, dispatch secrets or worker jobs.
   Existing SQL scripts have dependencies; inspect and verify installation order rather than executing
   every script alphabetically. Default all subscriber and platform rollout gates to false.
3. Create a test owner account, test-only media storage and a separate worker configuration. Check RLS,
   owner identity, encrypted token storage, test origin and dispatch destinations before enabling any gate.
   Authorizing Sandbox OAuth must write only to the test project's `social_connections` table.
4. Build using the isolated settings. Confirm no existing queued/building/ready deployment of that commit
   before requesting another. Keep existing deployment protection intact. If TikTok cannot reach the
   selected public callback/media path under the protection settings, resolve the hosting design before
   testing; never place protection bypass secrets into URLs or TikTok settings.
5. In the TikTok Sandbox portal, use the exact test website, its public `/terms` and `/privacy`, and
   `<MUSIC_SANDBOX_ORIGIN>/api/integrations/social/tiktok/callback` for Login Kit. Verify the test URL/media
   property as TikTok requires; production URL verification does not verify another hostname.

## Genuine demo still required

The app requests `user.info.basic` and `video.publish`. It has no draft-upload flow using `video.upload`.
The portal's included scopes must be assessed against actual review requirements; do not claim an
unimplemented scope has been demonstrated. Use authorized target user `dr.paul5245` only after checking
the Sandbox portal settings. Keep the production form as a draft.

Record the real test website, connection and consent, connected creator, owned MP4 preview, editable
caption, account-supported privacy and interactions, disclosures/music consent and explicit final review.
Publishing and scheduled pilot actions require the owner's authorization. Keep the test private and
subscriber publishing closed. Show the actual result or blocker without manufacturing a success screen.
Never include keys, tokens or secret settings in the recording. Upload the resulting recording only
when it accurately demonstrates the requested integration; submitting app review is a separate step.

## Checks

`node --test tests/*.test.mjs` includes callback/exchange consistency, Sandbox-only token renewal,
production credential preservation, blocked production database access and build/runtime safeguards.
These mocked tests establish configuration behavior, not a live TikTok integration.
