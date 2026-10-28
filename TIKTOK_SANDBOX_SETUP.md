# TikTok Sandbox status — 28 October 2026

## Verified private pilot
- Isolated website: https://music-promotion-secretary-tiktok-sa.vercel.app
- Vercel project: music-promotion-secretary-tiktok-sandbox; branch prepare/tiktok-sandbox-isolation.
- Supabase project: slvhnpagtsprmivaujav, eu-central-2.
- Owner email sign-in verified and owner access enabled in the test database.
- TikTok Sandbox OAuth connected Dr Paul (@dr.paul5245).
- Sandbox callback and URL ownership property verified.
- TikTok enabled=true, url_verified=true, audited=false. Subscriber launch remains closed.
- Owner explicitly reviewed and submitted “A Beautiful Life — Private Test” with Only me visibility, interactions off and AI disclosure on.
- Owner confirmed playback in TikTok's private posts.
- Database result: state=nonpublic, providerStatus=PUBLISH_COMPLETE.
- Synchronous existing-result check deployed in commit 68aceda79e90a97cae8cd151a7f0c08563e01e8b; Vercel deployment 48pzN9DT48V9hxGnWyoq4UHYUHH1 Ready.
- 98 tests and Sandbox fixture build passed before that deployment.
- Production database, credentials and website remain unchanged.

## Scheduled worker: installation blocked
The owner authorized completing the Sandbox worker. pg_cron and pg_net were enabled in the isolated database.
The prepared database/tiktok-sandbox-worker.sql calls only the Sandbox /api/tiktok/dispatch endpoint using short-lived single-use nonces.
Two installation requests returned Invalid or expired requestState. A subsequent read confirmed wake_tiktok_dispatch() does not exist.
Do not describe scheduling as operational. No scheduled test was submitted; pending post count was zero.
Browser session became unavailable and its replacement inventory has no open tabs.
Resume by installing the reviewed worker in the test database, verifying the cron job, then testing an empty dispatch and checking its response before any owner-authorized scheduled post.
Do not install the original tiktok-publishing.sql wakeup section: it points at the production website.

## Configuration boundaries
MUSIC_APP_ENV=sandbox; MUSIC_SANDBOX_ORIGIN is the exact stable origin above.
Use separate NEXT_PUBLIC_SUPABASE_URL and browser-safe key, BILLING_MODE=test,
TIKTOK_SANDBOX_CLIENT_KEY/SECRET and a separate 64-character hex encryption key.
Never copy production OAuth, billing, database or worker credentials.
Auth Site URL is the stable Sandbox origin; allowed email redirect is its /dashboard URL.
All public tables have RLS. Private tables are intentionally closed.
Latest advisor also reported leaked password protection disabled; no auth protections were changed.
No TikTok audit, public-publishing approval, demo recording or review submission has been completed.
