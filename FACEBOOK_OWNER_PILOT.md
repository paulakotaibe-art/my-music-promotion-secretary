# Facebook owner upload pilot

The `/facebook-test` studio sends one unpublished video copy from an existing owner MP4 draft (up to 50 MB) to the owner's saved Facebook Page. It never requests public publication or a schedule. It is not a substitute for subscriber App Review approval.

The server validates the app owner, canonical request origin, draft ownership, generated storage URL, MP4 signature and size, and saved selected Page/token. Before the provider write it reserves a unique user/draft attempt. Uncertain writes are never retried automatically. Signed receipts bind user, Page and attempt. Status reads verify the returned Page and separately check processing and the `published` flag. No credentials or raw provider errors are returned to the browser.

Apply `database/facebook-owner-pilot.sql` before deployment. RLS independently limits these records to the existing app owner; subscriber attempts remain blocked, so this pilot does not consume subscriber allowances. The uploaded promotional source stays accessible through its existing public storage URL. An unpublished Page video is not presented as a private YouTube video.

Pilot: open `/facebook-test`, choose a saved MP4, confirm rights, review the target Page and click Upload unpublished test. Refresh checks while Facebook processes. A passing receipt must be live verified, processed and unpublished. If outcome is unknown, check Meta Business Suite before creating another copy.

Remaining: complete a real unpublished pilot, then implement and test public and scheduled releases, token renewal/revocation and customer permission approvals. Subscriber publishing also requires integration with atomic plan allowances before it can open.

Primary API references: https://developers.facebook.com/docs/graph-api/reference/page/videos/ and Meta's generated SDK https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/page.py .
