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

