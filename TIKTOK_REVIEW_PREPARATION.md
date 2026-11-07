# TikTok review submission — 28 October 2026

## Confirmed status
TikTok developer portal now displays **In review** for Production app 7700557351711852565 (My Music Promotion Secretary).
Submitted using the owner-authorized Production review draft. The portal confirms receipt and warns review may be delayed by request volume.
Public Direct Post approval/audit has NOT been granted. Keep audited=false and subscriber publishing closed.
No new TikTok video was published during review preparation.

## Submitted evidence
- tiktok-preview-demo.mp4: compressed from owner-supplied 64-second preview recording, approximately 4.6 MB.
- tiktok-settings-result-demo.mp4: compressed from owner-supplied 103-second final clip, approximately 5.2 MB.
- Both preserve actual recorded interactions. No fabricated screens were added.
- Footage shows reconnect/return, creator identity, saved MP4 selection, preview, Only me, AI disclosure and music consent, plus an existing verified nonpublic completion.
- It does not show a new publication or an opened final-review panel, nor renewed TikTok consent for the already-authorized account. These limitations were explicitly stated in the submitted explanation.

## Submission reason
Initial Login Kit and Direct Post review for an artist publishing web app; requesting review and public-post audit.

## Submitted explanation
My Music Promotion Secretary is intended for independent artists and creators to publish their own original videos. Login Kit/user.info.basic connect TikTok and display the creator identity. Direct Post/video.publish retrieve current creator settings and submit only after video selection, editable caption, manually chosen supported privacy/interactions, applicable disclosures, music consent and final confirmation. Status checks report processing and verified completion. The private Sandbox pilot returned PUBLISH_COMPLETE for SELF_ONLY; the owner confirmed playback. Attached recordings show reconnection (TikTok skips renewed consent for this already-authorized account), video preview/selection, privacy, disclosures, music consent and the existing completed private result. They do not show a fresh submission or the final-review panel. Public customer publishing remains gated pending approval/audit. video.upload is included by the portal but Upload-to-Inbox is not implemented.

## Submitted configuration
- Category Social Networking; platform Web.
- Website https://music-promotion-secretary-tiktok-sa.vercel.app/
- Terms /terms; privacy /privacy on the same verified origin.
- Callback /api/integrations/social/tiktok/callback on the same origin.
- Login Kit and Content Posting API with Direct Post enabled.
- Scopes user.info.basic, video.publish, video.upload (automatically included by product).
- Public signature public/tiktokqEtFTo8ThCPeSgODt8A79vHD9RTyrO4L.txt verifies this origin under the Production application.
- Actual production hosting/database credentials were not changed.

## Follow-up
Read TikTok's review comments when available and address actual feedback. A generic application approval is not proof of Direct Post audit/public visibility approval.
Known risks: mandatory video.upload is not implemented, demonstration gaps disclosed above, and Sandbox test-only presentation may need changes for public service review.
Do not promise acceptance or a review date.
