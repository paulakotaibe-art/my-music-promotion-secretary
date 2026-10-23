# Subscriber YouTube connection

Signed-in users can connect through /connections. The POST uses the authenticated server user, fixed Google callback and encrypted ten-minute state cookie. Callback revalidates the saved session and exact app user before exchanging the code. The verified channel and encrypted offline tokens are upserted only for that user through their RLS-scoped client. A failed callback keeps the existing connection. The metadata endpoint selects no tokens and accepts no user identifier.

Direct upload routes retain owner-only checks. Connecting consumes no allowance and does not enable subscriber publishing. Google OAuth Testing still restricts who can authorize; complete verification and a non-owner browser pilot before public onboarding. No subscriber consent or successful non-owner connection is claimed by unit tests.
