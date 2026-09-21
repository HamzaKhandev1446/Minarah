-- Minarah: run ONCE on a new Supabase project in SQL Editor.
-- Existing projects: use the versioned migration workflow instead.
-- No sample mosque data or privileged accounts are included.
begin;

-- 202609070001_foundation.sql
-- All visitor location queries are ephemeral. No user location/history tables.
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists btree_gist with schema extensions;
create extension if not exists pg_trgm with schema extensions;
set search_path = public, extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 120),
  created_at timestamptz not null default now()
);
create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.mosques (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 160),
  name text not null check (length(trim(name)) between 2 and 160),
  address_line text not null check (length(address_line) between 2 and 300),
  locality text not null default '' check (length(locality) <= 120),
  city text not null check (length(city) between 1 and 120),
  region text not null default '' check (length(region) <= 120),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  postal_code text not null default '' check (length(postal_code) <= 24),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location extensions.geography(Point, 4326) generated always as
    (extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography) stored,
  timezone text not null,
  phone text check (length(phone) <= 40),
  website text check (website ~ '^https?://' and length(website) <= 500),
  verification_status text not null default 'pending' check (verification_status in ('unverified','pending','verified','rejected')),
  verified_at timestamptz,
  is_synthetic boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verified_timestamp check ((verification_status = 'verified') = (verified_at is not null))
);
create index mosques_location_gist on public.mosques using gist(location);
create index mosques_search_trgm on public.mosques using gin ((lower(name || ' ' || city || ' ' || locality)) extensions.gin_trgm_ops);

create function public.validate_mosque_timezone() returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists(select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Unknown IANA timezone' using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger mosque_timezone_check before insert or update on public.mosques for each row execute function public.validate_mosque_timezone();

create table public.mosque_members (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','editor')),
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(mosque_id, user_id)
);
create index mosque_members_user on public.mosque_members(user_id, status);

create table public.jamaat_schedules (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  effective_from date not null,
  effective_to date not null,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  revision integer not null default 1 check (revision > 0),
  created_by uuid references auth.users(id) on delete set null,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to >= effective_from),
  check (status = 'draft' or published_at is not null),
  exclude using gist (mosque_id with =, daterange(effective_from, effective_to, '[]') with &&) where (status = 'published')
);
create index jamaat_schedules_lookup on public.jamaat_schedules(mosque_id, status, effective_from, effective_to);
create table public.jamaat_schedule_entries (
  schedule_id uuid not null references public.jamaat_schedules(id) on delete cascade,
  prayer text not null check (prayer in ('fajr','dhuhr','asr','maghrib','isha')),
  local_time time without time zone not null check (local_time < time '24:00' and extract(second from local_time) = 0),
  primary key(schedule_id, prayer)
);
create table public.jumuah_sessions (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.jamaat_schedules(id) on delete cascade,
  position integer not null check (position between 1 and 10),
  local_time time without time zone not null check (local_time < time '24:00' and extract(second from local_time) = 0),
  label text check (length(label) <= 80),
  unique(schedule_id, position)
);
-- Overrides belong to a revision so draft overrides never leak into public reads.
create table public.schedule_overrides (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.jamaat_schedules(id) on delete cascade,
  local_date date not null,
  prayer text not null check (prayer in ('fajr','dhuhr','asr','maghrib','isha')),
  local_time time without time zone not null check (local_time < time '24:00' and extract(second from local_time) = 0),
  unique(schedule_id, local_date, prayer)
);
create table public.schedule_change_log (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id),
  schedule_id uuid not null references public.jamaat_schedules(id),
  changed_by uuid references auth.users(id) on delete set null,
  previous_value jsonb,
  new_value jsonb not null,
  effective_date date not null,
  change_type text not null check (change_type in ('publish','replace')),
  created_at timestamptz not null default now()
);
create index schedule_change_log_mosque on public.schedule_change_log(mosque_id, created_at desc);

