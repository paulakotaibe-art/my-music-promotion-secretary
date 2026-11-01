# Independent work session — 1 November 2026

Source baseline: 294546d23649535d3cbb611d4ac2711a9b0db6ab, branch prepare/tiktok-sandbox-isolation. Work used local fixtures and existing repository source. No deployed database, real customer record, platform grant, media, live billing or production release was changed.

| Work | Verified result | Limit |
|---|---|---|
| Mounted account-session component | Four tests passed: same-account refresh preserved content; sign-out and account switches removed protected content and redirected; public support remained readable; listeners unsubscribed. | Simulated SDK events in the actual mounted component, not real provider revocation or a multi-profile browser test. |
| Actual subscription route | Six tests passed: scoped listing, explicit cancellation confirmation, user/customer/mode checks, one cancellation write on repeated requests, sanitized errors and no-customer handling. | Stripe network responses are fixtures. No charge or actual subscription cancellation. |
| Actual webhook route | Four tests passed with genuine Stripe SDK test signatures: current-state retrieval, tampering rejection, mode-secret separation, plan/user checks and retryable persistence failure. | Synthetic secrets and fake Stripe retrieval/persistence. Not proof of external webhook delivery or deployed reconciliation. |
| Disposable SQL environment | Six suites passed using real repository schema/functions: billing allowance, lifecycle, account isolation, YouTube connection isolation, direct YouTube allowance and connection/account deletion rehearsal. | Single in-memory connection; does not prove multi-session lock behavior. No real Supabase Auth, storage or platform calls. |
| Subscription defect | Previously, a signed-in artist without a billing customer received 503/Retry from GET. It now returns an empty subscription list without contacting Stripe. Cancellation without a billing customer returns 404 without a Stripe call. | Sandbox deployment/review is separate from production release; no billing customer is created by these reads. |

## Validation
- Full unit/component/route suite: **132 passed** (previously 118).
- Local SQL runner: **six suites passed** (previously three were run).
- Full Next.js build: passed with synthetic isolated Sandbox settings.
- After the fixture exercises, only the bootstrap owner remained; no draft, connection, upload, customer, subscription, artist-profile or submission fixture rows remained, subscriber_launch stayed false and the original fixture bridge hash was restored.
- Dependencies added for test execution only: esbuild 0.28.2 and react-test-renderer 18.3.1, both pinned with package-lock.json.
- Commands: npm ci --ignore-scripts --no-audit --no-fund; npm test; npm run test:billing:local; npm run build with documented synthetic isolated configuration.

## Deletion rehearsal boundaries
Two disposable users had distinct drafts and YouTube/TikTok connection rows. The authenticated deleting user could not delete the other user's connections, could remove their own, and could no longer see the removed rows. An operator attempt to delete the fixture Auth user before resolving billing/profile dependencies failed with a foreign-key violation. After removing that fixture's already-canceled synthetic billing dependencies, account deletion removed its draft; the other account, draft and connections remained intact. Everything rolled back.

This is evidence for database dependency ordering and tenant-scoped connection removal. It does not establish real session invalidation, provider-token revocation, storage-object deletion, mailbox delivery, retention-policy acceptance or a complete live support request. No production deletion script or automatic account-deletion endpoint was introduced.

## Remaining work
Master milestones 22–25 remain open until their full deployed/customer acceptance checks pass; master progress remains 16 achieved of 30. Next work is external Stripe test delivery in an eligible isolated billing deployment, actual parallel-session allowance claims, real browser expiry/account-switch recovery and the remaining support/storage/revocation exercise. No new paid service or database branch was created during this session. Provider approvals remain separate.

The local runner is reusable without a database URL or provider credentials. It must not be described as a deployed billing environment or successful public customer publishing.

## Later deployment and build-work update
The implementation was saved as d342345475007c2443b39295ccd70d2769928eb6. GitHub's Sandbox deployment check failed with target https://vercel.com/paulakotaibe-2592s-projects?upgradeToPro=build-rate-limit . No upgrade was purchased. The subscription fix is not deployed.

Prepared a conservative documentation-build skip command using VERCEL_GIT_PREVIOUS_SHA and VERCEL_GIT_COMMIT_SHA. It permits skipping only root Markdown changes since the last successful deployment. Runtime/config/test changes, unavailable history and missing variables all require a build. Three actual temporary-Git-repository checks cover documentation-only changes, an undeployed code change followed by documentation, and missing history. Full suite is now **135 passed**. The configuration instance validates against the official Vercel schema.

This is a reduction in unnecessary build work, not a quota bypass or guarantee of fewer counted deployment attempts. Platform execution remains unverified while deployment is blocked. Existing isolation guards are unchanged.

References: https://vercel.com/docs/project-configuration/vercel-json#ignorecommand and https://github.com/vercel/vercel/discussions/7251 .
