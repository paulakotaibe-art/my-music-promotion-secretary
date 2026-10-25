# Subscriber Facebook publishing — closed rollout

The customer studio is `/facebook`. It uses the signed-in customer's own saved MP4 draft, encrypted Facebook connection and selected Page. Video preparation is unpublished, not private. Once processing is checked, the customer reviews public-now or a future time and clicks Publish. Existing owner studio URLs still work.

## Access and reservations

Customer access requires BOTH `app_private.facebook_rollout.enabled` and `meta_approved`, plus the existing global subscriber launch gate. All ship false. Only administrative database access may change them; neither user metadata nor a browser flag grants publishing. The API checks the same server RPC and database triggers independently enforce the gates. No review approval or real customer publication is claimed by this implementation.

Facebook release insertion reserves a promotion in the existing campaign ledger in the same transaction, under the same per-user advisory lock as YouTube and other campaigns. Trial, weekly, queue and current-period limits apply. A failed reservation creates no release row. Owner pilots bypass subscriber quota. A preparatory upload uses no credit, but requires available entitlement and is capped at three outstanding preparations.

One direct destination is bound per platform; YouTube and Facebook share the existing artist ledger identity. This fixes different platform prefixes conflicting with the one-artist rule. Destination changes need administrative support during the pilot. A saved draft still permits only one campaign submission: automatic multi-platform fan-out is not implemented. Use a separate draft for a separate promotion.

## Scheduling and uncertain outcomes

The existing worker now accepts subscriber jobs only with (1) a valid server-signed subscriber receipt and (2) a database-generated authorization grant tied to an unreleased Facebook reservation, destination, video and time. Entitlement and rollout flags are rechecked at execution. Already-public videos are read without another publication request. Uncertain external writes are not retried; their allowance remains reserved.

Subscriber releases cannot be rebooked after reservation in this first rollout. Owner recovery behavior is preserved. Failed or missed customer reservations require review before any refund/retry. The scheduler currently claims two jobs per minute and holds jobs more than ten minutes late; load/capacity testing is required before broad marketing.

## Validation and activation

Rollback-only database tests cover closed gates, shared YouTube/Facebook allowance, no extra trial promotion, atomic failure, duplicate schedule rejection, private privilege protection, cross-account RLS, inactive/sandbox/cancelled subscriptions and dispatch authorization. Node tests cover signed job binding and the API access gate.

Before a live customer pilot: verify the owner's actual scheduled publication; confirm Meta customer access/Advanced Access and required business verification; check token expiry/renewal and the customer's Page grant; enable access only for a controlled rollout; test a real non-owner account on desktop and mobile. Verify the public URL and exact counter change. Stripe test credentials never unlock real paid publishing. TikTok publishing remains unfinished and closed.
