# Privacy notice — review draft

Status: not published as an active policy; do not enter this draft's GitHub URL in Meta.
Prepared 25 October 2026 for My Music Promotion Secretary.

## Operator and contact

Legal operator: [OPERATOR NAME REQUIRED].
Public support and privacy contact: [PUBLIC EMAIL REQUIRED].
App: https://my-music-promotion-secretary-x96x.vercel.app/

## Information used by the service

The app stores the email/account identifiers used for sign-in; artist and release details supplied by the user; uploaded videos, audio and artwork; campaign drafts and publication times; connected social account, channel and Page identifiers; encrypted platform authorization credentials; and publication receipts and error/status information. Billing records include Stripe customer/subscription identifiers, plan, status, period end and cancellation state. Card entry and payment processing are handled through Stripe checkout rather than an app card-entry form.

We use this information to authenticate accounts, display and prepare releases, connect destinations selected by the user, schedule and verify publication, calculate subscription allowances and manage billing. Account status and allowance checks can prevent a submission when access or quota is unavailable. No paid plan or saved connection guarantees platform approval or successful publication.

## Public media and social posts

The promotion-media bucket is currently public by link. Anyone who obtains a media URL may be able to open the file, even if its draft has not been published on a social network. Uploads are not a private archive. Public album pages display selected release details when the user enables public visibility. Do not upload confidential material or material you are not entitled to distribute.

A prepared Facebook video is unpublished, not necessarily private. Public posting sends content to the destination platform for the user-selected account or Page. Published content and copies held by social platforms are also governed by those platforms' policies.

## Service providers and integrations

The current implementation uses Supabase for account/database/media services, Vercel for app hosting and functions, and Stripe for checkout and subscription processing. Google/YouTube and Meta/Facebook receive data needed for connections and user-approved publication. TikTok connection code exists, but its direct publishing implementation is not complete. Older owner campaigns use Metricool; customers should not be told that a separate Metricool subscription is required. OpenAI caption assistance is planned and is not currently an active customer feature in this implementation.

Before publication: verify the provider contracts, processing locations, subprocessors and applicable international-transfer safeguards. Do not promise that all data stays in the UK or that no provider retains logs.

## Browser storage and security

The app uses browser storage for the signed-in session and a short-lived internal navigation/plan-selection intent. That navigation intent does not store an email address or platform token. Platform OAuth state is short-lived and protected; saved provider credentials are encrypted. Account-scoped database policies and server checks restrict customer access. These controls do not make public media URLs confidential.

## Retention and deletion — operator procedure to complete

There is no implemented general automatic account/media deletion or inactivity-purge schedule. The operator must define and implement the actual retention periods/criteria for active accounts, closed accounts, media, publication receipts, billing/security records and backups. A published notice must describe the working procedure, not a desired future feature. Financial/legal exceptions should identify their applicable purpose rather than promise unconditional deletion.

Users must have a working, monitored contact route for access, correction and deletion requests. Removing a Facebook integration does not by itself prove all app-held media, receipts or billing records were deleted, and deleting app data does not automatically delete a public Facebook/YouTube post. Verify identity proportionately; never ask for a password, API key, login link or full card details.

## Rights and legal information to finalize

Confirm the operator's purposes and lawful bases, any legitimate-interest assessment, relevant rights and complaint route, and how requests will be handled. Where UK GDPR applies, the notice should explain applicable access, correction, erasure, restriction, objection and portability rights, and the right to complain to the ICO. A right to erasure is subject to applicable conditions and exceptions.

## Sources and factual checks

- ICO, privacy information: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/
- ICO, storage limitation: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/
- ICO, erasure: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-erasure/
- Code checked at fd84fd3101f1913deb472ae08d1c1277e1202bd5, particularly database/media-workspace.sql and lib/media.mjs, plus subscriber publishing/enrolment implementation.
