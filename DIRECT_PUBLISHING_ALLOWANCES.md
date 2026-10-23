# Direct YouTube allowances

Public/scheduled subscriber upload attempts atomically insert into the shared campaign_submissions ledger through a private database trigger before provider writes. The existing locked claim trigger enforces launch, paid/trial period, London publication week, weekly allowance, queue cap and owner exemption. Private uploads are owner-only. Owners bypass this new reservation and their existing uploads remain untouched. Unknown provider outcomes keep their reservation; no automatic release or retry is attempted.

The YouTube page displays the shared Usage counter for the selected publication week and refreshes after publishing. The server rechecks usage and the database remains authoritative. Subscriber launch remains disabled. No live payment is enabled.

One draft can have only one subscriber publishing reservation across routes. A direct channel is bound as youtube:<channel_id> in the existing one-artist profile; existing Metricool-bound subscriber profiles require an explicit migration before switching to direct publishing. This fails closed rather than silently granting another artist profile. Subscriber private-test prerequisite is removed; only the owner pilot retains it.

Validation: rollback direct-upload tests cover launch gate, private-upload rejection, three credits, fourth attempt rejection, shared-ledger bypass and owner preservation. Existing complete billing rollback suite also passes after applying the trigger. Real non-owner end-to-end publishing and concurrency with live provider calls remain unverified. Deployment and Google public onboarding are still gated.
