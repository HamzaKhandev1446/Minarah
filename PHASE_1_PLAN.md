# Minarah Phase 1 — repository audit and implementation plan

Historical audit and milestone reports. The maintained current status now lives in [specs/STATUS.md](specs/STATUS.md); start with [specs/README.md](specs/README.md) for spec-driven implementation guidance.

## Milestone 1 audit

Inspected September 7, 2026. `D:\Minarah` is empty and is not a Git repository. Hidden-file enumeration and `rg --files --hidden` found no project files. There is no package.json, installed dependency tree, framework, TypeScript/lint configuration, environment file, migration, UI, route, auth implementation, or test suite to inspect or reuse.

Commands: `Get-Location`, `Get-ChildItem -Force`, `rg --files --hidden -g '!node_modules' -g '!.git'`, `git status --short`. Git reported that this is not a repository. No application tests or build could run.

## Proposed architecture

Next.js App Router, React, strict TypeScript, Tailwind, Supabase Auth/PostgreSQL/PostGIS, and a Vercel-compatible PWA. Select compatible stable versions and inspect the installed versions and official APIs at foundation time; no version has been selected or installed yet.

```text
src/app/                    Public pages and layouts
src/app/mosques/[slug]/      Mosque detail
src/app/q/[code]/            QR resolver
src/app/admin/               Authorised mosque management and QR poster
src/app/platform/            Platform review
src/app/auth/                Login and callback
src/app/api/                 Validated public search endpoints
src/components/             Small accessible UI components
src/domain/                 Types, validation, schedule and next-Jamaat logic
src/server/                 Repositories, authorisation and publish transactions
src/lib/supabase/            Browser and server Supabase clients
src/lib/follows/             Anonymous storage adapter
supabase/migrations/        Schema, indexes, functions and RLS
supabase/seed.sql            Synthetic pilot data
tests/                      Domain and integration tests
public/                     Manifest icons and minimal service worker
```

## Proposed database model

- `profiles`: auth user ID and basic display details. Platform privileges live separately in a protected platform-admin table.
- `mosques`: UUID, unique slug, name, structured address, coordinates, IANA timezone, optional contact fields, verification status and timestamps. Generated geography point with GiST index.
- `mosque_members`: mosque/user unique membership with owner/admin/editor role, active status and timestamps.
- `jamaat_schedules`: mosque, effective local start/end dates, draft/published status, revision and publication metadata. Published periods must not overlap.
- `jamaat_schedule_entries`: schedule, prayer and local clock time; unique prayer per schedule.
- `jumuah_sessions`: schedule, ordered session number, local clock time and optional label. Multiple sessions supported.
- `schedule_overrides`: mosque, local date, prayer, replacement time, draft/published state and publication metadata. Enforce unambiguous published overrides.
- `schedule_change_log`: append-only actor, mosque, old/new values, affected prayer/date, change type and timestamp; include Jumu'ah and period changes.
- `mosque_claims`: requester, mosque, contact, role, explanation, pending/review status and reviewer metadata.
- `mosque_submissions`: proposed mosque details, coordinates, optional contacts/notes and review metadata. Approval creates a mosque without granting management access.
- `mosque_qr_codes`: UUID, mosque, unique random URL-safe code, active/disabled status, creator and timestamps.

Use foreign keys, date/time constraints, coordinate bounds, membership uniqueness, and lookup indexes. Validate IANA timezone names. Store clock times as `time without time zone`, effective dates as `date`, and event/publication instants as `timestamptz`.

## Security and authentication

Public browsing and local follows require no account. Use Supabase Auth for administration, server-validated sessions and active membership checks on every write. RLS exposes published schedules publicly, allows authorised draft access, and isolates claims/submissions. Users cannot grant themselves membership, platform roles, or verification. Platform review is protected server-side and in the database.

Publishing runs atomically through a narrowly scoped database function: verify actor and role, validate all entries and periods, detect concurrent revisions, publish, append audit records and update publication timestamps. Harden function search paths and grants; prevent direct writes from bypassing audit and publication rules. No service-role key reaches browser code.