create table public.mosque_claims (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id),
  requester_id uuid not null references auth.users(id),
  name text not null check (length(trim(name)) between 2 and 120),
  contact text not null check (length(trim(contact)) between 3 and 250),
  role_at_mosque text not null check (length(trim(role_at_mosque)) between 2 and 120),
  explanation text not null check (length(trim(explanation)) between 10 and 2000),
  supporting_details text check (length(supporting_details) <= 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index one_pending_claim_per_user on public.mosque_claims(mosque_id, requester_id) where status = 'pending';
create table public.mosque_submissions (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references auth.users(id),
  name text not null check (length(trim(name)) between 2 and 160),
  address_line text not null check (length(trim(address_line)) between 2 and 300),
  city text not null check (length(trim(city)) between 1 and 120),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  phone text check (length(phone) <= 40),
  website text check (website ~ '^https?://' and length(website) <= 500),
  notes text check (length(notes) <= 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  approved_mosque_id uuid references public.mosques(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index mosque_claims_review on public.mosque_claims(status, created_at);
create index mosque_submissions_review on public.mosque_submissions(status, created_at);

create table public.mosque_qr_codes (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  code text not null unique default translate(rtrim(encode(uuid_send(gen_random_uuid()), 'base64'), '='), '+/', '-_') check (code ~ '^[A-Za-z0-9_-]{16,32}$'),
  status text not null default 'active' check (status in ('active','disabled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index mosque_qr_codes_mosque on public.mosque_qr_codes(mosque_id);

-- These definer helpers prevent recursive policies; roles are never JWT user metadata.
create function public.is_platform_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.platform_admins where user_id = (select auth.uid()));
$$;
create function public.can_manage_mosque(target_mosque uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.mosque_members where mosque_id = target_mosque and user_id = (select auth.uid()) and status = 'active' and role in ('owner','admin','editor'));
$$;

alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.mosques enable row level security;
alter table public.mosque_members enable row level security;
alter table public.jamaat_schedules enable row level security;
alter table public.jamaat_schedule_entries enable row level security;
alter table public.jumuah_sessions enable row level security;
alter table public.schedule_overrides enable row level security;
alter table public.schedule_change_log enable row level security;
alter table public.mosque_claims enable row level security;
alter table public.mosque_submissions enable row level security;
alter table public.mosque_qr_codes enable row level security;

create policy own_profile on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy public_mosques on public.mosques for select to anon, authenticated using (verification_status <> 'rejected' or public.is_platform_admin() or public.can_manage_mosque(id));
create policy own_memberships on public.mosque_members for select to authenticated using (user_id = (select auth.uid()) or public.is_platform_admin());
create policy readable_schedules on public.jamaat_schedules for select to anon, authenticated using (
  (status = 'published' and exists(select 1 from public.mosques m where m.id = mosque_id and m.verification_status <> 'rejected')) or public.can_manage_mosque(mosque_id) or public.is_platform_admin()
);
create policy readable_entries on public.jamaat_schedule_entries for select to anon, authenticated using (exists(select 1 from public.jamaat_schedules s where s.id = schedule_id));
create policy readable_jumuah on public.jumuah_sessions for select to anon, authenticated using (exists(select 1 from public.jamaat_schedules s where s.id = schedule_id));
create policy readable_overrides on public.schedule_overrides for select to anon, authenticated using (exists(select 1 from public.jamaat_schedules s where s.id = schedule_id));
create policy readable_audit on public.schedule_change_log for select to authenticated using (public.can_manage_mosque(mosque_id) or public.is_platform_admin());
create policy readable_claims on public.mosque_claims for select to authenticated using (requester_id = (select auth.uid()) or public.is_platform_admin());
create policy readable_submissions on public.mosque_submissions for select to authenticated using (requester_id = (select auth.uid()) or public.is_platform_admin());
create policy managed_qr_codes on public.mosque_qr_codes for select to authenticated using (public.can_manage_mosque(mosque_id) or public.is_platform_admin());

-- Deny direct writes, including draft children. Transactional RPCs are the only
-- application write path; service-role/operator migrations remain privileged.
revoke all on public.profiles, public.platform_admins, public.mosques, public.mosque_members, public.jamaat_schedules, public.jamaat_schedule_entries, public.jumuah_sessions, public.schedule_overrides, public.schedule_change_log, public.mosque_claims, public.mosque_submissions, public.mosque_qr_codes from anon, authenticated;
grant select on public.mosques, public.jamaat_schedules, public.jamaat_schedule_entries, public.jumuah_sessions, public.schedule_overrides to anon, authenticated;
grant select on public.profiles, public.mosque_members, public.schedule_change_log, public.mosque_claims, public.mosque_submissions, public.mosque_qr_codes to authenticated;
revoke all on function public.is_platform_admin(), public.can_manage_mosque(uuid), public.validate_mosque_timezone() from public;
grant execute on function public.is_platform_admin(), public.can_manage_mosque(uuid) to anon, authenticated;
grant usage on schema extensions to anon, authenticated;

create function public.nearby_mosques(lat double precision, lng double precision, radius_meters integer default 5000, result_limit integer default 20)
returns table(id uuid, slug text, name text, city text, timezone text, verification_status text, distance_meters double precision, is_synthetic boolean)
language plpgsql stable security invoker set search_path = '' as $$
declare point extensions.geography;
begin
  if lat is null or lng is null or not (lat between -90 and 90) or not (lng between -180 and 180) or radius_meters is null or radius_meters not between 100 and 50000 or result_limit is null or result_limit not between 1 and 50 then
    raise exception 'Invalid nearby query' using errcode = '22023';
  end if;
  point := extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography;
  return query select m.id, m.slug, m.name, m.city, m.timezone, m.verification_status, extensions.st_distance(m.location, point), m.is_synthetic
  from public.mosques m where m.verification_status <> 'rejected' and extensions.st_dwithin(m.location, point, radius_meters)
  order by extensions.st_distance(m.location, point), m.id limit result_limit;
end;
$$;

create function public.search_mosques(query text, result_limit integer default 20) returns setof public.mosques
language plpgsql stable security invoker set search_path = '' as $$
declare escaped text;
begin
  if query is null or length(trim(query)) not between 2 and 120 or result_limit is null or result_limit not between 1 and 50 then
    raise exception 'Enter between 2 and 120 characters' using errcode = '22023';
  end if;
  escaped := replace(replace(replace(lower(trim(query)), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_');
  return query select m.* from public.mosques m where m.verification_status <> 'rejected' and lower(m.name || ' ' || m.city || ' ' || m.locality) like '%' || escaped || '%' order by m.name, m.id limit result_limit;
end;
$$;

-- Narrow resolver exposes neither a directory of codes nor creator information.
create function public.resolve_qr(qr_code text) returns table(status text, mosque_slug text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if qr_code is null or qr_code !~ '^[A-Za-z0-9_-]{16,32}$' then
    return query select 'invalid'::text, null::text; return;
  end if;
  return query select case when q.status = 'disabled' then 'disabled' else 'active' end, case when q.status = 'active' then m.slug else null end
  from public.mosque_qr_codes q join public.mosques m on m.id = q.mosque_id where q.code = qr_code and m.verification_status <> 'rejected';
  if not found then return query select 'invalid'::text, null::text; end if;
end;
$$;
revoke all on function public.nearby_mosques(double precision, double precision, integer, integer), public.search_mosques(text, integer), public.resolve_qr(text) from public;
grant execute on function public.nearby_mosques(double precision, double precision, integer, integer), public.search_mosques(text, integer), public.resolve_qr(text) to anon, authenticated;
reset search_path;


-- 202609070002_schedule_transactions.sql
-- Private snapshot function includes all schedule data in each publication audit.
create function public.schedule_snapshot(target_schedule uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'schedule', to_jsonb(s),
    'entries', coalesce((select jsonb_agg(to_jsonb(e) order by e.prayer) from public.jamaat_schedule_entries e where e.schedule_id = s.id), '[]'::jsonb),
    'jumuah_sessions', coalesce((select jsonb_agg(to_jsonb(j) order by j.position) from public.jumuah_sessions j where j.schedule_id = s.id), '[]'::jsonb),
    'overrides', coalesce((select jsonb_agg(to_jsonb(o) order by o.local_date, o.prayer) from public.schedule_overrides o where o.schedule_id = s.id), '[]'::jsonb)
  ) from public.jamaat_schedules s where s.id = target_schedule;
$$;
revoke all on function public.schedule_snapshot(uuid) from public, anon, authenticated;

-- Full draft replacement is atomic; optimistic revision prevents lost edits.
create function public.save_schedule_draft(
  target_mosque uuid, effective_start date, effective_end date,
  entries jsonb, friday_sessions jsonb default '[]'::jsonb,
  overrides jsonb default '[]'::jsonb,
  draft_id uuid default null, expected_revision integer default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  saved_id uuid;
  current_draft public.jamaat_schedules%rowtype;
begin
  if auth.uid() is null or not public.can_manage_mosque(target_mosque) then
    raise exception 'Active mosque membership required' using errcode = '42501';
  end if;
  if effective_start is null or effective_end is null or effective_end < effective_start then
    raise exception 'Invalid effective period' using errcode = '22023';
  end if;
  if entries is null or jsonb_typeof(entries) <> 'array' or friday_sessions is null or jsonb_typeof(friday_sessions) <> 'array' or overrides is null or jsonb_typeof(overrides) <> 'array' then
    raise exception 'Schedule data must be arrays' using errcode = '22023';
  end if;
  if jsonb_array_length(entries) <> 5 or jsonb_array_length(friday_sessions) > 10 or jsonb_array_length(overrides) > 500 then
    raise exception 'Provide five prayers, at most ten Friday sessions and 500 overrides' using errcode = '22023';
  end if;
  if exists(select 1 from jsonb_array_elements(entries || friday_sessions || overrides) e where e->>'localTime' is null or e->>'localTime' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') then
    raise exception 'Times must use HH:mm' using errcode = '22023';
  end if;
  if exists(select 1 from jsonb_array_elements(overrides) o where o->>'localDate' is null or o->>'localDate' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or (o->>'localDate')::date not between effective_start and effective_end) then
    raise exception 'Override dates must fall within the effective period' using errcode = '22023';
  end if;
  if draft_id is null then
    insert into public.jamaat_schedules(mosque_id, effective_from, effective_to, created_by)
    values(target_mosque, effective_start, effective_end, auth.uid()) returning id into saved_id;
  else
    select * into current_draft from public.jamaat_schedules where id = draft_id for update;
    if not found or current_draft.mosque_id <> target_mosque or current_draft.status <> 'draft' then
      raise exception 'Editable draft not found' using errcode = '22023';
    end if;
    if expected_revision is null or current_draft.revision <> expected_revision then
      raise exception 'Draft changed; reload before saving' using errcode = '40001';
    end if;
    saved_id := draft_id;
    update public.jamaat_schedules set effective_from = effective_start, effective_to = effective_end, revision = revision + 1, updated_at = now() where id = saved_id;
    delete from public.jamaat_schedule_entries where schedule_id = saved_id;
    delete from public.jumuah_sessions where schedule_id = saved_id;
    delete from public.schedule_overrides where schedule_id = saved_id;
  end if;
  insert into public.jamaat_schedule_entries(schedule_id, prayer, local_time)
    select saved_id, e->>'prayer', (e->>'localTime')::time from jsonb_array_elements(entries) e;
  insert into public.jumuah_sessions(schedule_id, position, local_time, label)
    select saved_id, (j->>'position')::integer, (j->>'localTime')::time, j->>'label' from jsonb_array_elements(friday_sessions) j;
  insert into public.schedule_overrides(schedule_id, local_date, prayer, local_time)
    select saved_id, (o->>'localDate')::date, o->>'prayer', (o->>'localTime')::time from jsonb_array_elements(overrides) o;
  return saved_id;
end;
$$;

create function public.publish_schedule(target_schedule uuid, expected_revision integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  draft public.jamaat_schedules%rowtype;
  old_schedule public.jamaat_schedules%rowtype;
  old_snapshot jsonb;
begin
  select * into draft from public.jamaat_schedules where id = target_schedule for update;
  if not found then raise exception 'Schedule not found' using errcode = '22023'; end if;
  if auth.uid() is null or not public.can_manage_mosque(draft.mosque_id) then
    raise exception 'Active mosque membership required' using errcode = '42501';
  end if;
  if draft.status <> 'draft' or expected_revision is null or draft.revision <> expected_revision then
    raise exception 'Draft changed; reload before publishing' using errcode = '40001';
  end if;
  -- Serialize publication per mosque. A revision is an immutable complete bundle.
  perform 1 from public.mosques where id = draft.mosque_id for update;
  if (select count(*) from public.jamaat_schedule_entries where schedule_id = target_schedule) <> 5 then
    raise exception 'All five prayer times are required' using errcode = '22023';
  end if;
  if exists(select 1 from public.schedule_overrides where schedule_id = target_schedule and local_date not between draft.effective_from and draft.effective_to) then
    raise exception 'Override outside effective period' using errcode = '22023';
  end if;
  -- Replace an exact period only. Other overlap is rejected by the exclusion
  -- constraint, rolling back archive and audit changes together.
  select * into old_schedule from public.jamaat_schedules where mosque_id = draft.mosque_id and status = 'published' and effective_from = draft.effective_from and effective_to = draft.effective_to for update;
  if found then
    old_snapshot := public.schedule_snapshot(old_schedule.id);
    update public.jamaat_schedules set status = 'archived', updated_at = now() where id = old_schedule.id;
  end if;
  update public.jamaat_schedules set status = 'published', published_at = now(), published_by = auth.uid(), updated_at = now(), revision = revision + 1 where id = target_schedule;
  insert into public.schedule_change_log(mosque_id, schedule_id, changed_by, previous_value, new_value, effective_date, change_type)
    values(draft.mosque_id, target_schedule, auth.uid(), old_snapshot, public.schedule_snapshot(target_schedule), draft.effective_from, case when old_snapshot is null then 'publish' else 'replace' end);
end;
$$;

revoke all on function public.save_schedule_draft(uuid, date, date, jsonb, jsonb, jsonb, uuid, integer), public.publish_schedule(uuid, integer) from public, anon;
grant execute on function public.save_schedule_draft(uuid, date, date, jsonb, jsonb, jsonb, uuid, integer), public.publish_schedule(uuid, integer) to authenticated;


-- 202609070003_public_distance.sql
-- A detail page can calculate one mosque's distance without enumerating nearby
-- mosques or persisting visitor coordinates. RLS still hides rejected mosques.
create function public.mosque_distance(target_mosque uuid, lat double precision, lng double precision)
returns double precision language plpgsql stable security invoker set search_path = '' as $$
declare distance double precision;
begin
  if lat is null or lng is null or not (lat between -90 and 90) or not (lng between -180 and 180) then
    raise exception 'Invalid coordinates' using errcode = '22023';
  end if;
  select extensions.st_distance(m.location, extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography)
  into distance from public.mosques m where m.id = target_mosque and m.verification_status <> 'rejected';
  return distance;
end;
$$;
revoke all on function public.mosque_distance(uuid, double precision, double precision) from public;
grant execute on function public.mosque_distance(uuid, double precision, double precision) to anon, authenticated;


-- 202609080004_onboarding_and_qr.sql
alter table public.mosque_submissions add column timezone text not null default 'UTC';

create function public.ensure_mosque_qr(target_mosque uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare result text;
begin
  if auth.uid() is null or not public.can_manage_mosque(target_mosque) then raise exception 'Active mosque membership required' using errcode = '42501'; end if;
  perform 1 from public.mosques where id = target_mosque for update;
  select code into result from public.mosque_qr_codes where mosque_id = target_mosque and status = 'active' order by created_at limit 1;
  if result is null then insert into public.mosque_qr_codes(mosque_id, created_by) values(target_mosque, auth.uid()) returning code into result; end if;
  return result;
end;
$$;

create function public.submit_mosque(payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then raise exception 'Invalid submission' using errcode = '22023'; end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name = payload->>'timezone') then raise exception 'Unknown IANA timezone' using errcode = '22023'; end if;
  -- Public submissions are pending only. A duplicate gate and bounded queue
  -- protect this initial pilot without collecting visitor IP/location history.
  perform pg_catalog.pg_advisory_xact_lock(728401);
  if (select count(*) from public.mosque_submissions where created_at > now() - interval '1 hour') >= 100 then raise exception 'Submission queue busy; try later' using errcode = '54000'; end if;
  if exists(select 1 from public.mosque_submissions where lower(name) = lower(trim(payload->>'name')) and lower(city) = lower(trim(payload->>'city')) and created_at > now() - interval '1 day') then raise exception 'A matching submission is already pending review' using errcode = '23505'; end if;
  insert into public.mosque_submissions(requester_id, name, address_line, city, country_code, latitude, longitude, timezone, phone, website, notes)
  values(auth.uid(), trim(payload->>'name'), trim(payload->>'addressLine'), trim(payload->>'city'), payload->>'countryCode', (payload->>'latitude')::double precision, (payload->>'longitude')::double precision, payload->>'timezone', nullif(payload->>'phone',''), nullif(payload->>'website',''), nullif(payload->>'notes','')) returning id into result;
  return result;
end;
$$;

create function public.submit_mosque_claim(target_mosque uuid, claimant_name text, contact_details text, mosque_role text, explanation_text text, supporting_text text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if auth.uid() is null then raise exception 'Sign in before claiming a mosque' using errcode = '42501'; end if;
  if not exists(select 1 from public.mosques where id = target_mosque and verification_status <> 'rejected' and not is_synthetic) then raise exception 'Mosque unavailable for claims' using errcode = '22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 0));
  if (select count(*) from public.mosque_claims where requester_id = auth.uid() and created_at > now() - interval '1 day') >= 5 then raise exception 'Daily claim limit reached' using errcode = '54000'; end if;
  insert into public.mosque_claims(mosque_id, requester_id, name, contact, role_at_mosque, explanation, supporting_details)
  values(target_mosque, auth.uid(), claimant_name, contact_details, mosque_role, explanation_text, supporting_text) returning id into result;
  return result;
end;
$$;

create function public.review_mosque_claim(claim_id uuid, approve boolean, member_role text default 'admin') returns void
language plpgsql security definer set search_path = '' as $$
declare claim public.mosque_claims%rowtype;
begin
  if auth.uid() is null or not public.is_platform_admin() then raise exception 'Platform administrator required' using errcode = '42501'; end if;
  if approve is null or member_role is null or member_role not in ('owner','admin','editor') then raise exception 'Invalid review decision' using errcode = '22023'; end if;
  select * into claim from public.mosque_claims where id = claim_id for update;
  if not found or claim.status <> 'pending' then raise exception 'Claim already reviewed or unavailable' using errcode = '22023'; end if;
  if approve then
    if not exists(select 1 from public.mosques where id = claim.mosque_id and verification_status <> 'rejected' and not is_synthetic) then raise exception 'Mosque unavailable' using errcode = '22023'; end if;
    insert into public.mosque_members(mosque_id, user_id, role, status) values(claim.mosque_id, claim.requester_id, member_role, 'active')
      on conflict(mosque_id, user_id) do update set role = excluded.role, status = 'active', updated_at = now();
    update public.mosques set verification_status = 'verified', verified_at = now() where id = claim.mosque_id;
  end if;
  update public.mosque_claims set status = case when approve then 'approved' else 'rejected' end, reviewed_by = auth.uid(), reviewed_at = now() where id = claim_id;
end;
$$;

create function public.review_mosque_submission(submission_id uuid, approve boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare submission public.mosque_submissions%rowtype; result uuid; generated_slug text;
begin
  if auth.uid() is null or not public.is_platform_admin() then raise exception 'Platform administrator required' using errcode = '42501'; end if;
  if approve is null then raise exception 'Invalid review decision' using errcode = '22023'; end if;
  select * into submission from public.mosque_submissions where id = submission_id for update;
  if not found or submission.status <> 'pending' then raise exception 'Submission already reviewed or unavailable' using errcode = '22023'; end if;
  if approve then
    generated_slug := coalesce(nullif(trim(both '-' from regexp_replace(lower(left(submission.name, 80)), '[^a-z0-9]+', '-', 'g')), ''), 'mosque') || '-' || replace(gen_random_uuid()::text,'-','');
    insert into public.mosques(slug, name, address_line, city, country_code, latitude, longitude, timezone, phone, website, verification_status)
    values(generated_slug, submission.name, submission.address_line, submission.city, submission.country_code, submission.latitude, submission.longitude, submission.timezone, submission.phone, submission.website, 'unverified') returning id into result;
    insert into public.mosque_qr_codes(mosque_id, created_by) values(result, auth.uid());
  end if;
  update public.mosque_submissions set status = case when approve then 'approved' else 'rejected' end, reviewed_by = auth.uid(), reviewed_at = now(), approved_mosque_id = result where id = submission_id;
  return result;
end;
$$;

create function public.create_user_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles(id) values(new.id) on conflict(id) do nothing; return new; end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_user_profile();
insert into public.profiles(id) select id from auth.users on conflict(id) do nothing;

revoke all on function public.ensure_mosque_qr(uuid), public.submit_mosque(jsonb), public.submit_mosque_claim(uuid,text,text,text,text,text), public.review_mosque_claim(uuid,boolean,text), public.review_mosque_submission(uuid,boolean), public.create_user_profile() from public, anon, authenticated;
grant execute on function public.submit_mosque(jsonb) to anon, authenticated;
grant execute on function public.ensure_mosque_qr(uuid), public.submit_mosque_claim(uuid,text,text,text,text,text), public.review_mosque_claim(uuid,boolean,text), public.review_mosque_submission(uuid,boolean) to authenticated;


-- 202609090005_registration_moderators.sql
-- Reviewed representative registration and two daily-time-only moderators.
alter table public.mosque_members drop constraint mosque_members_role_check;
alter table public.mosque_members add constraint mosque_members_role_check check (role in ('owner','admin','editor','moderator'));

create table public.mosque_registrations (
  submission_id uuid primary key references public.mosque_submissions(id),
  representative_name text not null check (length(representative_name) between 2 and 120),
  representative_role text not null check (length(representative_role) between 2 and 120),
  representative_contact text not null check (length(representative_contact) between 3 and 250),
  authority text not null check (length(authority) between 10 and 2000),
  moderators jsonb not null default '[]' check (jsonb_typeof(moderators) = 'array' and jsonb_array_length(moderators) <= 2)
);
alter table public.mosque_registrations enable row level security;
create policy registration_read on public.mosque_registrations for select to authenticated using (public.is_platform_admin() or exists(select 1 from public.mosque_submissions s where s.id = submission_id and s.requester_id = auth.uid()));

create table public.mosque_moderator_nominations (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id),
  slot smallint not null check (slot between 1 and 2),
  name text not null check (length(name) between 2 and 120),
  email text not null check (length(email) between 3 and 254),
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(mosque_id, slot), unique(mosque_id, email)
);
alter table public.mosque_moderator_nominations enable row level security;
create policy nomination_admin_read on public.mosque_moderator_nominations for select to authenticated using (public.is_platform_admin() or public.can_manage_mosque(mosque_id));
revoke all on public.mosque_registrations, public.mosque_moderator_nominations from public, anon, authenticated;
grant select on public.mosque_registrations, public.mosque_moderator_nominations to authenticated;

create function public.register_mosque(payload jsonb, representative jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid; nominees jsonb; owner_email text;
begin
  select lower(email) into owner_email from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if auth.uid() is null or owner_email is null then raise exception 'Confirmed sign-in required' using errcode = '42501'; end if;
  if representative is null or jsonb_typeof(representative) <> 'object' then raise exception 'Representative details required' using errcode = '22023'; end if;
  nominees := coalesce(representative->'moderators', '[]'::jsonb);
  if jsonb_typeof(nominees) <> 'array' then raise exception 'Invalid moderators' using errcode = '22023'; end if;
  if jsonb_array_length(nominees) > 2 or exists(select 1 from jsonb_array_elements(nominees) n where n->>'name' is null or length(trim(n->>'name')) not between 2 and 120 or n->>'email' is null or length(n->>'email') > 254 or n->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or lower(n->>'email') = owner_email)
    or (select count(distinct lower(n->>'email')) from jsonb_array_elements(nominees) n) <> jsonb_array_length(nominees) then raise exception 'Provide up to two distinct moderators other than yourself' using errcode = '22023'; end if;
  result := public.submit_mosque(payload);
  insert into public.mosque_registrations(submission_id, representative_name, representative_role, representative_contact, authority, moderators)
  values(result, trim(representative->>'representativeName'), trim(representative->>'representativeRole'), trim(representative->>'representativeContact'), trim(representative->>'authority'), nominees);
  return result;
end;
$$;

create function public.review_mosque_registration(submission_id uuid, approve boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid; registration public.mosque_registrations%rowtype; requester uuid;
begin
  if auth.uid() is null or not public.is_platform_admin() then raise exception 'Platform administrator required' using errcode = '42501'; end if;
  select * into registration from public.mosque_registrations r where r.submission_id = review_mosque_registration.submission_id for update;
  if not found then raise exception 'Registration not found' using errcode = '22023'; end if;
  select requester_id into requester from public.mosque_submissions s where s.id = submission_id;
  if approve and not exists(select 1 from auth.users where id = requester and email_confirmed_at is not null) then raise exception 'Confirmed representative required' using errcode = '42501'; end if;
  result := public.review_mosque_submission(submission_id, approve);
  if approve then
    insert into public.mosque_members(mosque_id, user_id, role) values(result, requester, 'owner');
    update public.mosques set verification_status = 'verified', verified_at = now() where id = result;
    insert into public.mosque_moderator_nominations(mosque_id, slot, name, email)
      select result, ordinality::smallint, trim(n->>'name'), lower(n->>'email') from jsonb_array_elements(registration.moderators) with ordinality as nominees(n, ordinality);
  end if;
  return result;
end;
$$;

create function public.pending_moderator_nominations() returns table(id uuid, mosque_name text)
language sql stable security definer set search_path = '' as $$
  select n.id, m.name from public.mosque_moderator_nominations n join public.mosques m on m.id = n.mosque_id
  where n.accepted_by is null and m.verification_status <> 'rejected' and n.email = (select lower(u.email) from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null);
$$;
create function public.accept_moderator_nomination(nomination_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare nomination public.mosque_moderator_nominations%rowtype; confirmed_email text;
begin
  select lower(email) into confirmed_email from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if auth.uid() is null or confirmed_email is null then raise exception 'Confirmed sign-in required' using errcode = '42501'; end if;
  select * into nomination from public.mosque_moderator_nominations where id = nomination_id for update;
  if not found or nomination.email <> confirmed_email or nomination.accepted_by is not null then raise exception 'Nomination unavailable' using errcode = '42501'; end if;
  perform 1 from public.mosques where id = nomination.mosque_id and verification_status <> 'rejected' for update;
  if not found then raise exception 'Mosque unavailable' using errcode = '42501'; end if;
  if (select count(*) from public.mosque_members where mosque_id = nomination.mosque_id and role = 'moderator' and status = 'active') >= 2 then raise exception 'Two moderator limit' using errcode = '23514'; end if;
  -- An existing stronger membership is never downgraded by accepting a nomination.
  insert into public.mosque_members(mosque_id, user_id, role) values(nomination.mosque_id, auth.uid(), 'moderator') on conflict(mosque_id,user_id) do nothing;
  update public.mosque_moderator_nominations set accepted_by = auth.uid(), accepted_at = now() where id = nomination_id;
end;
$$;

create function public.can_edit_timetable(target_mosque uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_manage_mosque(target_mosque) or exists(select 1 from public.mosque_members where mosque_id = target_mosque and user_id = auth.uid() and status = 'active' and role = 'moderator');
$$;
create policy moderator_schedule_read on public.jamaat_schedules for select to authenticated using (public.can_edit_timetable(mosque_id));
revoke all on function public.register_mosque(jsonb,jsonb), public.review_mosque_registration(uuid,boolean), public.pending_moderator_nominations(), public.accept_moderator_nomination(uuid), public.can_edit_timetable(uuid) from public, anon, authenticated;
grant execute on function public.register_mosque(jsonb,jsonb), public.review_mosque_registration(uuid,boolean), public.pending_moderator_nominations(), public.accept_moderator_nomination(uuid), public.can_edit_timetable(uuid) to authenticated;

create or replace function public.save_schedule_draft(
  target_mosque uuid, effective_start date, effective_end date,
  entries jsonb, friday_sessions jsonb default '[]'::jsonb,
  overrides jsonb default '[]'::jsonb,
  draft_id uuid default null, expected_revision integer default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  saved_id uuid;
  current_draft public.jamaat_schedules%rowtype;
begin
  if auth.uid() is null or not public.can_edit_timetable(target_mosque) then
    raise exception 'Active mosque membership required' using errcode = '42501';
  end if;
  if effective_start is null or effective_end is null or effective_end < effective_start then
    raise exception 'Invalid effective period' using errcode = '22023';
  end if;
  if entries is null or jsonb_typeof(entries) <> 'array' or friday_sessions is null or jsonb_typeof(friday_sessions) <> 'array' or overrides is null or jsonb_typeof(overrides) <> 'array' then
    raise exception 'Schedule data must be arrays' using errcode = '22023';
  end if;
  if jsonb_array_length(entries) <> 5 or jsonb_array_length(friday_sessions) > 10 or jsonb_array_length(overrides) > 500 then
    raise exception 'Provide five prayers, at most ten Friday sessions and 500 overrides' using errcode = '22023';
  end if;
  if exists(select 1 from jsonb_array_elements(entries || friday_sessions || overrides) e where e->>'localTime' is null or e->>'localTime' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') then
    raise exception 'Times must use HH:mm' using errcode = '22023';
  end if;
  if exists(select 1 from jsonb_array_elements(overrides) o where o->>'localDate' is null or o->>'localDate' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or (o->>'localDate')::date not between effective_start and effective_end) then
    raise exception 'Override dates must fall within the effective period' using errcode = '22023';
  end if;
  if not public.can_manage_mosque(target_mosque) then
    -- Moderators may only alter daily entries in an existing effective period.
    -- Friday sessions, overrides and period boundaries must remain identical.
    select * into current_draft from public.jamaat_schedules
      where mosque_id = target_mosque and effective_from = effective_start and effective_to = effective_end
      and ((draft_id is not null and id = draft_id and status = 'draft') or (draft_id is null and status = 'published'))
      for update;
    if not found then raise exception 'Owner must create the effective period' using errcode = '42501'; end if;
    if friday_sessions <> coalesce((select jsonb_agg(jsonb_build_object('position', position, 'localTime', to_char(local_time, 'HH24:MI'), 'label', label) order by position) from public.jumuah_sessions where schedule_id = current_draft.id), '[]'::jsonb)
      or overrides <> coalesce((select jsonb_agg(jsonb_build_object('prayer', prayer, 'localDate', local_date::text, 'localTime', to_char(local_time, 'HH24:MI')) order by local_date, prayer) from public.schedule_overrides where schedule_id = current_draft.id), '[]'::jsonb)
      then raise exception 'Moderators may edit daily times only' using errcode = '42501'; end if;
  end if;
  if draft_id is null then
    insert into public.jamaat_schedules(mosque_id, effective_from, effective_to, created_by)
    values(target_mosque, effective_start, effective_end, auth.uid()) returning id into saved_id;
  else
    select * into current_draft from public.jamaat_schedules where id = draft_id for update;
    if not found or current_draft.mosque_id <> target_mosque or current_draft.status <> 'draft' then
      raise exception 'Editable draft not found' using errcode = '22023';
    end if;
    if expected_revision is null or current_draft.revision <> expected_revision then
      raise exception 'Draft changed; reload before saving' using errcode = '40001';
    end if;
    saved_id := draft_id;
    update public.jamaat_schedules set effective_from = effective_start, effective_to = effective_end, revision = revision + 1, updated_at = now() where id = saved_id;
    delete from public.jamaat_schedule_entries where schedule_id = saved_id;
    delete from public.jumuah_sessions where schedule_id = saved_id;
    delete from public.schedule_overrides where schedule_id = saved_id;
  end if;
  insert into public.jamaat_schedule_entries(schedule_id, prayer, local_time)
    select saved_id, e->>'prayer', (e->>'localTime')::time from jsonb_array_elements(entries) e;
  insert into public.jumuah_sessions(schedule_id, position, local_time, label)
    select saved_id, (j->>'position')::integer, (j->>'localTime')::time, j->>'label' from jsonb_array_elements(friday_sessions) j;
  insert into public.schedule_overrides(schedule_id, local_date, prayer, local_time)
    select saved_id, (o->>'localDate')::date, o->>'prayer', (o->>'localTime')::time from jsonb_array_elements(overrides) o;
  return saved_id;
end;
$$;



-- 202609090006_registration_classification.sql
-- Representative-supplied classification remains private with the registration.
-- Never infer a mosque's school of thought from its name or location.
alter table public.mosque_registrations
  add column sect text not null default 'Not specified'
    check (sect in ('Hanafi', 'Jafari', 'Shafi‘i', 'Maliki', 'Hanbali', 'Ahl-e-Hadith', 'Other', 'Not specified')),
  add column sub_sect text not null default '' check (length(sub_sect) <= 120);

create or replace function public.register_mosque(payload jsonb, representative jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid; nominees jsonb; owner_email text;
begin
  select lower(email) into owner_email from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if auth.uid() is null or owner_email is null then raise exception 'Confirmed sign-in required' using errcode = '42501'; end if;
  if representative is null or jsonb_typeof(representative) <> 'object' then raise exception 'Representative details required' using errcode = '22023'; end if;
  nominees := coalesce(representative->'moderators', '[]'::jsonb);
  if jsonb_typeof(nominees) <> 'array' then raise exception 'Invalid moderators' using errcode = '22023'; end if;
  if jsonb_array_length(nominees) > 2 or exists(select 1 from jsonb_array_elements(nominees) n where n->>'name' is null or length(trim(n->>'name')) not between 2 and 120 or n->>'email' is null or length(n->>'email') > 254 or n->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or lower(n->>'email') = owner_email)
    or (select count(distinct lower(n->>'email')) from jsonb_array_elements(nominees) n) <> jsonb_array_length(nominees) then raise exception 'Provide up to two distinct moderators other than yourself' using errcode = '22023'; end if;
  result := public.submit_mosque(payload);
  insert into public.mosque_registrations(submission_id, representative_name, representative_role, representative_contact, authority, moderators, sect, sub_sect)
  values(result, trim(representative->>'representativeName'), trim(representative->>'representativeRole'), trim(representative->>'representativeContact'), trim(representative->>'authority'), nominees, coalesce(representative->>'sect', 'Not specified'), coalesce(trim(representative->>'subSect'), ''));
  return result;
end;
$$;



-- 202609160007_ongoing_schedules.sql
-- A NULL end date means the timetable stays active until replaced.
-- Preserve existing dated schedules; convert only when a new ongoing version is published.
alter table public.jamaat_schedules alter column effective_to drop not null;

create or replace function public.save_schedule_draft(
  target_mosque uuid, effective_start date, effective_end date,
  entries jsonb, friday_sessions jsonb default '[]'::jsonb,
  overrides jsonb default '[]'::jsonb,
  draft_id uuid default null, expected_revision integer default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  saved_id uuid;
  current_draft public.jamaat_schedules%rowtype;
begin
  if auth.uid() is null or not public.can_edit_timetable(target_mosque) then
    raise exception 'Active mosque membership required' using errcode = '42501';
  end if;
  if effective_start is null or (effective_end is not null and effective_end < effective_start) then
    raise exception 'Invalid effective period' using errcode = '22023';
  end if;
  if entries is null or jsonb_typeof(entries) <> 'array' or friday_sessions is null or jsonb_typeof(friday_sessions) <> 'array' or overrides is null or jsonb_typeof(overrides) <> 'array' then
    raise exception 'Schedule data must be arrays' using errcode = '22023';
  end if;
  if jsonb_array_length(entries) <> 5 or jsonb_array_length(friday_sessions) > 10 or jsonb_array_length(overrides) > 500 then
    raise exception 'Provide five prayers, at most ten Friday sessions and 500 overrides' using errcode = '22023';
  end if;
  if exists(select 1 from jsonb_array_elements(entries || friday_sessions || overrides) e where e->>'localTime' is null or e->>'localTime' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') then
    raise exception 'Times must use HH:mm' using errcode = '22023';
  end if;
  if exists(select 1 from jsonb_array_elements(overrides) o where o->>'localDate' is null or o->>'localDate' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or ((o->>'localDate')::date < effective_start or (effective_end is not null and (o->>'localDate')::date > effective_end))) then
    raise exception 'Override dates must fall within the effective period' using errcode = '22023';
  end if;
  if not public.can_manage_mosque(target_mosque) then
    -- Moderators may only alter daily entries in an existing effective period.
    -- Friday sessions, overrides and period boundaries must remain identical.
    select * into current_draft from public.jamaat_schedules
      where mosque_id = target_mosque and effective_from = effective_start and effective_to is not distinct from effective_end
      and ((draft_id is not null and id = draft_id and status = 'draft') or (draft_id is null and status = 'published'))
      for update;
    if not found then raise exception 'Owner must create the effective period' using errcode = '42501'; end if;
    if friday_sessions <> coalesce((select jsonb_agg(jsonb_build_object('position', position, 'localTime', to_char(local_time, 'HH24:MI'), 'label', label) order by position) from public.jumuah_sessions where schedule_id = current_draft.id), '[]'::jsonb)
      or overrides <> coalesce((select jsonb_agg(jsonb_build_object('prayer', prayer, 'localDate', local_date::text, 'localTime', to_char(local_time, 'HH24:MI')) order by local_date, prayer) from public.schedule_overrides where schedule_id = current_draft.id), '[]'::jsonb)
      then raise exception 'Moderators may edit daily times only' using errcode = '42501'; end if;
  end if;
  if draft_id is null then
    insert into public.jamaat_schedules(mosque_id, effective_from, effective_to, created_by)
    values(target_mosque, effective_start, effective_end, auth.uid()) returning id into saved_id;
  else
    select * into current_draft from public.jamaat_schedules where id = draft_id for update;
    if not found or current_draft.mosque_id <> target_mosque or current_draft.status <> 'draft' then
      raise exception 'Editable draft not found' using errcode = '22023';
    end if;
    if expected_revision is null or current_draft.revision <> expected_revision then
      raise exception 'Draft changed; reload before saving' using errcode = '40001';
    end if;
    saved_id := draft_id;
    update public.jamaat_schedules set effective_from = effective_start, effective_to = effective_end, revision = revision + 1, updated_at = now() where id = saved_id;
    delete from public.jamaat_schedule_entries where schedule_id = saved_id;
    delete from public.jumuah_sessions where schedule_id = saved_id;
    delete from public.schedule_overrides where schedule_id = saved_id;
  end if;
  insert into public.jamaat_schedule_entries(schedule_id, prayer, local_time)
    select saved_id, e->>'prayer', (e->>'localTime')::time from jsonb_array_elements(entries) e;
  insert into public.jumuah_sessions(schedule_id, position, local_time, label)
    select saved_id, (j->>'position')::integer, (j->>'localTime')::time, j->>'label' from jsonb_array_elements(friday_sessions) j;
  insert into public.schedule_overrides(schedule_id, local_date, prayer, local_time)
    select saved_id, (o->>'localDate')::date, o->>'prayer', (o->>'localTime')::time from jsonb_array_elements(overrides) o;
  return saved_id;
end;
$$;

-- Private transactional publisher shared by the authenticated RPC and operator SQL.
-- No app role can invoke this helper directly.
create function public.publish_schedule_bundle(target_schedule uuid, expected_revision integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  draft public.jamaat_schedules%rowtype;
  prior public.jamaat_schedules%rowtype;
  target_mosque uuid;
  snapshots jsonb := '[]'::jsonb;
  previous_snapshot jsonb;
begin
  select mosque_id into target_mosque from public.jamaat_schedules where id = target_schedule;
  if not found then raise exception 'Schedule not found' using errcode = '22023'; end if;
  perform 1 from public.mosques where id = target_mosque for update;
  select * into draft from public.jamaat_schedules where id = target_schedule for update;
  if not found or draft.status <> 'draft' or expected_revision is null or draft.revision <> expected_revision then
    raise exception 'Draft changed; reload before publishing' using errcode = '40001';
  end if;
  if (select count(*) from public.jamaat_schedule_entries where schedule_id = target_schedule) <> 5 then
    raise exception 'All five prayer times are required' using errcode = '22023';
  end if;
  if exists(select 1 from public.schedule_overrides where schedule_id = target_schedule
    and (local_date < draft.effective_from or (draft.effective_to is not null and local_date > draft.effective_to))) then
    raise exception 'Override outside effective period' using errcode = '22023';
  end if;
  -- A new ongoing timetable replaces all overlapping publications, including
  -- previously planned periods. Legacy bounded publications retain exact-period replacement.
  for prior in select * from public.jamaat_schedules
    where mosque_id = target_mosque and status = 'published'
      and ((draft.effective_to is null and daterange(effective_from, effective_to, '[]') && daterange(draft.effective_from, null, '[]'))
        or (effective_from = draft.effective_from and effective_to = draft.effective_to))
    order by effective_from, id for update
  loop
    snapshots := snapshots || jsonb_build_array(public.schedule_snapshot(prior.id));
    update public.jamaat_schedules set status = 'archived', updated_at = now() where id = prior.id;
  end loop;
  previous_snapshot := case jsonb_array_length(snapshots) when 0 then null when 1 then snapshots->0 else snapshots end;
  update public.jamaat_schedules set status = 'published', published_at = clock_timestamp(),
    published_by = auth.uid(), updated_at = now(), revision = revision + 1 where id = target_schedule;
  insert into public.schedule_change_log(mosque_id, schedule_id, changed_by, previous_value, new_value, effective_date, change_type)
    values(target_mosque, target_schedule, auth.uid(), previous_snapshot, public.schedule_snapshot(target_schedule),
      draft.effective_from, case when previous_snapshot is null then 'publish' else 'replace' end);
end;
$$;
revoke all on function public.publish_schedule_bundle(uuid, integer) from public, anon, authenticated;

create or replace function public.publish_schedule(target_schedule uuid, expected_revision integer) returns void
language plpgsql security definer set search_path = '' as $$
declare target_mosque uuid;
begin
  select mosque_id into target_mosque from public.jamaat_schedules where id = target_schedule;
  if not found then raise exception 'Schedule not found' using errcode = '22023'; end if;
  if auth.uid() is null or not public.can_manage_mosque(target_mosque) then
    raise exception 'Active mosque membership required' using errcode = '42501';
  end if;
  perform public.publish_schedule_bundle(target_schedule, expected_revision);
end;
$$;



-- 202609190008_device_push.sql
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


commit;
