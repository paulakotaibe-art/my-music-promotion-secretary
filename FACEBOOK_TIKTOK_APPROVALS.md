# Facebook and TikTok registration and review preparation
Status: connection foundation only; direct publishing, scheduling, token renewal, disconnect/revocation handling and final publication verification are NOT implemented for these platforms yet. Customer launch stays closed. No approval submission has been made.

## Owner setup
Register an app in https://developers.facebook.com/apps/ and https://developers.tiktok.com/ .
Save credentials in Vercel Production, never chat:
FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, FACEBOOK_API_VERSION (currently documented v26.0);
TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET.
Mark secrets Sensitive. Existing YouTube/Stripe/encryption keys stay unchanged.
Callbacks implemented:
https://my-music-promotion-secretary-x96x.vercel.app/api/integrations/social/facebook/callback
https://my-music-promotion-secretary-x96x.vercel.app/api/integrations/social/tiktok/callback

## Facebook
Pages only, not personal profiles. Request pages_show_list, pages_read_engagement, pages_manage_posts. Customer use requires the applicable Advanced Access/app review and business verification; assess Tech Provider requirements in the developer dashboard. Prepare a recording of login, Page selection, explicit content approval, publishing, and the resulting Page post. Complete privacy policy, terms, data deletion instructions/callback requirements, support contacts and domain checks before submitting. The current connection page alone is not sufficient evidence of publishing.

## TikTok
Add Login Kit (web) and Content Posting API Direct Post. Request user.info.basic and video.publish. Register the fixed callback. Unaudited clients have private-only restrictions; public posting requires an audit. Prepare a working creator-facing product, not merely an internal owner utility.
Before enabling Publish: retrieve fresh creator_info, show creator nickname, derive privacy choices from returned options with no default, respect duration and interaction limits, start interaction controls unchecked, include required music-use consent and commercial-content disclosures. Show processing/status, allow editable caption and preview. Do not add app promotional watermarks. PULL_FROM_URL requires verified domain/URL-prefix ownership; select transfer method during implementation.
TikTok scheduled publishing requires an app-side durable worker with fresh checks at execution; do not claim native scheduling from its video init endpoint.

## Implementation delivered
User-bound OAuth state; fixed provider endpoints/callbacks; revalidated app session on callback; encrypted provider credentials; owner-scoped RLS; server-validated Facebook Page selection; metadata-only client responses. The connection UI labels publishing as unavailable. A connected account does not establish approval or permission to publish for subscribers.

## Validation
Three mocked OAuth tests pass: platform/state isolation, TikTok scope/account matching, Facebook permission and Page-task filtering. Transactional authenticated-role database checks pass for own insert, denied cross-user insert and hidden cross-user reads. No provider credentials or live social publishing tests were available.

## Official references checked 23 October 2026
https://developers.facebook.com/docs/graph-api/reference/page/videos/
https://developers.facebook.com/docs/graph-api/overview/access-levels/
https://developers.facebook.com/docs/development/release/tech-providers/
https://developers.tiktok.com/docs/en/login-kit-web
https://developers.tiktok.com/docs/en/oauth-user-access-token-management
https://developers.tiktok.com/docs/en/content-sharing-guidelines
https://developers.tiktok.com/docs/en/content-posting-api-reference-query-creator-info
