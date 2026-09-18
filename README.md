# Minarah

For spec-driven development, start with [specs/README.md](specs/README.md) and [current milestone status](specs/STATUS.md). AI repository guidance lives in [AGENTS.md](AGENTS.md).

Mosque-published Jamaat information. Phase 1 connects a mosque's published schedule with the people who follow it. Calculated prayer beginning times are never substituted for Jamaat times.

## Current milestone

Local work now uses MapLibre/OpenFreeMap with no map key. Run `npm run dev` or `npm run build` so the matching map worker assets are prepared automatically. The older deployment notes below describe the previous release. See [OpenFreeMap](specs/features/014-openfreemap.md). The two requested Parsa Citi records are prepared in `supabase/add-parsa-citi-mosques.sql`, awaiting privileged SQL execution; no published times are invented.

Use `hamzakhan.dev1446@gmail.com` for project services and deployment. Verify the authenticated account and project ownership before changing hosted resources.

The app is deployed at **[minarah-seven.vercel.app](https://minarah-seven.vercel.app)**. Home and PWA launch open the map, including before any search results exist. Search returns registered mosque markers and separately labelled map-provider places; either can be saved in Following. Registered mosque boards show published times. Map & discover uses Leaflet/OpenStreetMap; directions open Google Maps. See [Following, maps and registration](specs/features/010-following-maps-registration.md).

Register your mosque is the entry to representative registration, existing-mosque claims, directory submissions and management. The fifth migration, `202609090005_registration_moderators.sql`, enables reviewed owner registration and two confirmed moderator nominations. Moderators can save daily-time drafts for an existing period; managers publish. Nominees accept from their signed-in dashboard; no invitation email is sent. Registration opens a location-first flow: search, current location, draggable pin or manual coordinates; confirm location, create an account/sign in, then enter representative and mosque details. The sixth migration stores representative-supplied sect and optional sub-sect privately for review. The map and account steps work before schema setup; final submission remains unavailable until both migrations are connected. Apply these versioned migrations to an existing project; never rerun `setup.sql` there.

To install on Android, open the deployed site in Chrome and choose **Install Minarah**, or **Add to home screen → Install** from the browser menu. On iPhone, open it in Safari, choose **Share → Add to Home Screen**, enable **Open as Web App** when shown, then **Add**. Follow mosques on that phone; follows are stored locally and are not synchronized between devices. See the [Android instructions](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=en-GB) and [iPhone instructions](https://support.apple.com/en-gb/guide/iphone/iphea86e5236/ios).

In Supabase Auth, set Site URL to `https://minarah-seven.vercel.app` and allow both `https://minarah-seven.vercel.app/auth/callback` and `https://minarah-seven.vercel.app/auth/callback?next=/register-mosque`. Vercel has the canonical origin and existing Supabase public settings; the hosted Auth allowlist and authenticated registration/publication acceptance still require verification. Deployment currently uses Vercel CLI; automatic GitHub deployment could not be connected during setup.

Phase 1 workflows are implemented: public discovery/follows, QR resolution and posters, authentication, authorized schedule editing/publication, mosque submissions and claims, platform review, and a minimal PWA offline fallback. See [status](specs/STATUS.md) for verification and remaining release checks. Hosted search and QR connectivity passed; authenticated hosted workflows still require verification.

## Run locally

Use Node **22.12+ (22 LTS)** or Node 24+; `.nvmrc` selects 22. The existing machine's Node 20 is below the dependency requirement. No global runtime changes are required to use a compatible Node installation.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000` for the live directory. To explore without credentials, open `http://localhost:3000/?mode=demo`, choose **Map & discover**, then **Try sample location** or search **Cedar** / **Karachi**. Demo mosque details preserve `?mode=demo`. Demo and live follows use separate storage keys, and live failures never fall back to samples.

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

`npm run check` runs all quality checks. The lockfile pins exact dependency versions. ESLint is pinned to 9.39.5 because the React plugin bundled with Next 16.3.4 fails under ESLint 10 (`context.getFilename` removal). Upgrade the Next lint plugin and ESLint together once compatible; no lint rules were disabled to mask that incompatibility.

## Browser verification

Browser checks run separately with `npm run build` followed by `npm run test:e2e`. Playwright starts a production test server on port 3100 and runs mobile/desktop Chromium checks using installed Microsoft Edge by default. For another environment, install a Playwright Chromium browser and set `PLAYWRIGHT_CHANNEL=chromium`. Geolocation is simulated with fictional pilot coordinates in tests. No real visitor location or login is needed.

## Supabase setup

Apply all seven versioned migrations in order, through `202609160007_ongoing_schedules.sql`, before using the complete application. Timetables now stay active until changed; no end date is required in the editor. Publishing updates Last published while draft saves do not. For the supplied Block G times, run `supabase/publish-parsa-citi-block-g-times.sql` as the database owner after migrations and the mosque location import. `/api/discovery` accepts bounded POST requests so visitor coordinates stay out of URL query strings. Application code does not persist or log those coordinates; configure hosting observability not to capture request bodies containing location data.

Local Supabase requires Docker. Start Docker, then:

```sh
npm run db:start
npm run db:reset
```

The reset command destroys **local development** database data and rebuilds migrations plus fictional seed data. Do not use it against production.

Copy `.env.example` to `.env.local`, then fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the local CLI output or your Supabase project's Connect dialog. Configure the canonical public URL before QR poster generation. Never put service-role/secret keys in public variables. No service-role key is needed by the current application code.

For hosted infrastructure, apply versioned migrations through your normal Supabase migration workflow. **Do not apply `supabase/seed.sql` to production.** Configure auth's Site URL and permitted callback URL for the actual deployment. Read-only hosted public connectivity has passed; hosted authenticated workflows remain unverified.

Synthetic data is defined in `src/data/pilot.json`. After changing it, run `npm run db:seed:generate`, then reset the local database. This creates ten fictional Karachi mosques with varied coordinates, publication ages, times, verification states, one to three Friday sessions, a tomorrow-Isha override, and random QR tokens. Seed periods span the previous, current and following months at seed time. Re-seed local development if those periods expire.

`npm run db:types` can generate database types from a running local Supabase instance for repository integration in the next milestone. Domain types already exist separately from database row shapes.

## Database rules

- Public reads see published schedule bundles only. Overrides and Jumu'ah sessions inherit their parent schedule's visibility.
- Owner, admin and editor members may edit and publish schedules; membership must be active. Verification, member grants and platform roles have no client write grants.
- Clients have no direct schedule-write privileges. `save_schedule_draft` validates and saves a complete bundle atomically. Pass `draft_id` and `expected_revision` when updating a draft.
- `publish_schedule` verifies membership and revision, locks publication per mosque, archives an existing matching period, publishes the new bundle and records old/new snapshots in one transaction.
- An exact effective period can be replaced. A different overlapping period fails and rolls back. Published revisions are immutable through application APIs. Future editors should guide administrators to use exact-period replacement or non-overlapping new periods.
- Profiles, claims, submissions and platform-role tables use RLS. Validated RPCs accept pending submissions/claims; platform-only review RPCs grant membership only for approved claims. Public submissions have a bounded hourly queue and duplicate gate; authenticated claims have a daily limit.
- QR tokens are UUID-derived 22-character URL-safe random values. Anonymous users can only call the narrow `resolve_qr` function, not list tokens or creator IDs. Resolving codes does not mutate follows or record personal scan data.
- `nearby_mosques` uses indexed `ST_DWithin` and `ST_Distance`, validates coordinates, limits database calls to 50 km and returns at most 50 rows. The public pilot server caps its nearby radius at 0.8 km and defaults to `NEARBY_RADIUS_METERS=800`. Manual search escapes wildcard input and has a trigram index.

An operator can add a confirmed Supabase Auth user to `platform_admins` through a privileged SQL session. Never derive that role from user-editable metadata. For local admin testing, insert a `mosque_members` record for a confirmed test user and a seeded mosque. The seed deliberately creates no passwords or privileged accounts.

## Time and language architecture

See [release setup](specs/features/004-009-mvp-completion.md#release-setup) for administration routes, project-local tooling and remaining hosted verification.

The domain uses neutral prayer keys (`fajr`, `dhuhr`, etc.), local `HH:mm` clock values, ISO calendar dates and per-mosque IANA timezones. One resolver selects published periods and date overrides. Friday Jumu'ah sessions replace Dhuhr in the next-congregation sequence. Tomorrow's Fajr is resolved separately; an expired schedule never silently repeats.

Temporal's timezone rules handle conversions. For DST folds, use the earlier occurrence; skip nonexistent clock times in DST gaps rather than silently changing a published clock time. UI surfaces for missing times and configuration warnings are part of the public/admin milestones. Tests inject time and cover Karachi, London and New York.

**English, Arabic and German can be added later.** Phase 1 does not implement a full localization system. Stable domain keys and stored times are independent of display language. CSS uses logical spacing and borders, and the document explicitly declares `lang` and `dir`. A later milestone can add translation dictionaries, locale routing/preferences, `Intl` formatting and Arabic RTL presentation. Mosque names and addresses support Unicode; optional mosque-authored translated content should use a separate translation table keyed by mosque and locale, without replacing original names. The current English labels and clock formatter will need that localization work; they are not already multilingual.

## Verification scope

Unit tests cover published schedule selection, overrides, Friday sessions, tomorrow rollover, DST, timezones, validation and authorization decisions. Integration tests run the **unchanged migrations and seed** in PGlite PostgreSQL with PostGIS, using actual `anon` and `authenticated` roles and RLS. The harness supplies only the Supabase `auth.users` table and JWT subject helper.

This validates SQL behavior locally without Docker; it does not test Supabase Auth's HTTP service, email delivery, PostgREST or hosted deployment. Repeat database integration checks against a real local/hosted Supabase stack before release. The PGlite PostGIS extension is experimental and is a test-only dependency.

References used for the setup: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Supabase PostGIS](https://supabase.com/docs/guides/database/extensions/postgis), [PGlite extensions](https://pglite.dev/extensions/).

See `PHASE_1_PLAN.md` for the running milestone checklist and audit.

## Release verification

Set `NEXT_PUBLIC_SITE_URL` explicitly for production builds, including local production previews. Vercel builds (or `MINARAH_RELEASE=1`) require a public HTTPS origin and Supabase public configuration. Auth callbacks ignore request-host and redirect parameters. Failed confirmation links offer a resend action on the login page.

Run `supabase/verify-release.sql` as the database owner for a read-only deployed-object/RLS/grant audit. This audit does not verify Auth configuration or email delivery.

For Firefox and WebKit coverage, install the matching Playwright browsers and run `MINARAH_CROSS_BROWSER=1 npm run test:e2e` (set environment variables using your shell's syntax). Automated accessibility checks cover public discovery, detail, login, submission and sample poster pages; they do not replace manual accessibility or real-device testing.

`npm run test:live` uses the staging variables in `.env.example`. Supply a dedicated staging deployment, two different confirmed accounts, and platform membership for the platform account; set `MINARAH_E2E_STAGING=1`. The test creates a labelled mosque, approves its submission and claim, checks draft privacy, publishes Isha 20:30 then 20:45, checks history/QR and signs out. It leaves these records for inspection; use a disposable staging project. Never target the live mosque directory. Authenticated acceptance remains pending until these prerequisites are configured.
