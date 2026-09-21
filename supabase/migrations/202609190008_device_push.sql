-- Private, opt-in device subscriptions. No account, location or IP history.
create table public.device_push_subscriptions (
  id uuid primary key,
  token_hash text not null check (length(token_hash) = 64),
  endpoint text not null unique check (length(endpoint) <= 2048),
  subscription jsonb not null,
  mosque_ids uuid[] not null check (cardinality(mosque_ids) <= 50),
  preferences jsonb not null,
  delivery_state jsonb not null default '{}',
  expires_at timestamptz not null default now() + interval '90 days',
  checked_at timestamptz not null default '-infinity',
  lease_id uuid,
  lease_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.device_push_subscriptions enable row level security;
revoke all on public.device_push_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on public.device_push_subscriptions to service_role;
create index device_push_due on public.device_push_subscriptions(checked_at, expires_at);

create function public.save_device_push(device_id uuid, device_token_hash text, push_subscription jsonb, followed_ids uuid[], device_preferences jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare existing public.device_push_subscriptions%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(728402);
  delete from public.device_push_subscriptions where expires_at < now();
  select * into existing from public.device_push_subscriptions where id = device_id for update;
  if found and existing.token_hash <> device_token_hash then raise exception 'Invalid device credential' using errcode = '42501'; end if;
  -- Match the minute worker's bounded batch. Raise only after measuring throughput.
  if not found and (select count(*) from public.device_push_subscriptions) >= 20 then raise exception 'Push pilot capacity reached' using errcode = '54000'; end if;
  insert into public.device_push_subscriptions(id, token_hash, endpoint, subscription, mosque_ids, preferences)
  values(device_id, device_token_hash, push_subscription->>'endpoint', push_subscription, followed_ids, device_preferences)
  on conflict(id) do update set endpoint = excluded.endpoint, subscription = excluded.subscription,
    mosque_ids = excluded.mosque_ids, preferences = excluded.preferences,
    updated_at = now(), expires_at = now() + interval '90 days', lease_id = null, lease_until = null;
end;
$$;

create function public.claim_device_push(batch_size integer default 20)
returns setof public.device_push_subscriptions language sql security definer set search_path = '' as $$
  with candidates as (
    select id from public.device_push_subscriptions
    where expires_at > now() and preferences->>'enabled' = 'true'
      and (lease_until is null or lease_until < now()) and checked_at < now() - interval '50 seconds'
    order by checked_at limit least(greatest(batch_size, 1), 20) for update skip locked
  )
  update public.device_push_subscriptions d set lease_id = gen_random_uuid(), lease_until = now() + interval '2 minutes', checked_at = now()
  from candidates c where d.id = c.id returning d.*;
$$;
revoke all on function public.save_device_push(uuid,text,jsonb,uuid[],jsonb), public.claim_device_push(integer) from public, anon, authenticated;
grant execute on function public.save_device_push(uuid,text,jsonb,uuid[],jsonb), public.claim_device_push(integer) to service_role;
