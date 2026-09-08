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
