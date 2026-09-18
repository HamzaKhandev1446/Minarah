begin;

insert into public.mosques
  (slug, name, address_line, locality, city, country_code, latitude, longitude, timezone, verification_status, is_synthetic)
values
  ('parsa-citi-block-g-masjid', 'Parsa Citi Block G Masjid', 'Parsa Citi Block G, 1st floor', 'Parsa Citi', 'Karachi', 'PK', 24.870630810049292, 67.02463726936347, 'Asia/Karachi', 'unverified', false),
  ('parsa-citi-block-a-masjid', 'Parsa Citi Block A Masjid', 'Parsa Citi, Block A', 'Parsa Citi', 'Karachi', 'PK', 24.871662970560166, 67.02411936777554, 'Asia/Karachi', 'unverified', false)
on conflict (slug) do nothing;

update public.mosques set address_line = 'Parsa Citi Block G, 1st floor'
where slug = 'parsa-citi-block-g-masjid';

select id, name, latitude, longitude, verification_status
from public.mosques
where slug in ('parsa-citi-block-g-masjid', 'parsa-citi-block-a-masjid');

commit;