Claims remain pending until manual platform approval. Anonymous submissions require validation and abuse controls; they never directly write trusted mosque records. Bootstrap the first platform administrator through a documented privileged operator step.

## QR architecture

Use cryptographically random, unique URL-safe codes (for example, 12 random bytes encoded as base64url). `/q/[code]` validates format, resolves an active code, and redirects to the current mosque slug with `source=qr_sticker`. Disabled and unknown codes have clear unavailable states. Scanning never follows automatically. Preserve source context without individual scan tracking. Admins can access a locally generated QR image and browser-printable poster using a configured canonical public origin.

## Geospatial strategy

Server-side PostGIS RPC uses `ST_DWithin` on indexed geography and `ST_Distance` to return bounded results sorted nearest first. Default radius is a central configuration value of 5 km with validated upper bounds. Validate coordinates and result limits. Manual name/locality/city search works independently of GPS. Do not persist visitor coordinates or place them in application analytics. Handle all browser geolocation permission and error states.

## Schedule and timezone strategy

One domain resolver selects the applicable published base period, applies published date overrides and includes Friday Jumu'ah sessions. Proposed Friday behavior: configured Jumu'ah sessions replace Dhuhr in the next-congregation sequence; display this clearly. Never invent calculated or unpublished times when data is missing.

Next-Jamaat logic uses the mosque IANA timezone and an injected current instant, resolves today and tomorrow independently, and rolls over to tomorrow's published Fajr. Use a tested timezone library selected during foundation. Establish explicit handling of DST gaps/folds and test it. Missing tomorrow data produces an unavailable state, never a fabricated recurrence. Display freshness without equating age with inaccuracy.

## Exact milestone order

1. Repository audit and proposed architecture (this document); await the brief's required approval.
2. Foundation: scaffold, strict types, design primitives, env example, Supabase migrations/RLS, domain types, synthetic seeds and QR records; verify startup.
3. Public reads: central resolver and next-Jamaat foundation, location, database nearby/manual search, home/detail pages and anonymous follows.
4. QR: stable resolver, invalid/disabled states, source context and print layout; integrate protected admin access in milestone 5.
5. Auth/admin: login, membership enforcement, dashboard, editing, drafts, atomic publishing and audit history.
6. Schedule features: finish effective-period and override editors, multiple Jumu'ah management, timezone/DST coverage. Core resolution already exists for milestone 3.
7. Onboarding: submissions, claims, pending review, platform approval and verification.
8. PWA/polish: installability, icons, minimal offline fallback, responsive/accessibility review, metadata, loading/error/empty states. Avoid caching admin/auth responses or presenting cached schedules as current.
9. Final review: formatter, lint, typecheck, domain/integration tests, production build and security/mobile review.

## Risks and decisions

- No Supabase project, credentials, deployment origin or runtime infrastructure is configured. Local scaffolding can proceed after approval; connected validation requires a local Supabase runtime or project access.
- Synthetic pilot data will be explicitly labelled; proposed pilot is Karachi with at least 10 fictional mosques, differing schedules, freshness, verification, Friday sessions, overrides and QR codes. Architecture remains global.
- RLS and atomic publication need database integration tests, not only mocked unit tests.
- DST, expiry, Friday selection and tomorrow availability need explicit domain tests.
- Dependencies and local Node/package-manager/Docker availability must be verified during foundation.
- No application behavior has been implemented or tested yet.

## Running checklist

