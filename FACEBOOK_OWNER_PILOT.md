# Facebook owner upload pilot

The `/facebook-test` studio starts with one unpublished owner MP4 upload (up to 50 MB). A live verified, processed, unpublished video can then be published now or scheduled on the same Page without another upload. Subscriber publishing remains closed; this owner pilot is not a substitute for App Review approval.

The server validates the app owner, canonical request origin, draft ownership, generated storage URL, MP4 signature and size, and saved selected Page/token. Before the provider write it reserves a unique user/draft attempt. Uncertain writes are never retried automatically. Signed receipts bind user, Page and attempt. Status reads verify the returned Page and separately check processing and the `published` flag. No credentials or raw provider errors are returned to the browser.

Apply `database/facebook-owner-pilot.sql` before deployment. RLS independently limits these records to the existing app owner; subscriber attempts remain blocked, so this pilot does not consume subscriber allowances. The uploaded promotional source stays accessible through its existing public storage URL. An unpublished Page video is not presented as a private YouTube video.

Pilot: open `/facebook-test`, choose a saved MP4, confirm rights, review the target Page and click Upload unpublished test. Refresh checks while Facebook processes. A passing receipt must be live verified, processed and unpublished. If outcome is unknown, check Meta Business Suite before creating another copy.

The unpublished pilot passed with video `1839738473687282`. Apply `database/facebook-owner-releases.sql` for the release ledger. Only the existing app owner can reserve or read releases. Each upload/video has at most one release attempt; an uncertain provider write is never retried automatically. Signed results bind user, upload, Page, video, mode and requested time. The API rechecks the actual Page, processing and unpublished state immediately before the write.

Public release uses POST on the existing video with published=true. The initial native scheduling pilot failed to retain the requested time. Scheduling now uses the app-managed dispatcher documented in `FACEBOOK_APP_SCHEDULER.md`, with a 10-minute to 28-day range. The browser converts device time to an explicit UTC instant; review displays the timezone. The database wakes the server once a minute when jobs are due, independently of the browser, and the server separately verifies actual Facebook publication. Uncertain writes are never automatically retried.

Remaining: run real public and scheduled owner pilots, token renewal/revocation and customer permission approvals. Subscriber publishing also requires integration with atomic plan allowances before it can open. No real release is triggered by deploying this feature; the user reviews and clicks the final Publish button.

Primary API references: https://developers.facebook.com/docs/graph-api/reference/page/videos/ and Meta's generated SDK https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/page.py .
