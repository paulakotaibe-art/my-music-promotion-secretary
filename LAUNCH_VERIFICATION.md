# Launch verification — 23 October 2026

## Verified
- Stripe sandbox checkout activates Starter via signed webhook; end-of-period renewal cancellation is persisted by webhook. Live credentials remain separate. No real payment was taken.
- 22 Node tests pass.
- Database rollback suite passes against the deployed schema. It exercises Trial, Starter (3/week, queue 12), Growth (10/week, queue 40), Executive (25/week, queue 100), weekly reset, released credit, one-artist binding, test/live isolation, checkout reuse, expired/failed payment, paid-term bounds, launch gate and owner exemption.
- The queue tests insert through the real database claim trigger. Test data and temporary launch/configuration changes are rolled back. These do not establish full browser-level subscriber onboarding or concurrent-session behavior.
- Existing owner reservation remains quota-exempt. Public paid launch remains closed.

## Pilot discrepancy requiring reconciliation
The saved app snapshot is for YouTube, Facebook and TikTok at 2026-10-26T12:00:00Z (12:00 London on that date).
The receipt planner URL identifies UUID -1725530459831320166. Metricool currently lists that UUID as post 402391480, Facebook and TikTok only, 26 October 2026 at 13:00 Europe/London, both PENDING.
The numeric provider ID in the original receipt (402382345) is stale; provider edits change numeric IDs, while UUID is stable.
There is also a separate YouTube-only A Beautiful Life advert, post 399200148, scheduled 25 October at 16:00 London. It is a separate campaign, not evidence of three-platform delivery for the app pilot.
No queued posts were modified, duplicated, cancelled or moved during this verification. Actual public publication and results remain unverified; scheduled dates are in the future.

## Commercial publishing blocker
Metricool's official WLI integration guide says white-label integration is exclusive to CUSTOM plans. Its API integration cannot by itself implement social-network account connection; an authorized connection panel is required. Metricool branding remains visible during initial social-account authorization.
Sources:
- https://help.metricool.com/wli-integration-methods-tryyk
- https://help.metricool.com/wli-final-considerations-h5x5p
Successful owner OAuth/MCP access does not confirm commercial rights for a paid multi-tenant app. Obtain written terms and a quote before opening paid sign-ups. Do not require subscribers to buy their own provider subscription under the current proposed product/pricing.

### Prepared questions for a vendor quote (not sent)
We operate My Music Promotion Secretary, a paid web app for independent artists, initially supporting one YouTube channel, one Facebook Page and one TikTok account per subscriber.
Please confirm:
1. Whether a Custom/WLI agreement permits our app to schedule and publish for paying subscribers under our brand and authentication.
2. Monthly minimum, setup charge, per-brand charges, included brands, overages, currency/tax, and prices for 10, 25, 50 and 100 artists.
3. API/MCP commercial access, rate limits, supported publishing and status endpoints, and stable identifiers after edits.
4. Supported embedded account authorization and reconnection without sharing the master account.
5. Tenant separation, token lifecycle, deletion/export, data-processing agreement and termination/migration terms.
6. YouTube/Facebook/TikTok media limits, publication callbacks, retries, support and service commitments.

## Before advertising
Confirm affordable commercial publishing terms and provision subscriber-specific account connection; reconcile the pilot's actual platforms/time; verify final public URLs and platform results after publication. Run a non-owner browser pilot through upload, preparation, publication and allowance display. Complete customer support/legal/mobile review. Activate live Stripe only after these gates pass.
