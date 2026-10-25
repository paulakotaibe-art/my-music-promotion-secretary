# Facebook and TikTok publishing readiness — 25 October 2026

## Verified progress
Facebook app 1799866164488258 is Published in Meta. The owner's scheduled A Beautiful Life video (1839738473687282) was verified published after the 05:45 London submission on 25 October 2026. Subscriber connection, Page selection, direct upload/release, shared allowances and enrolment are implemented behind rollout flags. No independent subscriber publication test has passed yet; Meta customer permissions and business/Tech Provider requirements must be checked before rollout.

TikTok now has an app-managed publishing studio at `/tiktok`, authenticated review and submission routes, a verified-origin media-transfer path, token renewal, durable scheduled submissions, signed status receipts, shared subscriber reservation enforcement, and cancellation before dispatch. **No TikTok developer app, credentials, verified media-domain property, audit approval or live TikTok post exists yet.** The database flags default to false and customer launch remains closed.

## Public application information
- Product: My Music Promotion Secretary.
- Operator: Paul Ifeanyi Akotaibe. Do not invent a registered company or industry certificate.
- Public support/privacy contact: hello@drpaulslibrary.com.
- Website: https://my-music-promotion-secretary-x96x.vercel.app
- Privacy: https://my-music-promotion-secretary-x96x.vercel.app/privacy
- Terms: https://my-music-promotion-secretary-x96x.vercel.app/terms
- Deletion requests: https://my-music-promotion-secretary-x96x.vercel.app/data-deletion
- Support: https://my-music-promotion-secretary-x96x.vercel.app/support

## TikTok registration continuation
Developer portal: https://developers.tiktok.com/ . The registration screen reached during this work offered enterprise developer email verification, developer terms and business-information verification. The owner must finish the email/terms/account step; registration has not been submitted on their behalf. If business documentation is requested, provide only genuine eligible documentation or use an appropriate developer-account option supported by TikTok.

Suggested app description (review against actual current portal field limits):
My Music Promotion Secretary helps independent music creators upload their own original videos, select their own connected channel, edit captions and disclosures, review visibility and interactions, and explicitly authorize immediate or scheduled submission. Each creator controls their own account; the service is intended for subscribers rather than only an internal management team. Public release follows platform approval and testing.

Add Login Kit (Web) and Content Posting API Direct Post. Request only `user.info.basic` (identify/display the connected creator) and `video.publish` (creator-consented direct video submission).

Exact callback:
https://my-music-promotion-secretary-x96x.vercel.app/api/integrations/social/tiktok/callback

Website/media URL ownership must be verified in TikTok's Manage URL properties. The chosen media-transfer prefix is:
https://my-music-promotion-secretary-x96x.vercel.app/api/tiktok/media

Wait for TikTok's actual file/DNS challenge; do not invent a verification filename or token. Implement that exact challenge and verify the property before setting `url_verified` true. Every video URL uses this prefix and an encrypted, two-hour capability. It streams only an owned uploaded MP4, without redirects. Server-stored media uses PULL_FROM_URL as TikTok requires.

Save `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET` in Vercel Production as appropriate sensitive environment variables, then deploy. Never send keys in chat or commit them. Keep existing Stripe, YouTube, Facebook and encryption keys intact. Settings: https://vercel.com/paulakotaibe-2592s-projects/my-music-promotion-secretary-x96x/settings/environment-variables .

