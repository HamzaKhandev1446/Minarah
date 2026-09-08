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