- [x] Repository audit
- [x] Architecture proposal (approved September 7, 2026)
- [x] Database schema
- [x] Supabase setup (clients and local configuration; hosted connection pending)
- [x] RLS (embedded PostgreSQL integration tested)
- [x] Seed mosques
- [x] Geolocation (simulated browser success/error checks)
- [x] Nearby mosque query (PostGIS locally tested; hosted connection pending)
- [x] Homepage
- [x] Mosque page
- [x] Next Jamaat
- [x] Follow Mosque
- [x] QR data model
- [ ] QR short route
- [ ] QR admin view
- [ ] QR printable page
- [ ] Authentication
- [ ] Mosque membership
- [ ] Admin dashboard
- [ ] Schedule editing
- [ ] Draft/publish
- [ ] Overrides
- [ ] Multiple Jumu'ah
- [ ] Audit history
- [ ] Mosque submissions
- [ ] Mosque claims
- [ ] Verification
- [ ] PWA
- [ ] Accessibility
- [x] Tests (foundation scope; later milestone coverage remains)
- [x] Production build (foundation preview)

## Milestone 1 report

Implemented: repository audit, architecture proposal and running checklist only.

Files created: `PHASE_1_PLAN.md`. Files modified: none. Database changes: none.

Commands and test results: inspection commands above; no executable project exists.

Known limitations: all application implementation and runtime validation remain pending.

Immediate next step: after approval, verify runtime tooling and scaffold milestone 2, then implement migrations/RLS and synthetic seed infrastructure.

## Milestone 2 report — foundation

Implemented: Next.js 16.3.4 / React 19.2.8, strict TypeScript, Tailwind 4 design primitives and mobile-responsive synthetic preview; Supabase SSR browser/server clients and auth refresh proxy; schema and RLS; atomic draft saving/publication with optimistic revisions and snapshot audit; PostGIS nearby/manual search functions; random QR model and narrow resolver; ten synthetic pilot mosques; centralized schedule resolution, overrides, multiple Friday sessions, next-Jamaat and DST policies; environment example, documentation and automated tests.

Files created:

