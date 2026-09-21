# Background notification deployment

Implementation is prepared for Vercel + Supabase. **It is not activated or delivery-verified.** Existing foreground notifications remain available without this setup. No user account is required for push; explicit device consent is required.

## Provisioning

1. Apply `supabase/migrations/202609190008_device_push.sql` after the earlier migrations. For an entirely new project only, the regenerated `supabase/setup.sql` includes it.
2. `node scripts/generate-push-keys.mjs` writes private values to ignored `.env.push.local`, refusing to overwrite an existing file. A local file has already been generated during implementation. Never commit it or paste its contents into issues/chat.
3. Set server-only Vercel environment values: `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`, and `PUSH_ENABLED=1`. Keep `NEXT_PUBLIC_SITE_URL` set to the exact deployed origin. Only the public VAPID key is returned to the browser; do not prefix private variables with `NEXT_PUBLIC_`.
4. Deploy the code with the migration applied. Configure the scheduler before inviting users to subscribe.
5. Enable Supabase `pg_cron` and `pg_net`. In Supabase Vault add `minarah_site_url` (HTTPS app origin) and `minarah_cron_secret` (the same CRON_SECRET). Review and execute `supabase/schedule-push-dispatch.sql` to invoke the protected POST sender every minute.
6. On a test phone, enable notifications, follow a test mosque, then explicitly enable background alerts. Test a published reminder and an edited timetable, with the app closed. Test disabling notifications, changing lead time and removing favourites. Do not use real mosque timetable edits as test fixtures.

Vercel Hobby cron is not suitable for minute-level reminders. The optional SQL scheduler follows Supabase's documented pg_cron/pg_net/Vault pattern; provider quotas and timing limits still apply. Sources: [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing), [Supabase scheduling](https://supabase.com/docs/guides/functions/schedule-functions), [web-push](https://github.com/web-push-libs/web-push).

## Current pilot bounds and failure handling

- Registration is capped at **20 devices**, matching the bounded worker batch. Raise this only after throughput measurement or a queued/fan-out sender is implemented. This cap prevents silent growth beyond the current sender's reminder window.
- Subscriptions contain a browser endpoint, encryption keys, favourite mosque IDs and notification preferences. No coordinates, saved places, user accounts, contact details or IP history are stored.
- A random device credential is hashed server-side. Updates/deletion require that credential; browser database roles cannot read/write the subscription table or call worker RPCs. Browser endpoints are allowlisted to known HTTPS push providers to prevent arbitrary outbound requests.
- Each dispatch takes an exclusive two-minute lease and checkpoints each processed mosque. Preference changes invalidate old leases. Delivery is best effort, at least once across crashes; consistent browser notification tags reduce duplicate display. Browser/OS throttling can delay or suppress notifications. No exact-time delivery guarantee is made.
- First subscription silently establishes publication baselines. Only later publication changes alert. Friday eligibility uses the existing mosque-timezone resolver. Synthetic mosques never generate pushes. Reminders expire at their Jamaat time.
- Expired provider endpoints (404/410) are deleted. Device records expire after 90 days without app synchronization and are removed by dispatch or registration cleanup. Preferences that fail to synchronize display an explicit warning; server settings may still be the previous values until retry succeeds.
- Successful background registration suppresses foreground polling on that device to avoid two senders. Clearing browser storage loses the device credential; disable push before clearing storage, or let the old record expire.
- Sender logs contain event category, random reference and timestamp only. No raw error, subscription endpoint, body, credential or mosque/user identifiers are logged.

## Operations

Monitor Supabase cron runs and Vercel `push_dispatch_failed` / `push_subscription_failed` events. A healthy HTTP dispatch result includes counts only. Authorization failures return 401. Unconfigured deployments return 503 and show background delivery as unavailable in the app.

To stop sends immediately, disable the Supabase cron job. Keep the subscription API deployed so devices can delete subscriptions. Setting PUSH_ENABLED=0 disables subscription writes as well as dispatch; do not treat that flag alone as a user-facing unsubscribe workflow. Restore service before requesting device removal. An in-flight provider request can still complete after a disable operation.
