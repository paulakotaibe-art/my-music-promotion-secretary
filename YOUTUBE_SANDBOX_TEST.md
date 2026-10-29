# YouTube customer private test — 29 October 2026

The ordinary invited test account completed Google OAuth and confirmed the intended channel. No owner privilege was granted. Its trial allowance is 3, used 0, expiring 5 November 2026.

The isolated Sandbox now permits private YouTube tests for explicitly invited, unexpired trial testers only. Production does not query the Sandbox grant. Sandbox API and database both reject public and scheduled YouTube uploads. Subscriber launch and paid billing remain closed.

Each attempt reserves a normal campaign-submission allowance entry before any external upload. Unconfirmed attempts retain their reservation. Concurrent requests serialize on the normal account advisory lock. A direct forged receipt cannot use the private-test exception, which requires the nested upload trigger and matching persisted private attempt. Account ownership, channel binding, trial expiry, three-promotion limit and row-level security remain enforced.

Installed database/youtube-sandbox-private-test.sql ONLY in slvhnpagtsprmivaujav. The script rejects the production owner identity. The tester grant ends with the existing trial and does not open registration, billing, general customer publishing or public release. youtube_connections was installed earlier from database/youtube-connections.sql.

Validation: 106 Node tests and isolated Next.js build passed. database/test-youtube-sandbox-private.sql passed and rolled back all fixtures; verified 3→2→1→0 quota, fourth rejection, public rejection, forged ledger rejection, uninvited rejection and cross-account read/update denial. Security advisor adds only the intentional private table/no-policy informational finding; existing leaked-password-protection warning remains.

Live media test remains pending: this ordinary account has no saved MP4 draft and no YouTube upload attempts. The user must upload/save an original MP4 in that account and personally choose audience/disclosure/rights settings before submitting a private test. Do not report an actual upload or counter decrement until the external receipt is verified.

Production source and database were not changed. TikTok remains in review.
