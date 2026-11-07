# Independent work verification — 1 November 2026

Source baseline: 82f078d8e09eae725df906dedf66809bdf092b0f, branch prepare/tiktok-sandbox-isolation. This record accompanies the recovery/accessibility/local-test change set. Production publishing, live billing, grants and existing media/schedules were not changed.

| Track | Verified work completed locally | Acceptance still open |
|---|---|---|
| Subscription and queue limits | Existing allowance SQL plus new lifecycle and account-isolation SQL passed in a disposable in-memory PostgreSQL engine. Covers trial/tier/queue limits, London/DST arithmetic, failed payment recovery, renewal, expiry, cancellation state, duplicate/older event ordering and wrong-customer rejection. | Real parallel database sessions, deployed launch-candidate schema and Stripe test webhook lifecycle. A local fixture with livemode=true is synthetic data, not a live Stripe payment or entitlement change. |
| Expired-session and recovery | Added deadlines to sign-in/connection reads and email-link completion. Failed checks offer recovery instead of an endless dashboard spinner. Login checks verify the user. Account changes hide protected content and return to sign-in; no publishing write is retried. Three new unit tests cover missing/failed/stalled session reads, account-change classification and stalled email return. | Hydrated browser sign-out/account-switch exercise, real expired/revoked provider grant and slow-network recovery. |
| Accessibility and mobile | Added a keyboard skip link and one focusable main target per route, fixed invalid status roles, long-identifier wrapping and the footer's inherited full-screen minimum height. Axe 4.14.0 / jsdom 30.1.3 scan: 17 rendered routes, zero reported violations with colour contrast disabled. | Actual viewport measurements, keyboard focus traversal, contrast, screen-reader and hydrated customer-state acceptance for this change set. Prior 30 October 375px checks remain historical evidence. |
| Support/deletion and review preparation | SUPPORT_OPERATIONS.md now documents intake, ownership/scope verification, pending-job reconciliation, storage/account/billing dependencies, irreversible-action gate and completion evidence. PLATFORM_REVIEW_EVIDENCE.md retains platform demo preparation. | Mailbox operation, a disposable-account deletion/revocation exercise and any requested platform review recordings/declarations. No request was sent and no customer record deleted. |

## Reproducible local checks
- npm ci --ignore-scripts --no-audit --no-fund
- npm test: 118 tests passed.
- npm run test:billing:local: three SQL suites passed; fixture users/rows rolled back and subscriber_launch stayed false afterward. PGlite 0.5.14 is pinned as a development dependency. The runner creates its own in-memory database, takes no database URL and calls no publishing provider.
- npm run build: passed with synthetic isolated Sandbox settings and no live credentials.
- Rendered markup scan passed for /, /login, /join, /pricing, /help, /support, /privacy, /terms, /data-deletion, /get-started, /connections, /social-connections, /publishing-status, /dashboard, /youtube-test, /facebook and /tiktok. One main target and a working target reference from the skip link were present on each. This was server-rendered HTML in jsdom; it does not establish live keyboard operation or full WCAG compliance.

## Environment limits and next work
Supabase lists the main project and the TikTok Sandbox, with no development branches. Neither deployed database was modified. The TikTok Sandbox billing isolation was preserved. A new Edge app-check tab stalled during navigation, so no current signed-in or mobile browser acceptance is claimed. Local PostgreSQL package installation was unavailable; the disposable WASM engine ran the real schema/functions and suites instead. It has one connection, so concurrency remains unverified.

Next work: resume real browser layout/recovery acceptance when Edge responds, use an eligible isolated billing deployment for Stripe and multi-session checks, and exercise deletion against a disposable account after its scope and required operator access are established. Master milestones 22–25 remain open; preparation and local tests do not complete their full acceptance checks. Master progress remains 16 achieved of 30.

Owner actions, consolidated: platform identity/business evidence or binding declarations when requested; account-holder consent where needed; confirmation of support-mailbox access; approval of selected payment/vendor costs if any; separate later approval for live billing and final public release. Google branding/scopes, Meta customer permission approval and TikTok review/audit remain external gates; their last verified states are retained.
