# Direct YouTube owner pilot
Routes: /youtube-test and /api/youtube/uploads.
Only the server-verified owner may call these endpoints. Subscriber direct publishing remains closed.

The owner chooses a saved MP4 draft (50 MB maximum), explicit audience and synthetic-media disclosures and rights confirmation. Review precedes the final upload button. Private mode has no publishAt field and disables subscriber notifications. Public/scheduled modes are locked until a live YouTube read confirms a signed private attempt on the same channel is processed and still private.

YouTube holds scheduled uploads privately using status.publishAt. This is native YouTube scheduling, not a cross-platform background worker. Facebook/TikTok direct adapters are still pending. Public/scheduled uploads enable YouTube subscriber notifications; private tests do not.

Access tokens refresh using the stored offline token; rotated tokens are encrypted and persisted. Every upload rechecks the authorized channel. Media downloads accept only the current user's exact generated storage URL, reject redirects, cap streamed bytes and check the MP4 ftyp signature. This signature is an initial format check, not full media parsing.

A unique durable attempt is inserted before initiating a Google upload session. The single final PUT is never automatically retried. Unknown outcomes keep the attempt; inspect YouTube Studio before creating another draft. Resumable session initiation is used, but recovery/resuming an interrupted transfer is not implemented in this pilot. Session locations and tokens never go to the browser. Signed outcomes bind user, attempt, channel and mode. Read-only refresh checks YouTube video status and distinguishes upload, processing, visibility and scheduled release.

Private test and live publishing have not yet been exercised. This feature requires the owner to choose the saved video, declare audience/rights/synthetic content and confirm the private upload once on /youtube-test. Existing Metricool reservations are unchanged. A private test is a separate private copy. Do not claim a public video is live until an actual public URL and processing state are verified.

Still required before subscriber launch: ordinary-user connection and publishing flow without developer settings; Google app verification and durable authorization/revocation lifecycle; Facebook/TikTok adapters and approvals; shared promotion allowance reservation across all providers; media cost controls and full customer pilot. This owner endpoint deliberately rejects non-owners and does not consume subscriber allowances.