- Root setup: `package.json`, `package-lock.json`, `.gitignore`, `.nvmrc`, `.env.example`, `tsconfig.json`, `next-env.d.ts`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `vitest.config.ts`, `README.md`.
- Application: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/components/brand.tsx`, `src/components/schedule-card.tsx`.
- Domain: `src/domain/types.ts`, `src/domain/validation.ts`, `src/domain/schedule.ts`, `src/domain/authorization.ts`.
- Infrastructure: `src/lib/config.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/proxy.ts`.
- Data: `src/data/pilot.json`, `src/data/sample.ts`, `scripts/generate-seed.mjs`, `supabase/config.toml`, `supabase/seed.sql`.
- Migrations: `supabase/migrations/202609070001_foundation.sql`, `supabase/migrations/202609070002_schedule_transactions.sql`.
- Tests: `tests/schedule.test.ts`, `tests/database.test.ts`.

Files modified: this audit/checklist. New files were formatted and corrected as part of verification.

Database changes: twelve RLS-protected tables, PostGIS/geography and trigram indexes, timezone/time/date constraints, non-overlapping published-period constraint, narrowly granted read RPCs, transactional save/publish RPCs and publication audit snapshots. Applied to the embedded test database only; no external database changed. Overrides inherit draft/published state from their complete parent schedule revision, avoiding independent publication ambiguity.

Commands run: runtime/dependency inspection with Node/npm, npm install, seed generation, Prettier, ESLint, TypeScript, Vitest, Next production build/start and an HTTP smoke request. Node 22.23.2 was used from npm's cached runtime because the machine default is Node 20.19.5. The original npm 10 install hit an Arborist dependency-resolution bug; npm 11 completed installation. ESLint 10 was incompatible with Next's React plugin, so the tested version is pinned to 9.39.5.

Verification: `npm run check` passed end-to-end: formatting, lint with zero warnings, strict TypeScript, **24 tests in 2 files**, and production build. Production `/` responds HTTP 200 with branding, synthetic-data disclosure, five prayer labels and security headers. Domain and unchanged-migration PostgreSQL/PostGIS integration tests cover schedule selection, overrides, Friday sessions, rollover, DST, authorization, validation, proximity queries, QR statuses, draft visibility, publication/audit, rollback, stale draft edits and private-record visibility.

Known limitations: no Docker or connected Supabase project, so hosted Auth/PostgREST/email and a full Supabase stack remain untested. The browser tool failed to connect with a metadata error, so visual/mobile browser review is not claimed. PWA and full public/admin flows are not part of this foundation preview. ESLint 9 is deprecated upstream but currently required by the installed Next React lint plugin. No secrets or user accounts were created.

Language readiness: user asked about later English/Arabic/German support. Stable domain prayer keys, Unicode database text, mosque-local times and direction-aware CSS preserve that path. Locale dictionaries, language preference/routing, locale-aware formatting and Arabic RTL presentation remain a future milestone, as required by the Phase 1 non-goal. This is documented in README.

Next recommended step: milestone 3 public read experience, wiring validated repository queries to geolocation/manual search, public mosque pages and anonymous follows. Supabase connection details will be needed for live-data verification; synthetic preview must never silently replace a failed production query.

## Milestone 3 report — public reads (September 8, 2026)

Implemented: explicit live/demo discovery, geolocation success/error handling, bounded manual/nearby queries, public mosque detail pages, verification and publication timestamps, mosque-local next Jamaat/countdowns, Friday sessions, transient detail distance, local Follow Mosque/unfollow, persisted followed-list access, periodic/focus refresh, loading/empty/error states and mobile/desktop layout. Demo follows are isolated from live follows. Failed live reads never substitute fictional data.

Files created: `src/domain/discovery.ts`, `src/server/mosques.ts`, `src/server/public-mappers.ts`, `src/lib/discovery-client.ts`, `src/lib/follows/storage.ts`, `src/components/discovery.tsx`, `src/components/mosque-detail.tsx`, `src/components/public-context.tsx`, `src/components/use-clock.ts`, `src/app/api/discovery/route.ts`, `src/app/mosques/[slug]/page.tsx`, `src/app/loading.tsx`, `src/app/error.tsx`, `src/app/not-found.tsx`, `supabase/migrations/202609070003_public_distance.sql`, `tests/discovery.test.ts`, `tests/e2e/public.spec.ts`, `playwright.config.ts`.

Files modified: homepage, root layout, schedule card, global CSS, package/lockfile, ignore/lint configuration, database integration tests, README, this checklist and the current specs/status/architecture documents.

Database changes: one validated security-invoker `mosque_distance` RPC, using PostGIS and existing public-read RLS. All three migrations ran in embedded PostgreSQL/PostGIS. No hosted database was changed.

Commands run: installed `@playwright/test@1.63.0`; Prettier; `npm run check`; `npm run test:e2e` against production builds; production start/restart; HTTP smoke requests. Used the compatible Node 22 runtime. Headless installed Edge provided the Chromium browser after the in-app browser connection failed.

Test results: final formatter, zero-warning lint, TypeScript and production build passed; **35 domain/API/database tests passed**; **16 mobile/desktop browser checks passed**. Browser coverage includes explicit geolocation and errors, search and empty states, navigation, detail distance, follow/reload/unfollow, failed storage, keyboard focus, overflow, updated publication data and visible refresh failures. Mobile/desktop screenshots inspected. Home/demo detail return HTTP 200. Fixed a browser-detected origin/host mismatch in API validation and confirmed the regression in tests.

Known limitations: no Supabase connection, Docker stack, hosted Auth/PostgREST/email or real-device geolocation verification. Live SDK requests are covered at a mocked HTTP boundary, with SQL/RLS separately executed in embedded PostgreSQL. Browser coverage is Chromium mobile emulation/desktop, not Safari or a complete accessibility audit. Add Mosque, claims, admin UI, QR pages and PWA remain later milestones.

Next recommended step: Milestone 4 QR flow. Connect Supabase and apply all migrations for live public-read integration verification. Explore the current credential-free demo at `http://localhost:3000/?mode=demo` and use **Try sample location** or search **Cedar**.
