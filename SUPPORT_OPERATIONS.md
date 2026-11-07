# Support and deletion operating procedure

Prepared 1 November 2026. This is an operator runbook, not evidence that a customer request has been fulfilled. Public instructions are /support and /data-deletion. The mailbox is hello@drpaulslibrary.com; delivery and owner access still require confirmation. Do not send a test message without the owner's explicit instruction.

## Intake and verification
1. Assign a private case reference and record the request date, requested scope and reply deadline. Keep customer details in restricted operational records, never this repository.
2. Verify control of the registered account using the existing signed-in account or a reply through its registered mailbox. Do not ask for passwords, login links, tokens, card numbers or unnecessary identity documents. Escalate disputed ownership to Dr Paul.
3. Distinguish connection removal, uploaded-file/draft removal, whole-account deletion, subscription cancellation and removal of published platform content. Confirm ambiguous scope before any destructive action.
4. Acknowledge the verified scope and explain any specific retention exception. The public page states an aim to respond within one calendar month; record and explain any applicable extension. Do not promise an instant or fully automatic deletion feature.

## Read-only assessment before a change
Record the named deployment and database; distinguish the main project from the isolated TikTok Sandbox. Identify records by verified app user ID, not email similarity or a social display name. Inspect the following without exposing encrypted credentials:

| Area | Source inventory / dependency | Decision required |
|---|---|---|
| Pending work | campaign_submissions, youtube_uploads, tiktok_posts, facebook_releases and provider receipts | Identify queued, claimed, processing and uncertain jobs. Do not delete a receipt needed to reconcile an existing provider attempt. |
| Connection data | youtube_connections, social_connections and any metricool_connections in the target schema | Removing a local token record is distinct from revoking the platform grant. No new OAuth grant is needed to prepare the case. |
| Media and drafts | campaign_drafts, promotion-media storage objects under the user's folder, songs | Verify ownership and references. SQL deletion of a draft or Auth user does not itself prove the storage object was removed. |
| Billing | app_private.billing_customers, subscriptions, artist_profiles; Stripe customer/subscription | Confirm renewal separately. App deletion is not evidence of cancelled billing or deletion of required accounting records. |
| Worker state | app_private TikTok runs/refresh leases and Facebook dispatch keys | Check in-flight work and foreign keys before connection/account removal. Do not change a global publishing gate for a single request. |
| Account and sessions | Supabase Auth user/sessions and app-owned records | Account deletion alone is not proof that issued access tokens are unusable. Plan session revocation and verify denial before final account removal. |

This inventory reflects repository schema files; inspect the actual target schema before action. Several tables use non-cascading foreign keys, so a blanket Auth-user deletion is not an approved deletion procedure. Do not invent retention durations or promise deletion of provider-held/shared copies.

## Execution gate and verification
- Prepare the exact, user-scoped action list and expected retained records. Obtain confirmation immediately before irreversible deletion. Cancellation, platform revocation and final production actions remain separate approvals.
- Resolve pending work first. If a provider outcome is uncertain, preserve its identity and receipt, check status without a new submission, and explain the remaining issue. Never upload again to test deletion/recovery.
- Perform an authorized removal only with the appropriate operator access. Use the storage API for objects; do not treat database metadata removal as file deletion. Do not include credentials in notes or response screenshots.
- Verify the requested records/objects are absent or retained for the documented reason, other users' data remains unchanged, revoked access fails, no new job can use the removed connection, and billing status matches the separately authorized request.
- Confirm the result and any external steps to the requester. Record date, operator, sanitized case reference, exact scope and exceptions privately. A published post remains on its platform unless its removal was separately requested and verified.

## Uncertain publication or payment support
Collect the existing attempt/event ID, platform, scheduled time with timezone and visible status. Use read-only receipt/status checks first. Do not replay an upload, Publish, charge or cancellation to discover what happened. Escalate account mismatch, cross-user data, unexpected charges or suspected credential exposure to the owner; keep the existing reservation held until an authoritative outcome supports changing it.

## Acceptance still required
- Mailbox delivery and owner access confirmed.
- Disposable account exercise: scope verification, pending-work assessment, session revocation, connection/data/storage removal and final access denial; no real customer data.
- Billing cancellation independently verified in test mode.
- Owner review of retention exceptions and operator access.

Preparation is complete; operational milestone 24 remains open until the exercise and mailbox confirmation have evidence. Do not tick it based on this document alone.
