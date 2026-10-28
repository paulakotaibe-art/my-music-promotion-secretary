# TikTok review preparation — 28 October 2026

The owner explicitly authorized importing Sandbox configuration into the Production review draft.
App: 7700557351711852565. Production review remains Draft, NOT submitted or approved.
Imported Login Kit, Content Posting API Direct Post, scopes and tested callback.
Verified Production URL property https://music-promotion-secretary-tiktok-sa.vercel.app/ using public/tiktokqEtFTo8ThCPeSgODt8A79vHD9RTyrO4L.txt.
The portal form has one validation error: a demo video is required. Save fails until validation passes, so field edits are currently in the browser only; this file preserves exact entries.
No production website, database, rollout flag or credential was changed.

## Form entries
- Name: My Music Promotion Secretary
- Category: Social Networking
- Description: Helps independent artists upload original videos, prepare captions and publish to their connected social accounts.
- Website: https://music-promotion-secretary-tiktok-sa.vercel.app/
- Terms: https://music-promotion-secretary-tiktok-sa.vercel.app/terms
- Privacy: https://music-promotion-secretary-tiktok-sa.vercel.app/privacy
- Platform: Web
- Callback: https://music-promotion-secretary-tiktok-sa.vercel.app/api/integrations/social/tiktok/callback
- Login Kit, Content Posting API, Direct Post enabled.
- Included scopes: user.info.basic, video.publish, video.upload. Portal automatically includes video.upload with the product; Add scopes does not offer removal. Do not claim Upload-to-Inbox is implemented or demonstrated.

## Review explanation (923 characters)
My Music Promotion Secretary is a web service intended for independent artists and creators to publish their own original videos. Login Kit and user.info.basic connect the creator's TikTok account and display the account identity. Content Posting API Direct Post and video.publish retrieve current creator settings and submit a video only after the creator selects an uploaded MP4, edits the caption, chooses an available privacy setting and interactions, completes applicable disclosures and music consent, and confirms the final review. Users see processing and verified completion through status checks. The demonstrated Sandbox flow successfully posted A Beautiful Life with SELF_ONLY visibility to the authorized test creator and returned PUBLISH_COMPLETE. Public customer publishing remains disabled pending approval and audit. The integration does not implement the Upload-to-Inbox flow associated with video.upload.

## Required genuine demo
Record MP4 or MOV under 50 MB. Show the real browser URL and user interactions:
1. App sign-in, connect TikTok, official consent screen and return to connected creator identity. Do not record passwords, email links, one-time codes, developer credentials or tokens.
2. Original MP4 upload/selection and video preview.
3. Editable caption, manually chosen Only me visibility, account-supported interactions off, applicable commercial/AI disclosures and music/rights consent.
4. Final review and owner-authorized private Publish.
5. Processing and verified Completed with non-public visibility. Existing verified result may be shown honestly as an earlier successful test; do not present it as a new submission.
Screenshots or a slideshow are not a substitute for a real interactive demonstration.
Upload via portal App review, then validate and save. Only describe the review as pending once the portal confirms submission.

## Additional review risks
Official guidelines reject private-only/internal utilities and unfinished test-only apps. This app is intended for independent artists, but current Sandbox testing banner and closed subscriber gate must not be misrepresented as an already launched public service.
The demo website domain must match the submitted website. Sandbox must be used for a first app demonstration.
The mandatory video.upload scope is not implemented; resolve scope requirements truthfully with TikTok rather than claiming an unsupported flow.
An app review and the Direct Post audit/public visibility approval are not necessarily the same approval. Never set audited=true merely because a review was submitted.
