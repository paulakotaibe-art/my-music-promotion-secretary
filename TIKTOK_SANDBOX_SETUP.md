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

## Scheduled worker: installed and infrastructure verified
Installed database/tiktok-sandbox-worker.sql in isolated project slvhnpagtsprmivaujav on 28 October 2026.
pg_cron job sandbox-tiktok-dispatch is active with schedule * * * * *.
A scheduled run succeeded at 16:43 GMT.
A separate authenticated empty HTTP dispatch returned 200 with {"claimed":0,"completed":0}, no timeout or error.
No pending posts existed and no new video was submitted.
The destination is exclusively https://music-promotion-secretary-tiktok-sa.vercel.app/api/tiktok/dispatch.
Short-lived single-use nonces authenticate requests; no static worker secret or production credential was added.
A real scheduled private publication still needs an explicit owner-reviewed post and its resulting completion check.
Do not claim that this empty infrastructure test demonstrates a scheduled video publication.

## Configuration boundaries
MUSIC_APP_ENV=sandbox; MUSIC_SANDBOX_ORIGIN is the exact stable origin above.
Use separate NEXT_PUBLIC_SUPABASE_URL and browser-safe key, BILLING_MODE=test,
TIKTOK_SANDBOX_CLIENT_KEY/SECRET and a separate 64-character hex encryption key.
Never copy production OAuth, billing, database or worker credentials.
Auth Site URL is the stable Sandbox origin; allowed email redirect is its /dashboard URL.
All public tables have RLS. Private tables are intentionally closed.
Latest advisor also reported leaked password protection disabled; no auth protections were changed.
No TikTok audit, public-publishing approval, demo recording or review submission has been completed.
