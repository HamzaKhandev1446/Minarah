# Google Maps provider

Status: integration implemented; live Google verification pending API key.

Google Maps JavaScript API renders the public map when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is configured. Advanced markers display only Minarah-published next Jamaat times. Selection, transient user location and existing accessible mosque list are preserved. API load failures show an explicit message. Without a key the existing attributed OpenStreetMap map remains available; it is not represented as Google.

Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local, enable Maps JavaScript API and billing in the Google Cloud project, restrict the key to localhost and the deployed HTTPS origin, then rebuild/restart. Optionally set NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID; the Google demo map ID supports initial development. The key is intentionally browser-visible; never use a server secret. Production hosting needs the same public variables and a redeployment.

This changes map rendering, not the mosque directory or prayer-time source. Registration place text search still uses the existing Photon service; Google Places search is not enabled or billed by this integration.

Registration maps also switch to Google with click/drag pin selection when configured. Verification: production build, strict TypeScript, targeted lint and 14 schedule tests passed. All six public mobile/desktop browser checks passed using the no-key OpenStreetMap fallback. The local server was rebuilt/restarted on port 3000 and HTTP inspection confirmed both Arabic text and minaret SVG in its response. Google rendering itself remains unverified without a key; no remote deployment occurred.
