# Meta review access — preparation only

The proposed `/review-login` page uses Supabase's standard `signInWithPassword` flow. It does not create accounts, set passwords, accept terms, grant publishing, change billing gates, or bypass server authorization. Credentials are never embedded in source or the URL. Normal email-link login is unchanged. This branch is not submission-ready.

Before submission:

1. The owner creates a dedicated app review account and enters its password privately. Do not use the owner account or a personal Facebook password.
2. Implement and test a server-side, administrator-controlled reviewer entitlement for this exact account. It must cover Facebook's API, database reservation and scheduler checks, preserve own-row/own-Page restrictions, impose a small test allowance, and leave general customer launch closed. No entitlement is implemented by this branch. Do not add the reviewer to `app_owners` or set the general Meta approval flag.
3. Test sign-in, reconnection, upload, unpublished preparation, immediate/scheduled publication, quota use, cross-account denial and expiry/revocation using the dedicated account.
4. Provide the credentials only in Meta's private reviewer instructions after the owner confirms that disclosure. Meta's current form asks for access codes active for one year after submission; arrange that explicitly, with revocation available and no access to owner/admin/payment data.
5. Complete truthful Vercel and Supabase processing-country declarations using primary provider information, including remote access. Database region alone is not the full processing-country list.
6. Verify the uploaded app icon is saved, complete reviewer instructions, check business-verification status and all remaining requirements, then submit. A saved permission form/video is not proof of submission.

Current production remains gated and no reviewer access has been granted.
