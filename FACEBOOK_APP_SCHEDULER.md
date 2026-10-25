# App-managed Facebook schedules

The native scheduling pilot failed: Facebook returned a processed, unpublished video without the requested schedule. The app now keeps the schedule in Postgres and publishes the existing video when due. Public-now publishing still uses the existing explicit review flow.

`pg_cron` checks once per minute; `pg_net` wakes `/api/facebook/dispatch` only when a queued job is due. No browser must remain open. Dispatch is normally within one minute, subject to provider/network availability. It is not an exact-second guarantee.

Security: wake-up uses a random 256-bit, single-use nonce with a two-minute lifetime. Only its digest is stored in a private table. Claims atomically lock due rows, exclude already-claimed jobs and return a separate completion key. The server validates the signed receipt's owner, Page, video, upload and time before decrypting the saved Page connection. It rereads the actual video and publishes once. Acknowledgement is not publication: a final read verifies actual published status. No raw provider errors or credentials are returned in the HTTP response.

No external write is automatically retried after uncertainty. Abandoned claims become unconfirmed after five minutes; queued jobs over ten minutes late are marked missed rather than published unexpectedly. Existing failed native attempts are not automatically enqueued. The owner must choose a new future time through Ready to Publish → Publish. A live check must first confirm the existing video is processed, unpublished and has no native schedule. It can then replace the failed request on the same release row without uploading another video.

Database objects: `database/facebook-app-scheduler.sql`. The cron is named `facebook-owner-dispatch`; pause using `cron.unschedule('facebook-owner-dispatch')`. The scheduling RPC is owner-only, and subscriber launch remains closed. The dispatcher uses the deployment's existing encryption and signing configuration; no service-role key or new long-lived shared secret was added.

Verification: JavaScript tests cover receipt tampering, Page identity, early/late execution, already-published videos, one-write behavior and uncertain responses. Rollback-only database tests cover replay prevention, double claims, completion keys, future jobs, late jobs, owner recovery and cross-account denial. A deployed empty-work wake-up verifies the database-to-server handoff without publishing content. A fresh future owner pilot is still required to establish end-to-end publication success.

Platform advisory: the hosted pg_net package is non-relocatable and its extension metadata is registered in public, although it defines zero public functions. Its functions live in net. Sensitive scheduler data is in app_private with no client table privileges; exposed RPCs independently enforce the owner identity or one-use random dispatch credentials. The two private scheduler tables intentionally have RLS with no client policies. Existing unrelated advisor findings were not changed.

References: https://supabase.com/docs/guides/database/extensions/pgnet and https://supabase.com/docs/guides/functions/schedule-functions .
