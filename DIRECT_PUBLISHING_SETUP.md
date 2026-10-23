# Direct publishing rollout

Owner setup: https://my-music-promotion-secretary-x96x.vercel.app/publishing-setup

## Delivered foundation
Owner-only YouTube OAuth authorization and callback, server-validated app identity, ten-minute encrypted HttpOnly/Secure state cookie, provider-bound state, offline upload/read-only consent, verified channel lookup, encrypted tokens in an ownership-protected table, and an owner-only status API that never returns tokens. No direct video is uploaded by this flow. Existing Metricool scheduling is unchanged.

## Owner registration
Use a Google Cloud project belonging to the app business. Enable YouTube Data API v3, configure the External OAuth app in Testing, add the channel owner's Google account as a test user, and request youtube.upload and youtube.readonly. Create a Web application OAuth client with this exact redirect URI:

https://my-music-promotion-secretary-x96x.vercel.app/api/integrations/youtube/callback

Save YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in Vercel Production; mark the secret Sensitive. Redeploy and use Authorize YouTube channel on the setup page. Do not send secrets in chat. Production Google verification, verified domain/homepage/privacy disclosures and quota readiness must be completed before public subscriber onboarding. Testing-mode offline credentials may expire and are not production readiness.

## Encryption and access
Tokens reuse the existing server-side METRICOOL_OAUTH_ENCRYPTION_KEY AES-256-GCM encryption utility. Despite its legacy name, preserve that key while either provider has saved connections; removing Metricool must not remove or rotate this key without a planned re-encryption migration. No service-role credential is added. Authenticated clients can access only their own encrypted connection row; the authorization endpoints are additionally gated to the server-verified owner for this pilot. Revocation and refresh are not implemented yet, and a saved connection may expire or be revoked.

## Still required
- Token refresh/rotation and revoke/disconnect; server verification before upload.
- Resumable YouTube uploads with an explicit private owner test before any public post.
- Durable scheduler, per-platform job identity and publication status; integrate the existing allowance reservation before any write, avoiding duplicate writes after uncertain results.
- Facebook Page and TikTok developer registration, consent and permission/audit reviews. Their direct adapters are not implemented yet.
- Non-owner pilot, platform result/public-link verification, usage accounting, storage cost measurements and final customer-facing readiness.

Paid launch remains closed. This foundation alone does not remove Metricool from live scheduling and is not a completed direct publishing system.

Official reference: https://developers.google.com/identity/protocols/oauth2/web-server
