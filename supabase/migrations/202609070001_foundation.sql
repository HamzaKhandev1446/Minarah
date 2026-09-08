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
