-- Optional deployment operation, NOT part of automatic migrations.
-- Enable pg_cron and pg_net in Supabase. In Vault create secrets named:
-- minarah_site_url = your HTTPS origin; minarah_cron_secret = Vercel CRON_SECRET.
-- Apply migration 008, set the Vercel push variables, and deploy first.
-- Running this file schedules actual notification delivery; review before applying.
select cron.schedule(
  'minarah-push-dispatch', '* * * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'minarah_site_url') || '/api/push/dispatch',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'minarah_cron_secret')),
      body := '{}'::jsonb,
      timeout_milliseconds := 55000
    );
  $job$
);
