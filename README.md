# Minarah

For spec-driven development, start with [specs/README.md](specs/README.md) and [current milestone status](specs/STATUS.md). AI repository guidance lives in [AGENTS.md](AGENTS.md).

Mosque-published Jamaat information. Phase 1 connects a mosque's published schedule with the people who follow it. Calculated prayer beginning times are never substituted for Jamaat times.

## Current milestone

Milestone 3 public reads are implemented on the foundation: location-based discovery, manual search, mosque detail pages, local follows, next Jamaat/countdowns and published schedule refresh. Live reads use anonymous Supabase queries and require a configured project. Admin screens, QR pages, onboarding and PWA behavior remain later milestones.

## Run locally

Use Node **22.12+ (22 LTS)** or Node 24+; `.nvmrc` selects 22. The existing machine's Node 20 is below the dependency requirement. No global runtime changes are required to use a compatible Node installation.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000` for the live directory. To explore without credentials, open `http://localhost:3000/?mode=demo`, then choose **Try sample location** or search **Cedar** / **Karachi**. Demo mosque details preserve `?mode=demo`. Demo and live follows use separate storage keys, and live failures never fall back to samples.

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

Milestone 3 adds migration `202609070003_public_distance.sql` for a single mosque's distance on its detail page. Apply all three migrations to the connected project before testing live reads. `/api/discovery` accepts bounded POST requests so visitor coordinates stay out of URL query strings. Application code does not persist or log those coordinates; configure hosting observability not to capture request bodies containing location data.

Local Supabase requires Docker. Start Docker, then:

```sh
npm run db:start
npm run db:reset
```

The reset command destroys **local development** database data and rebuilds migrations plus fictional seed data. Do not use it against production.

Copy `.env.example` to `.env.local`, then fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the local CLI output or your Supabase project's Connect dialog. Configure the canonical public URL before QR poster generation. Never put service-role/secret keys in public variables. No service-role key is needed by the current application code.

For hosted infrastructure, apply versioned migrations through your normal Supabase migration workflow. **Do not apply `supabase/seed.sql` to production.** Configure auth's Site URL and permitted callback URL for the actual deployment. No hosted project has been connected or changed by this work.

Synthetic data is defined in `src/data/pilot.json`. After changing it, run `npm run db:seed:generate`, then reset the local database. This creates ten fictional Karachi mosques with varied coordinates, publication ages, times, verification states, one to three Friday sessions, a tomorrow-Isha override, and random QR tokens. Seed periods span the previous, current and following months at seed time. Re-seed local development if those periods expire.

`npm run db:types` can generate database types from a running local Supabase instance for repository integration in the next milestone. Domain types already exist separately from database row shapes.

## Database rules

- Public reads see published schedule bundles only. Overrides and Jumu'ah sessions inherit their parent schedule's visibility.
- Owner, admin and editor members may edit and publish schedules; membership must be active. Verification, member grants and platform roles have no client write grants.
- Clients have no direct schedule-write privileges. `save_schedule_draft` validates and saves a complete bundle atomically. Pass `draft_id` and `expected_revision` when updating a draft.
- `publish_schedule` verifies membership and revision, locks publication per mosque, archives an existing matching period, publishes the new bundle and records old/new snapshots in one transaction.
- An exact effective period can be replaced. A different overlapping period fails and rolls back. Published revisions are immutable through application APIs. Future editors should guide administrators to use exact-period replacement or non-overlapping new periods.
- Profiles, claims, submissions and platform-role tables are provisioned with conservative RLS. Onboarding write/review workflows are intentionally not exposed until that milestone adds validation and abuse controls.
- QR tokens are UUID-derived 22-character URL-safe random values. Anonymous users can only call the narrow `resolve_qr` function, not list tokens or creator IDs. Resolving codes does not mutate follows or record personal scan data.
- `nearby_mosques` uses indexed `ST_DWithin` and `ST_Distance`, validates coordinates, limits radius to 50 km and returns at most 50 rows. The server's default is configured with `NEARBY_RADIUS_METERS` (5000). Manual search escapes wildcard input and has a trigram index.

An operator can add a confirmed Supabase Auth user to `platform_admins` through a privileged SQL session. Never derive that role from user-editable metadata. For local admin testing, insert a `mosque_members` record for a confirmed test user and a seeded mosque. The seed deliberately creates no passwords or privileged accounts.

## Time and language architecture

The domain uses neutral prayer keys (`fajr`, `dhuhr`, etc.), local `HH:mm` clock values, ISO calendar dates and per-mosque IANA timezones. One resolver selects published periods and date overrides. Friday Jumu'ah sessions replace Dhuhr in the next-congregation sequence. Tomorrow's Fajr is resolved separately; an expired schedule never silently repeats.

Temporal's timezone rules handle conversions. For DST folds, use the earlier occurrence; skip nonexistent clock times in DST gaps rather than silently changing a published clock time. UI surfaces for missing times and configuration warnings are part of the public/admin milestones. Tests inject time and cover Karachi, London and New York.

**English, Arabic and German can be added later.** Phase 1 does not implement a full localization system. Stable domain keys and stored times are independent of display language. CSS uses logical spacing and borders, and the document explicitly declares `lang` and `dir`. A later milestone can add translation dictionaries, locale routing/preferences, `Intl` formatting and Arabic RTL presentation. Mosque names and addresses support Unicode; optional mosque-authored translated content should use a separate translation table keyed by mosque and locale, without replacing original names. The current English labels and clock formatter will need that localization work; they are not already multilingual.

## Verification scope

Unit tests cover published schedule selection, overrides, Friday sessions, tomorrow rollover, DST, timezones, validation and authorization decisions. Integration tests run the **unchanged migrations and seed** in PGlite PostgreSQL with PostGIS, using actual `anon` and `authenticated` roles and RLS. The harness supplies only the Supabase `auth.users` table and JWT subject helper.

This validates SQL behavior locally without Docker; it does not test Supabase Auth's HTTP service, email delivery, PostgREST or hosted deployment. Repeat database integration checks against a real local/hosted Supabase stack before release. The PGlite PostGIS extension is experimental and is a test-only dependency.

References used for the setup: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Supabase PostGIS](https://supabase.com/docs/guides/database/extensions/postgis), [PGlite extensions](https://pglite.dev/extensions/).

See `PHASE_1_PLAN.md` for the running milestone checklist and audit.
