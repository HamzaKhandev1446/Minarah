// Read-only connectivity checks. Never print keys or database response bodies.
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!base || !key) throw new Error("Supabase public URL/key are required.");
for (const [label, path] of [["auth", "/auth/v1/settings"]]) {
  try {
    const response = await fetch(`${base}${path}`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    console.log(
      JSON.stringify({
        check: label,
        status: response.status,
        emailEnabled: data.external?.email === true,
        confirmationRequired: data.mailer_autoconfirm === false,
        signupDisabled: data.disable_signup === true,
      }),
    );
    if (
      !response.ok ||
      data.external?.email !== true ||
      data.mailer_autoconfirm !== false ||
      data.disable_signup === true
    )
      process.exitCode = 1;
  } catch (error) {
    console.log(
      JSON.stringify({ check: label, error: error.cause?.code ?? error.name }),
    );
    process.exitCode = 1;
  }
}
for (const [name, body, expectedStatus, expectedCode] of [
  [
    "search_mosques",
    { query: "Minarah connectivity check", result_limit: 1 },
    200,
    null,
  ],
  [
    "nearby_mosques",
    { lat: 0, lng: 0, radius_meters: 100, result_limit: 1 },
    200,
    null,
  ],
  [
    "mosque_distance",
    { target_mosque: "00000000-0000-4000-8000-000000000000", lat: 0, lng: 0 },
    200,
    null,
  ],
  ["resolve_qr", { qr_code: "0000000000000000000000" }, 200, null],
  // Null is rejected before any write; this proves the onboarding RPC exists.
  ["submit_mosque", { payload: null }, 400, "22023"],
]) {
  try {
    const response = await fetch(`${base}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    console.log(
      JSON.stringify({
        rpc: name,
        status: response.status,
        code: data?.code ?? null,
        rows: Array.isArray(data) ? data.length : null,
      }),
    );
    if (
      response.status !== expectedStatus ||
      (data?.code ?? null) !== expectedCode
    )
      process.exitCode = 1;
  } catch (error) {
    console.log(
      JSON.stringify({ rpc: name, error: error.cause?.code ?? error.name }),
    );
    process.exitCode = 1;
  }
}
