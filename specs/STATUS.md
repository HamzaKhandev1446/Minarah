# Implementation status

Last updated: 2026-09-08. This is the current status record; [PHASE_1_PLAN.md](../PHASE_1_PLAN.md) retains the historical audit and milestone reports.

## Current position

**Milestone 3 public reads are implemented.** Discovery, manual search, mosque details and anonymous follows work in explicit demo mode. The live repository is implemented, but connected Supabase verification remains pending. The next planned milestone is 4: QR flow.

| Milestone               | State                            | Evidence / remaining work                                                                                                                                               |
| ----------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Repository audit     | Complete                         | Empty workspace audited; architecture approved by user.                                                                                                                 |
| 2. Foundation           | Implemented; local checks passed | App scaffold, database/RLS, clients, seeds, shared domain services and database transactions exist. Live Supabase verification remains pending.                         |
| 3. Public reads         | Implemented; local verification  | Location/search UI, detail pages, local follows, countdowns and refresh exist. Demo browser flows and local database checks passed; connected Supabase remains pending. |
| 4. QR flow              | Planned                          | Database token model/resolver exist; web route, admin view and printable poster do not.                                                                                 |
| 5. Auth and admin       | Planned                          | SSR clients, RLS, membership helpers and save/publish RPCs exist; login/dashboard/editor workflows do not.                                                              |
| 6. Schedule features    | Foundation only                  | Period/override/Friday resolution and DST tests exist; management interfaces and full workflow verification remain.                                                     |
| 7. Onboarding           | Planned                          | Claim/submission tables exist; Add Mosque, claim forms and platform review are not available.                                                                           |
| 8. PWA and polish       | Planned                          | Responsive CSS and basic semantic layout exist; installability, service worker and browser accessibility review remain.                                                 |
| 9. Final Phase 1 review | Pending                          | Foundation checks passed, but no full MVP release verification yet.                                                                                                     |

## Last application verification

- `npm run check`: formatting, zero-warning lint, strict TypeScript, **35 tests in 3 files**, and production build passed in the final Milestone 3 run.
- `npm run test:e2e`: **16 checks passed**, covering mobile and desktop discovery, details, follow/reload/unfollow, location success/errors, storage failure, live error isolation, keyboard skip-link focus, overflow and automatic refresh. The initial host-validation defect was fixed; timing-sensitive navigation/hydration assertions were corrected before the complete passing run.
- The rebuilt preview home and sample detail returned HTTP 200 on port 3000. Updated mobile/desktop screenshots were inspected.
- SQL integration: unchanged migrations and seed executed in embedded PostgreSQL/PostGIS; checks include authorization, private drafts, atomic publication/audit/rollback, stale edits, distance search and QR statuses.
- Not verified: hosted Supabase Auth/PostgREST/email, full local Supabase stack, Safari/Firefox, real-device geolocation or admin workflows. Browser geolocation tests use synthetic coordinates.

Repository transport is tested with the actual Supabase JavaScript client and a mocked HTTP boundary. SQL/RLS runs in embedded PostgreSQL/PostGIS. Neither is a substitute for connecting a real Supabase instance before release.

## Environment and constraints

- Use a compatible Node runtime from [README](../README.md); the machine default was Node 20 during the foundation work.
- Supabase has not been connected. Docker was unavailable during foundation verification.
- The in-app browser tool failed to connect. Standalone headless browser checks ran successfully; mobile/desktop screenshots were inspected.
- English only today. Arabic/German extension path is documented; translations are not implemented.
- No real mosques or privileged accounts were created. Sample mosque schedules must not be used for prayer attendance.

## Documentation change — specifications folder

Added the original brief, product requirements, architecture decisions, feature template and planned Milestone 3 acceptance criteria. Root `AGENTS.md` directs future AI work to these specs. This change adds no application feature or database migration. Documentation formatting passed Prettier checks, and all relative Markdown links resolved. Application tests were not rerun for this documentation-only change.

## Next implementation scope

Milestone 4: stable QR web route, invalid/disabled states, source context and printable assets. Connect Supabase and apply all three migrations for live public-read verification. Do not expose admin QR management before the authentication/membership UI milestone.

## Milestone 3 delivery

- Created: `src/server/mosques.ts`, `src/server/public-mappers.ts`, `src/domain/discovery.ts`, `src/lib/discovery-client.ts`, `src/lib/follows/storage.ts`, discovery/detail/context/clock components, public API and mosque routes, loading/error/not-found pages, one distance migration, discovery tests, Playwright configuration and browser tests.
- Modified: homepage, layout, schedule card, CSS, package/lockfile, test configuration ignores, database test setup, README and specs.
- Database: added only `mosque_distance(uuid, double precision, double precision)`, a validated security-invoker function granted to public-read roles. Applied to the embedded test database; no hosted database was changed.
- Behavior: explicit `?mode=demo`; anonymous live reads; transient coordinates; browser-local versioned demo/live follows; one-minute/focus refresh with failures visible; tomorrow and timezone calculations remain centralized.
- Remaining: deployment/database connection and broader accessibility/browser/platform verification. No Add Mosque, admin editor, QR pages or PWA was added in this milestone.
