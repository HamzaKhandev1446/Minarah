const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!base || !key) throw new Error("Missing public Supabase configuration");
for (const [name, path, body] of [
  [
    "requested_mosques",
    "/rest/v1/mosques?select=id,name,latitude,longitude&slug=in.(parsa-citi-block-g-masjid,parsa-citi-block-a-masjid)",
    null,
  ],
  [
    "near_parsa_citi",
    "/rest/v1/rpc/nearby_mosques",
    {
      lat: 24.87114689030473,
      lng: 67.0243783185695,
      radius_meters: 800,
      result_limit: 20,
    },
  ],
]) {
  const response = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  console.log(
    JSON.stringify({
      check: name,
      status: response.status,
      records: response.ok ? data : undefined,
      errorCode: response.ok ? undefined : data.code,
    }),
  );
}
