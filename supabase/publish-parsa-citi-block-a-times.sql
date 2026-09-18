-- Run as postgres in Supabase SQL Editor after migration
-- 202609160007_ongoing_schedules.sql (and all earlier migrations).
-- No dates to fill in. Times start today in Karachi and stay until replaced.
-- Publishes only Block A; does not verify the mosque or change Block G.
begin;

do $$
declare
  mosque_id_value uuid;
  schedule_id_value uuid;
begin
  select id into mosque_id_value from public.mosques
  where slug = 'parsa-citi-block-a-masjid' and timezone = 'Asia/Karachi'
    and verification_status <> 'rejected' and not is_synthetic
  for update;
  if not found then
    raise exception 'Block A mosque is missing or unavailable; run its location import first';
  end if;

  insert into public.jamaat_schedules (mosque_id, effective_from, effective_to, status)
  values (mosque_id_value, (now() at time zone 'Asia/Karachi')::date, null, 'draft')
  returning id into schedule_id_value;

  insert into public.jamaat_schedule_entries (schedule_id, prayer, local_time)
  values
    (schedule_id_value, 'fajr',    time '05:45'),
    (schedule_id_value, 'dhuhr',   time '13:30'),
    (schedule_id_value, 'asr',     time '17:30'),
    (schedule_id_value, 'maghrib', time '18:40'),
    (schedule_id_value, 'isha',    time '20:30');

  insert into public.jumuah_sessions (schedule_id, position, local_time, label)
  values (schedule_id_value, 1, time '13:30', 'Jumuah');

  -- The shared publisher archives replaced versions and preserves the audit.
  perform public.publish_schedule_bundle(schedule_id_value, 1);
end;
$$;

commit;

select m.name, s.published_at as last_published, e.prayer, e.local_time
from public.mosques m
join public.jamaat_schedules s on s.mosque_id = m.id
join public.jamaat_schedule_entries e on e.schedule_id = s.id
where m.slug = 'parsa-citi-block-a-masjid' and s.status = 'published'
order by e.local_time;
