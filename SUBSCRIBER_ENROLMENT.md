# Subscriber registration and enrolment

`/join` separates account registration from `/login`. Registration is presented as closed until the server billing-status endpoint reports live paid launch open. Existing users can sign in; login explicitly sets `shouldCreateUser:false` and registration sets it true. The server publishing and checkout gates remain the authority; hiding registration in the UI is not a security boundary for Supabase account creation. No existing Auth project settings are changed.

Both email-link screens use the already configured `/dashboard` callback. A validated one-hour local intent preserves only approved internal destinations and catalog plan identifiers, with no tokens or email addresses in that storage. Dashboard consumes it after Supabase verifies the user; cross-device sign-in falls back to the dashboard's visible setup link. Expired/error email links return a readable message rather than silently looping. Rate-limit errors give clear instructions with a client resend cooldown; production SMTP capacity still needs verification before launch.

`/get-started` shows registration, account/allowance status, Facebook Page connection and release preparation. The page reads authenticated readiness and public billing status; it does not claim that selecting a plan or returning from checkout confirms payment. Existing billing webhook verification and atomic quota enforcement remain mandatory. Closed checkout does not activate a subscription or take payment.

Pricing and help no longer promise automatic three-platform fan-out. Facebook currently accepts MP4; standalone audio conversion and direct TikTok publishing are not delivered.

Verified in code: safe internal return paths, stale/forged intent rejection, all Node tests, Next production build and unauthenticated route fences. A real non-owner email delivery, mobile sign-in, checkout/webhook, Facebook authorization and public-post pilot remain required. No test email, paid transaction or subscriber post is sent by these checks. Legal/support pages, Meta customer access and production email/billing readiness must be completed before public enrolment opens.
