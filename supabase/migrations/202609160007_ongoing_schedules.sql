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

