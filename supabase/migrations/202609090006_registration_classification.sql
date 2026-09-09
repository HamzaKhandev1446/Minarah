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

