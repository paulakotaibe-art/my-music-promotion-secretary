# Subscriber publishing status

`/publishing-status` combines the signed-in account's server-calculated allowance and own YouTube/Facebook/TikTok connections. The GET-only API uses the caller's authenticated, RLS-limited client; connecting or checking does not reserve promotions. No tokens, ciphertext, account identifiers or billing credentials are returned. Facebook Page readiness requires a selected saved Page with a Page token.

Only the owner sees ready studios during the current rollout. Subscriber platform approvals are not verified, so even a paid entitlement does not turn these readiness cards green. Existing publishing APIs and database guards remain authoritative. This status feature does not enable subscriber Facebook or TikTok writes or claim to enforce new multi-platform quota reservations.

Before subscriber launch: verify Google/Meta/TikTok customer permissions, finish each adapter, integrate Facebook/TikTok with the shared atomic promotion ledger and one-artist binding, test active/expired/cancelled subscriptions and weekly/queue limits, then verify one complete customer flow on mobile. Keep the existing owner campaign and owner pilot outside subscriber allowances. Cross-platform fan-out remains future work and is no longer advertised in the dashboard as an already available feature.

Facebook schedule diagnostics now retain the observed provider time separately from the requested time, distinguish missing versus different times, and record only safe numeric provider error codes. An acknowledgement or a saved requested time is not a confirmed schedule. Never retry an uncertain release automatically.
