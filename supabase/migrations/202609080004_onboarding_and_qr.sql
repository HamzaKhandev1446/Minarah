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
