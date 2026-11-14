# Dedicated Meta review access

The `/review-login` page uses Supabase's standard password authentication for an operator-created app user. It does not create credentials, accept terms, grant owner status or bypass server authorization. Existing email-link login remains available. Credentials never belong in source, URLs or public issue comments.

## Scoped entitlement

`database/facebook-review-access.sql` adds an initially empty private entitlement table. An administrator can enable a specific account until an explicit expiry, with a fixed total allowance (default 10, maximum 25) and three queued promotions. Only Facebook publishing uses this allowance. The account keeps normal own-row RLS, own-draft checks, authorised Page selection, destination binding, signed receipts and scheduling validation. Public rollout, Meta approval flags, billing and all other platform gates remain unchanged.

A private helper calculates the review allowance; the existing Facebook access check, atomic campaign reservation and dispatch authorization consult it. The Facebook studio now checks `/api/facebook/usage` for the chosen release time. Other platforms still use the ordinary billing allowance.

The owner creates the account and enters its password privately. Activate only the intended user in `app_private.facebook_reviewers`; never add a reviewer to `app_owners`. Revoke by setting `enabled=false`. Check expiry again when submitting: Meta asks for test access active for one year after submission. The allowance is a total for the review account, not a paid subscription or weekly renewal.

## Validation

Rollback-only database tests verify Facebook access with general rollout closed, immediate/scheduled reservations, finite allowance, expiry, revocation, cross-account draft/upload isolation, non-Facebook denial and private entitlement privileges. No provider publication is performed by these tests. Browser sign-in, Page authorization and a real reviewer-account publishing test remain required before claiming end-to-end readiness.

Before final submission, complete truthful provider processing-country declarations (including remote access), supply credentials only through Meta's private review form with the owner's approval, and verify business verification and the submitted receipt. Saved videos and a published app status do not establish that App Review was submitted.