## Pilot and audit sequence
1. Complete registration, obtain the actual approved app configuration and verify its website/media URL property.
2. Confirm the desired creator can authorize the requested scopes. Use a private TikTok test account for the unaudited pilot; only the owner pilot is eligible in our gate. Do not change an account's privacy automatically.
3. Enable the owner-only database gate after verifying prerequisites; keep `audited=false` and the global customer gate false. Unaudited TikTok clients are capped at five users/day and require private accounts plus SELF_ONLY posts. TikTok may impose additional creator/posting caps; app plan allowances do not override these.
4. Owner uploads an original MP4 in the dashboard, saves a draft, opens TikTok studio, explicitly chooses Only me, reviews duration/caption/disclosures/interaction choices and agrees to the applicable music/content declarations. Ready to Publish scrolls to the final review; Publish is the last action.
5. Verify the existing submission reaches PUBLISH_COMPLETE with the selected non-public visibility. Test a scheduled submission with the app closed and inspect the signed worker result after the due time. Do not duplicate uncertain attempts.
6. Prepare TikTok's real audit application and recording showing creator sign-in, current nickname/privacy/options, preview and editable caption, disclosures and music consent, explicit final Publish, processing and verified results. Never claim a mocked test is a live publication.
7. Public publishing requires TikTok's approval/audit and confirmed scope access. Perform an authorised public owner pilot and then a separate non-owner connection, allowance and publication pilot before enabling subscriber rollout. In-app disconnect/revocation UX, expired-grant recovery and broader device QA remain launch checks.

## Behaviour and limits
- Current pilot handles uploaded MP4 video up to the app's 50 MB limit. Audio must be converted to a video by the creator; automatic audio-to-video rendering is not implemented.
- No app watermarks are added. Privacy has no default; interactions start off and respect account restrictions. Commercial disclosure starts off and requires explicit choices when enabled.
- Source duration is measured server-side and rechecked against fresh creator limits before dispatch. A saved review expires after 10 minutes; scheduled jobs bind signed consent to account, media and exact submission time.
- Scheduled dates are 10 minutes to 28 days ahead, reviewed in the device timezone and stored in UTC. Server wakeup is every minute, with a 10-minute dispatch window. TikTok moderation/processing can delay actual public visibility; the scheduled time is not a public-visibility guarantee.
- A new post reserves a shared promotion when Publish is clicked, in the same database transaction as the scheduled job. Owner posts are exempt. Rescheduling moves the same reservation, cancellation before submission releases it, and a changed destination cannot bypass the plan's one-account-per-platform binding.
- Worker access is rechecked at dispatch. Expired trials/subscriptions or closed rollout prevent new sends. Read-only status recovery can continue for an existing publish ID.
- Submission initialization is never automatically retried after an uncertain response. Queued, processing, non-public completion, verified public success, failure, missed dispatch and unconfirmed outcomes are distinct. Public success requires TikTok's public post identifier, rather than accepting PUBLISH_COMPLETE alone.
- Failed/uncertain attempts keep reservations for support review. A blocked preflight currently needs support review rather than an automatic retry. This is intentionally conservative while the pilot remains closed.
- Status polling ends after 24 hours unless the owner/customer requests another read-only check. This never uploads another video.

## Validation during implementation
90 Node tests passed, including TikTok privacy/disclosures, server media tickets and MP4 duration, token refresh identity/scope/rotation, exact signed review binding, no duplicate initialization, status-only recovery and honest publication status. Next.js production build passed. Local HTTP checks returned 200 for `/tiktok`, 401 for unauthenticated creator/posts/prepare operations, and 403 for invalid media tickets and dispatch nonces.

Database migration applied with TikTok flags false. Rollback-only checks passed in smaller groups: shared trial cap, rescheduling without an extra charge, cancellation refunds, once-only claim/completion, cross-user RLS and cancellation denial, refresh locking/capability replay denial, and read-only worker status recovery with a one-use nonce. Isolated expired-trial dispatch and owner account-rebinding/quota-exemption checks passed. No test users or TikTok posts remain. Large combined tool calls sometimes expired without a usable result; no pass is inferred from those calls.

Security advisor review introduced no new warning categories. Four new private tables intentionally deny client access and produce RLS-without-policy informational notices. Existing warnings about pg_net's schema, the unrelated rls_auto_enable function and leaked-password protection remain separate launch follow-up items.

## Official references checked 25 October 2026
https://developers.tiktok.com/docs/en/content-sharing-guidelines
https://developers.tiktok.com/docs/en/content-posting-api-reference-query-creator-info
https://developers.tiktok.com/docs/en/content-posting-api-reference-direct-post
https://developers.tiktok.com/docs/en/content-posting-api-reference-get-video-status
https://developers.tiktok.com/docs/en/content-posting-api-media-transfer-guide
https://developers.tiktok.com/docs/en/oauth-user-access-token-management
