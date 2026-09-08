# Milestone 3 — public read experience

Status: implemented, locally verified. Connected Supabase and real-device verification remain pending. Checkboxes below describe implemented acceptance behavior; the evidence table distinguishes local tests from external integration.

Requirements: `DATA-01`, `PUB-01` through `PUB-05`, `SCH-01`, `SCH-02`, `UX-01` from [product requirements](../product.md).

## User outcome

A visitor can find nearby mosques or search manually, see the next mosque-published Jamaat, open a mosque's full schedule and explicitly follow it without an account.

## Existing foundation to reuse

- `src/domain/schedule.ts`: published resolution, date overrides and next-Jamaat calculation.
- `src/domain/validation.ts`: coordinates, bounded queries and schedule validation.
- `supabase/migrations/202609070001_foundation.sql`: nearby/manual search functions and public-read RLS.
- `src/lib/supabase`: existing browser/server clients.
- Existing brand/design primitives and explicitly labelled synthetic fixtures.

Inspect these files before implementation. The current schedule card is a sample-preview component; remove sample-specific assumptions only where a real public data path replaces them.

## Scope

Implement public data repositories, validated nearby/manual search endpoints, homepage discovery, `/mosques/[slug]`, current published schedules, mosque-local next Jamaat/countdown, freshness/verification display and browser-stored Follow Mosque. Make followed mosques accessible when visitors return.

Exclude admin editing, claim/submission forms, QR route/poster, PWA caching and full localization. Links to future features must not imply an unavailable workflow works.

## Acceptance criteria

- [x] **M3-AC01:** Before requesting location, explain its purpose. A visitor can trigger location discovery without creating an account.
- [x] **M3-AC02:** Distinguish not requested, loading, granted, denied, unsupported, timeout and unavailable position states. Offer useful manual search on failure.
- [x] **M3-AC03:** Valid coordinates go to a bounded server/database query. Results respect the configured radius and sort by distance; the nearest mosque is prominent. Visitor coordinates are not persisted or logged by application code.
- [x] **M3-AC04:** Name/city/locality search works without GPS, validates input and provides loading, empty and recoverable error states. No global client-side distance calculation.
- [x] **M3-AC05:** Cards show mosque identity, verification, distance when known and next Jamaat or an explicit unavailable state. No invented times or distances.
- [x] **M3-AC06:** Mosque detail displays identity, address, mosque-local date/time context, today's published schedule, applicable Friday sessions, next Jamaat, remaining time and last publication information. Rejected/unknown mosques have a not-found state.
- [x] **M3-AC07:** Countdown and schedule refresh handle midnight in the mosque timezone. Tomorrow's Fajr is resolved separately. Missing/expired published data stays unavailable; drafts stay private.
- [x] **M3-AC08:** Follow Mosque is an explicit toggle stored by stable mosque ID, survives a reload and requires no login. Unfollowing works; malformed or unavailable storage does not crash the page or falsely claim persistence. Use a storage adapter for future syncing.
- [x] **M3-AC09:** Public pages distinguish synthetic demo content from live information. A failed Supabase request never silently falls back to samples. No credentials are required only for an explicitly labelled demo path.
- [x] **M3-AC10:** Mobile/desktop layouts remain usable with semantic headings, labelled controls, keyboard focus, accessible status messages and large tap targets. Timezone, verification and selection information do not rely on color alone.

## Data and security

Use the public/visitor Supabase role for published reads. Map database rows to domain types in repositories. Validate query inputs and limit responses server-side. Do not leak drafts, member records, audit history, contact submissions or service credentials. Avoid caching responses containing precise location or user auth information.

## Verification plan

- Exercise published-read repositories and rejected/draft filtering against database integration tests.
- Test geolocation state handling, storage failure/reload behavior and midnight refresh where practical.
- Verify manual search and location failure recovery through user-visible browser flows.
- Check nearby sorting/radius, missing schedules and mosque timezone behavior using existing domain/SQL tests plus relevant new boundary tests.
- Run lint, types, relevant tests and production build. Record actual connected Supabase/browser results separately from mocked or embedded tests.

## Implementation record

Implemented in the public repository, API, discovery/detail components and versioned browser follow adapter. See [current status](../STATUS.md) for file groups and command results.

| Acceptance       | Evidence                                                                                                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M3-AC01, M3-AC02 | Browser flows cover explanation, explicit geolocation action, denied/unavailable/timeout/unsupported states and manual recovery. Location success uses fictional coordinates.                                                        |
| M3-AC03          | PostgreSQL/PostGIS tests cover sorting, radius, input bounds and detail distance; browser test confirms coordinates stay out of URLs and browser storage. Hosted PostgREST remains unverified.                                       |
| M3-AC04, M3-AC05 | Browser tests search by name, query sample proximity and display empty/error states; unit tests validate search bounds and demo/live isolation.                                                                                      |
| M3-AC06          | Public detail renders mosque/address, full schedule, configured Friday sessions, publication metadata and next Jamaat; location-to-detail distance checked in browser tests. Rejected rows are filtered by RLS and the live mapper.  |
| M3-AC07          | Domain tests cover midnight, overrides, tomorrow and DST; browser clock tests verify refreshed schedules and visible refresh failures.                                                                                               |
| M3-AC08          | Browser tests follow, reload, return to followed mosques and unfollow; storage failure is reported without a false success. Unit tests cover malformed data and separate live/demo storage.                                          |
| M3-AC09          | Demo is explicitly selected through `?mode=demo`. Unit/browser tests confirm live errors do not produce demo cards.                                                                                                                  |
| M3-AC10          | Mobile/desktop browser flows, overflow assertion and screenshot inspection; semantic headings, labels, focus styles and status messages implemented. This is not a comprehensive accessibility audit or Safari/device certification. |

Database change: `202609070003_public_distance.sql` adds a read-only, RLS-respecting detail-distance RPC. Existing migrations and domain schedule logic are reused.

Decisions: live public reads use a cookie-free anonymous client; demo data never acts as an error fallback; coordinates travel in no-store POST bodies; follows have a 50-mosque browser limit. Details refresh every minute while visible and on focus. See `ARC-09` in [architecture](../architecture.md).
