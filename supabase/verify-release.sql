-- Read-only object/permission audit. Run as the project database owner.
-- This verifies deployed contracts, not Supabase Auth/email configuration.
begin read only;
do $$
declare signature text; table_name text;
begin
  foreach signature in array array[
    'public.resolve_qr(text)',
    'public.mosque_distance(uuid,double precision,double precision)',
    'public.save_schedule_draft(uuid,date,date,jsonb,jsonb,jsonb,uuid,integer)',
    'public.publish_schedule(uuid,integer)',
    'public.publish_schedule_bundle(uuid,integer)',
    'public.ensure_mosque_qr(uuid)',
    'public.submit_mosque(jsonb)',
    'public.submit_mosque_claim(uuid,text,text,text,text,text)',
    'public.review_mosque_claim(uuid,boolean,text)',
    'public.review_mosque_submission(uuid,boolean)',
    'public.register_mosque(jsonb,jsonb)',
    'public.review_mosque_registration(uuid,boolean)',
    'public.can_edit_timetable(uuid)',
    'public.pending_moderator_nominations()',
    'public.accept_moderator_nomination(uuid)'
  ] loop
    if to_regprocedure(signature) is null then raise exception 'Missing required function: %', signature; end if;
  end loop;
  foreach table_name in array array[
    'profiles', 'platform_admins', 'mosques', 'mosque_members',
    'jamaat_schedules', 'jamaat_schedule_entries', 'jumuah_sessions',
    'schedule_overrides', 'schedule_change_log', 'mosque_claims',
    'mosque_submissions', 'mosque_qr_codes', 'mosque_registrations',
    'mosque_moderator_nominations'
  ] loop
    if not exists(select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = table_name and c.relrowsecurity)
      then raise exception 'Missing RLS on %', table_name; end if;
    if has_table_privilege('anon', 'public.' || table_name, 'INSERT,UPDATE,DELETE')
      then raise exception 'Unexpected anonymous write grant on %', table_name; end if;
  end loop;
  if not exists(select 1 from pg_attribute where attrelid = 'public.mosque_submissions'::regclass and attname = 'timezone' and not attisdropped)
    then raise exception 'Missing onboarding timezone column'; end if;
  if (select count(*) from pg_attribute where attrelid = 'public.mosque_registrations'::regclass and attname in ('sect','sub_sect') and not attisdropped) <> 2
    then raise exception 'Missing registration classification columns'; end if;
  if not exists(select 1 from pg_trigger where tgrelid = 'auth.users'::regclass and tgname = 'on_auth_user_created' and tgenabled <> 'D')
    then raise exception 'Missing profile creation trigger'; end if;
  if has_function_privilege('anon', 'public.publish_schedule(uuid,integer)', 'EXECUTE')
    then raise exception 'Anonymous publication must not be granted'; end if;
  if has_function_privilege('anon', 'public.publish_schedule_bundle(uuid,integer)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.publish_schedule_bundle(uuid,integer)', 'EXECUTE')
    then raise exception 'Internal publisher must remain private'; end if;
  if exists(select 1 from pg_attribute where attrelid = 'public.jamaat_schedules'::regclass
    and attname = 'effective_to' and attnotnull and not attisdropped)
    then raise exception 'Ongoing timetable migration is missing'; end if;
end $$;
select 'Required Minarah objects, RLS and anonymous write restrictions verified' as result;
rollback;
