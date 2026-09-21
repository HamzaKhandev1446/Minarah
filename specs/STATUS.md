# Implementation status

## Maintainability refactor — September 18, 2026

Completed the behavior-preserving structural refactor described in [018](features/018-maintainability-refactor.md). Relocated 23 components into eight feature folders, extracted nearby/favourite card rendering and discovery request state, centralized the six-column timetable model and Arabic live label, added runtime validation at the discovery HTTP boundary, enforced dependency direction with ESLint, and added a non-deploying GitHub quality workflow. Typecheck now generates Next route types before checking a clean checkout.

Baseline before refactoring: 90/92 tests passed. Two stale Block G fixtures still contained Block A's times; corrected those expectations and the moderator's Friday fixture to the supplied Block G schedule without changing SQL or database permissions. Final verification: **106 tests across 15 files passed**, zero-warning whole-repository ESLint passed, source/test formatting passed, route type generation and strict TypeScript passed, and production build passed. A static React-render regression verifies six columns, Friday badge, Arabic live text, mosque link and favourite control. `git diff --check` passed.

No app server was started/restarted, no deployment or hosted database write was performed, and existing staged changes were preserved. Browser visual/interaction verification, hosted auth/publication and real-device PWA checks remain pending. GitHub CI itself has not run remotely. Stylesheet order is unchanged; a visually verified CSS split remains a follow-up, not part of this completed extraction. No usage-threshold detector, cooldown timer or automatic continuation was configured.

Continuation checkpoint: the refactor has no failing local checks. Start any follow-up from feature ownership in `src/features/README.md`, then perform browser regression against the user's running server before changing CSS or extending functionality. Old `src/components` feature imports were updated; shared primitives/context remain there. Do not reset the existing staged work or claim background push is implemented.

September 18 prayer-label correction: replaced literal question marks with Arabic قَدْ قَامَتِ الصَّلَاةُ in the live prayer cell. Friday Dhuhr now has a compact highlighted Jummah badge instead of Today is Jummah. All six columns remain rendered, including the separate last Jumuah entry; Friday Dhuhr uses published Jumuah time. Production build and TypeScript passed. Visual browser verification pending; no server started or restarted.

September 18 permanent Jumuah entry: retained the final Jumuah column on Fridays and made the board's bottom Jumuah section show the current published sessions every day. Friday Dhuhr still displays Jummah times with its Today is Jummah note. Published reference sessions are separate from Friday-only timing eligibility. All 30 schedule/discovery tests passed; browser visual verification pending. No server started or restarted.

September 18 directions refinement: replaced the large labelled directions button with a small pin icon immediately before the mosque name. Kept the coordinate destination, accessible directions label, keyboard focus and 44px touch target. Available distance stays below the name. TypeScript passed; browser visual verification pending. No server started or restarted.

September 18 mosque-header/Friday clarification: Dhuhr remains a visible timetable label, showing published Friday sessions with Today is Jummah on local Fridays. The resolver continues excluding ordinary Dhuhr from Friday countdowns. Removed city/country from the board header; added coordinate-based Get directions beside available distance. Gregorian/Hijri dates share a row and font size; Hijri uses Arabic. All 18 targeted calendar/schedule tests and production build/TypeScript passed. Browser visual verification remains pending. No server started or restarted.

September 18 footer refinement: shared footer now contains only a compact, centered minaret and tagline. Removed Phase 1 and duplicate installation controls; installation remains in the public menu. Production build and TypeScript passed. Browser visual verification pending; no app server started or restarted.

September 18 location search: added Add a new location above the saved-location dialog map, reusing the existing place-search service. Selecting a result opens the name-only save flow with its coordinates; manual map selection remains available on provider failures. Production build/TypeScript and targeted ESLint passed. Live provider and browser interactions remain unverified; no app server started.

September 18 drawer styling: replaced plain menu buttons and nested installation boxes with grouped icon-led rows, descriptive labels, a branded header and consistent expandable settings. Production build (including TypeScript) and targeted zero-warning ESLint passed. No server started or restarted; browser visual and real-device installation checks remain unverified.

September 18 dates: removed raw timezone text from mosque headers and added mosque-local civil Hijri dates beneath Gregorian dates, explicitly labelled estimated. Timezone-boundary unit test and production build passed. No server started or restarted.

September 18 Friday correction: remove Dhuhr from shared resolved entries on local Fridays with published Jumuah sessions, preventing live map markers from selecting Dhuhr. Hide the Dhuhr timetable column/row for that day. All 30 schedule/discovery tests and production build passed. App server left under user control.

September 18 saved-place selection: active coordinates select the matching saved-place card, shown with a deep-green border and light-green background. Selection is also exposed with aria-pressed. Production build and TypeScript passed; no app server was started or restarted.

## Discovery recovery and text-free logo - September 17

The local production process was blocked from Supabase by its network sandbox. Restarted with network access. Live localhost search and nearby POST requests returned HTTP 200 with both Parsa Citi mosques and radiusMeters 800. The served logo contains only the minaret/crescent, with no SVG text. Production build passed. Live Block G still has the older timetable; revised operator SQL remains unexecuted. Block A has no published timetable.

## Ongoing timetables â€” September 16

Implemented the latest instruction: no expiry date in the normal editor, and public freshness labelled Last published. Added migration seven for NULL end dates, compatible public lookup/resolution and a private audited publication helper. Block G operator SQL now starts today in Karachi and continues until changed, with no date placeholders. Existing dated schedules are not silently converted. Full suite passed 83 tests, followed by a final 18-test database run including one additional multi-period replacement case (84 distinct tests). Production build, strict TypeScript and zero-warning lint passed. Hosted migration and publication remain pending. See [ongoing timetables](features/016-ongoing-timetables.md).

## Nearby radius refinement â€” September 16

The public pilot map boundary and live nearby lookup now cap at 0.8 km (800 metres). The map is labelled â€œ0.8 km radiusâ€; manual name/city search remains available beyond the nearby radius. The underlying SQL function retains its broader validated 50 km capability for future configuration, while this appâ€™s server setting enforces the pilot cap.

Verification: full suite passed 85 tests, strict TypeScript, zero-warning lint and the production build passed. Older environment values above 800 metres are safely capped rather than causing the server to fail.

## Nearby timetable list â€” September 16

Nearby results now remain visible as a list beneath the location prompt. Every result shows the mosque name, status/distance, Arabic prayer labels and six Jamaat columns, with a View mosque link and favourite control. The next/active time receives a green or red timing state: ten minutes before through start is nearly starting (green), up to five minutes after is in progress (red), and minutes five through seven are recently started (green). A small `Ù‚ÙŽØ¯Ù’ Ù‚ÙŽØ§Ù…ÙŽØªÙ Ø§Ù„ØµÙŽÙ‘Ù„ÙŽØ§Ø©Ù` label is shown above each timetable. The location button remains available. Targeted discovery tests and production build passed; updated browser coverage is pending.

## Branded mosque map markers â€” September 16

Registered-mosque map markers now show the Minarah minaret icon from the brand mark alongside the next Jamaat time. Provider-place markers and user/location pins remain distinct. Formatting, strict TypeScript, and zero-warning lint passed; the targeted browser run started but did not complete before the local command time limit.

## Block G Jamaat query â€” September 16

Prepared `supabase/publish-parsa-citi-block-g-times.sql` for database-owner execution with the user-supplied Block G daily times and Friday 13:30. The timetable starts today in Karachi and remains active until replaced. The query preserves publication history and audit, and leaves Block A and mosque verification unchanged. Hosted execution is not claimed.

The latest Block G update changes the ongoing timetable to Fajr 05:45, Dhuhr 13:30, Asr 17:30, Maghrib 18:40, Isha 20:30 and Jumuah 13:30. The operator query and ignored intake record are updated; hosted execution remains pending.

All 16 PostgreSQL/PostGIS tests passed, including missing-date rejection, the six exact supplied times, anonymous public reads, repeat publication with archive/audit preservation, overlap rollback and untouched Block A.

## Name-only saved places â€” September 16

Final targeted browser run: all six mobile/desktop cases passed in 34.3 seconds with exit 0. Formatting checks passed. Map styles and directory responses are stubbed in these interaction tests.

Removed the saved-place form from the main screen. The location label now opens a modal with existing saved places, explicit GPS access and a map point picker. Saving asks only for a name; coordinates come from the selected point. Existing device-local records remain readable. Production build, targeted lint and five saved-address/radius unit tests passed. Mobile/desktop map-point save checks passed, including exact coordinate forwarding and Escape dismissal. The local production app was restarted on port 3000. Its live nearby endpoint returns HTTP 200 with no results; a fresh Supabase read still finds neither Parsa Citi slug. Live insertion remains pending execution of `supabase/add-parsa-citi-mosques.sql` by a database operator.

## Live lookup diagnosis and saved addresses â€” September 16

Restarted the updated production build on localhost:3000. Its live nearby API returned HTTP 200 with an empty results array at the Parsa Citi midpoint, confirming the local lookup now reaches the backend. The missing mosque records still require execution of the prepared operator SQL. Production build and five targeted unit tests passed. Four mobile/desktop layout and saved-place browser cases reported passing assertions; runner cleanup remained pending. Their map/discovery responses were stubbed, so these are interaction checks rather than live tile verification.

Network-enabled read-only probes returned HTTP 200 for Supabase Auth, search, nearby, QR and distance. Both requested Parsa Citi slugs are absent, and the 0.8 km pilot nearby query returns an empty array. SQL insertion remains pending privileged database access. The screenshot's failed query is distinct from this successful empty result; it also shows the older Leaflet build. Home/Work/custom saved addresses are now implemented as explicit device-local storage, with nearby selection and removal; no public favourite defaults or invented records were added. See [saved addresses](features/015-saved-addresses.md).

## Pre-commit review â€” September 16

Formatting, zero-warning lint, strict TypeScript, production build and all 75 unit/database tests passed. One formatting issue in the registration browser test was corrected. The current mobile browser run failed waiting for OpenFreeMap to finish loading; network access is restricted in this environment, so a successful live-map release check is not established. Older browser tests still target superseded Following/Leaflet controls and need updating. No commit or push was made during this review. Environment secrets, private Imam intake and generated worker assets are Git-ignored.

## Parsa Citi intake and map radius â€” September 16

Prepared exact Block G/A coordinates in `supabase/add-parsa-citi-mosques.sql`; the Block G address is now first floor. User-supplied Block G times and Imam contact are saved only in ignored local intake, not a public bundle. Privileged database access is still required. Last hosted read found neither requested slug; no live insertion is claimed. The initial viewport now covers a maximum 0.8 km radius around the pilot area or selected location. Fixed the legacy mobile CSS shrinking the logo to 25px. MapLibre worker assets are prepared by predev/prebuild to support v6 with the project's bundler.

## OpenFreeMap â€” September 16

Switched public and registration maps to MapLibre/OpenFreeMap Positron, replacing Google and Leaflet rendering. No map key is required. Shared published-time resolution, favourites and registration search remain unchanged. Verification is tracked in [OpenFreeMap](features/014-openfreemap.md); previous Google setup instructions are superseded.

## Google Maps and logo serving â€” September 16

The Arabic logo existed in source while port 3000 served an older production build. Rebuilding/restarting is required to expose the change. Added a Google Maps JavaScript provider using Advanced Markers and existing published-time resolution. No Google key was configured at inspection; attributed OpenStreetMap remains the fallback. Live Google loading and billing/API authorization remain unverified. See [Google Maps](features/013-google-maps.md).

## Arabic brand â€” September 16

The shared brand now places the Arabic name **منارة** inside the minaret shaft, with a small MINARAH label and brass accents. Public-home logo visibility is restored. Scope and font portability are recorded in [Arabic brand](features/012-arabic-brand.md).

## Nearby and Favourites â€” September 15

The public home now follows the three supplied mobile references: exactly Nearby and Favourites tabs, time-labelled MapLibre markers, deliberate location permission with manual fallback, and device-local favourites. Nearby results are compact mosque cards with an emphasized Next Jamaat block, full Arabic-labelled timetable, Qad Qamatis-Salah label, freshness, favourite control and mosque-page link. Shared live/demo discovery, publication freshness and timezone resolution are reused. Existing admin/registration implementations and earlier workspace edits are preserved; drawer work is deferred. See [public mobile specification](features/011-public-mobile.md).

Production build, strict TypeScript, targeted lint and 28 schedule/discovery tests passed. The mobile map-selection, favourites-persistence and mosque-page interaction test passed with the documented map-tile fallback. No hosted deployment or real mosque records changed. The two Google Maps links and actual published schedules remain user inputs for the data task.

Last updated: 2026-09-16. [PHASE_1_PLAN.md](../PHASE_1_PLAN.md) retains the historical audit and Milestones 1â€“3 reports.

## Map-first registration revision â€” September 9

- Latest instruction supersedes Following-first startup. Map renders immediately; directory results and provider map places have separate marker/card/favourite handling. Provider places have no linked timetable and never display invented prayer times.
- Public registration now starts with place search, GPS, map click/drag or manual coordinates. Confirm the pin before account creation/sign-in, then enter mosque and representative details. Fixed-route auth returns and same-tab pin recovery are implemented.
- Sixth migration stores validated sect/sub-sect in the private registration record and exposes it to platform reviewers. All six migrations executed in local PostgreSQL/PostGIS; invalid sect input was rejected and valid values persisted. Hosted migrations five/six and Gmail-owned Supabase verification remain external dependencies.
- 72 tests in 8 files passed, including real SQL classification validation and callback destination restrictions. All 42 mobile/desktop Chromium browser checks passed, including search/favourites, always-visible maps, registration pin selection, GPS, manual fallback and same-tab recovery without password storage. Lint and formatting passed. Mobile registration screenshot inspected; live tile/search verification and deployment remain in progress. Authenticated hosted form completion is not claimed.
- Production build and strict TypeScript passed. The expanded read-only release audit passed against all six migrations (14/14 database tests). Vercel rejected the old commit author with TEAM_ACCESS_REQUIRED; the tested release was recorded in new commit `60d7dc6` using the verified Gmail author/committer. Earlier history was preserved, no Git push was made, and the new deployment entered its build successfully.
- Google Maps/Places was discussed at the user's request. It is not enabled: a Gmail-owned Google Cloud project, billing and website-restricted API key are still required. Current maps/search use Leaflet/OpenStreetMap and Photon; no Google key or billing account was created or used.

## Following, maps and deployment â€” September 9

- Account correction: Vercel API verified the signed-in identity and the project's sole team owner as `hamzakhan.dev1446@gmail.com`. No work-account Vercel resources were identified, so the Gmail-owned project was preserved. Git's global and repository author email settings were changed to Gmail and verified; existing commit history retains its original author. Tracked-file search found no work-email references. The deployment configuration helper now checks the authenticated email before changing hosted settings. The first deployment is READY; the later deployment is BLOCKED and is not claimed as released. Supabase account ownership remains unverified.

**Public app deployed:** https://minarah-seven.vercel.app. The current user authorized immediate deployment, maps, a Following-first home screen, the supplied LCD-style mosque timetable, and representative registration with up to two limited moderators.

- Home/PWA start opens Following; local open counts rank favourites. Loaded tiles open their timetable immediately without another request. The board uses the shared mosque-timezone resolver, next Jamaat, daily rows, Friday sessions and a labelled decorative mosque background.
- Leaflet 1.9.4/OpenStreetMap map markers use bounded Minarah query results. Google Maps handles directions. Actual production tile loading was verified; no provider POIs or invented times were imported. Tile failure preserves list selection.
- Add/Manage are accessed through Register your mosque. Implemented reviewed representative registration and two confirmed-email moderator nominations. Daily-time-only moderator drafts, rejected publication/QR/structural changes, acceptance privacy and permission fallback are covered by database/unit tests.
- **67 tests in 7 files passed; 34/34 mobile/desktop Chromium browser checks passed.** Formatting, lint, strict TypeScript and production build passed during this work. The first new accessibility run found one muted-text contrast issue; it was corrected and the complete browser run passed. Board screenshots were inspected at mobile and desktop sizes.
- Production HTTP checks returned 200 for home, manifest, service worker, offline fallback, registration entry and backdrop. Live public search returned 200 with zero matches for the diagnostic word 'mosque'; that is not proof that the entire directory is empty. A read-only production browser scenario passed real tile loading, demo timetable selection, local following, secure context and service-worker registration.
- Vercel project was created in the signed-in account and the public Supabase settings/canonical origin were configured. Deployment succeeded through CLI. GitHub auto-deployment connection failed; no Git commit or push was made. Secrets/tooling remain ignored, and deployment excludes .env files, .tools and local artifacts.
- **Still required:** apply the fifth migration to the existing Supabase project. A zero-row table probe returned 404/PGRST205, confirming the new table is absent. Registration forms remain unavailable until that schema is present; legacy manager/review paths retain their existing authorization. No remote migration, new mosque/account, moderator membership or invitation email was created in this work.
- Set the hosted Supabase Auth Site URL/callback allowlist for the production origin. Authenticated hosted owner/moderator acceptance, real camera scanning and physical PWA installation remain pending. The app includes Android and iPhone installation instructions; a local installation QR is at .tools/install-minarah.png. Previous Firefox/WebKit failures have not been reverified by this Chromium run.

## Earlier Phase 1 position

**Phase 1 application workflows are implemented; release verification remains in progress.** The resumed workspace already contained QR, authentication/admin, schedule editing, onboarding/review and PWA implementations. This continuation verified that work, fixed a publication revision race and added missing regression coverage. Scope is recorded in [Milestones 4â€“9](features/004-009-mvp-completion.md).

| Milestone               | State                             | Evidence / remaining work                                                                                                                                                                         |
| ----------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Repository audit     | Complete                          | Architecture accepted in the original session.                                                                                                                                                    |
| 2. Foundation           | Implemented; local checks passed  | Four migrations run in embedded PostgreSQL/PostGIS.                                                                                                                                               |
| 3. Public reads         | Implemented; locally verified     | Discovery, detail, follows and refresh browser coverage; hosted public search/QR RPCs respond successfully.                                                                                       |
| 4. QR flow              | Implemented; partial verification | Stable route, invalid/disabled handling, source context, protected poster and labelled demo preview. Real printed scanning remains pending.                                                       |
| 5. Auth and admin       | Implemented; partial verification | Login/registration/callback/sign-out, membership checks, dashboard, drafts/publication and audit UI exist. Hosted authenticated workflows remain pending.                                         |
| 6. Schedule features    | Implemented; partial verification | Period, Friday session and override editor; domain/database checks cover resolution, DST and publication. Authenticated browser editing remains pending.                                          |
| 7. Onboarding           | Implemented; database verified    | Submission/claim forms and platform review; SQL tests prove approval permissions and membership rules. Hosted form workflows remain pending.                                                      |
| 8. PWA and polish       | Implemented; partial verification | Manifest/icons, install prompt and static-only offline fallback. Mobile/desktop Chromium checks pass for offline behavior; real-device installation and full accessibility review remain pending. |
| 9. Final Phase 1 review | In progress                       | Local checks below; authenticated hosted acceptance and device checks remain.                                                                                                                     |

## Verification in this continuation

- Additional save/publication review on September 8: **53 tests in 5 files passed**, including existing new/existing-draft revision regressions and membership rejection. Repository formatting, zero-warning ESLint, strict TypeScript and production build passed with project-local Node. Browser and hosted authenticated workflows were not rerun in this review. Other workspace edits occurred during verification, so these results describe the files checked at execution time.
- **39 tests in 4 files passed** using project-local Node 24.13.0. Includes unchanged migrations/seed in PGlite PostgreSQL/PostGIS, domain/DST, public transport and admin-action tests.
- Zero-warning ESLint passed. Strict TypeScript and production build passed with all public/admin/onboarding/QR routes generated.
- Final repository formatting check and relative Markdown file-link checks passed. Lint for the final script/test edits and strict TypeScript were rerun successfully. The four-migration setup SQL was regenerated locally; it was not applied remotely.
- Browser run: 20 of 22 checks passed initially. Two existing follow-flow tests had an ambiguous locator after header navigation was added; the selector was scoped to the main page return link. Both targeted reruns passed (2/2), so all 22 checks have passing evidence across those runs.
- New mobile/desktop browser checks verify sample QR navigation, source context, no automatic follow, protected-route redirects, manifest metadata, exact static cache contents and offline fallback without schedules. Mobile poster screenshot inspected; real camera scanning/physical print is not claimed.
- Read-only hosted `search_mosques` and `resolve_qr` probes returned HTTP 200. The search returned zero matches for a diagnostic query; this does not establish that the directory is empty. No remote records or settings were changed.
- The first new onboarding test fixture overlapped an existing empty-location assertion; its coordinates were isolated and the full 39-test run then passed.

## Changes and decisions

- Fixed admin publication race: derive the saved revision from the save RPC contract, never adopt a later editor's revision from a follow-up read. New action regressions verify new/existing drafts and membership rejection.
- Added SQL coverage for pending submission creation, duplicates, unauthorized review, atomic approval, no membership from submission approval, approved-claim membership and stable authorized QR access.
- Added `tests/e2e/mvp.spec.ts` and a read-only `scripts/check-connection.mjs` that prints only status/error codes, never keys or response bodies.
- Existing fourth migration implements onboarding/QR transactions and profile creation. No migration was changed in this continuation.
- Updated specs and setup documentation to reflect implemented workflows and remaining verification accurately.

## Environment and remaining release work

- All environment changes are project-scoped. `.tools/node/node.exe` contains a copy of the existing Node 24 executable and is Git-ignored. No global installation or persistent PATH setting changed. Formatter/linter ignore `.tools`.
- Supabase public URL/key are present in `.env.local`; values were not printed. Basic public connectivity works. This session did not verify applied hosted migration history, Auth/email, admin sessions or review/publication end-to-end.
- Configure the canonical `NEXT_PUBLIC_SITE_URL` and matching Supabase Auth Site URL/callback allowlist before real posters or registration emails. The current file has a site setting; its suitability for public deployment and the hosted Auth allowlist remain unverified.
- Complete the authenticated release scenario: confirmed user, active membership, edit Isha 20:30 to 20:45, publish, public refresh, audit verification and unauthorized rejection. Complete submission/claim/review browser acceptance with authorized test identities.
- Verify QR scanning, printing and installation on real target devices; Safari/Firefox and a full accessibility audit remain pending.
- No personal accounts, passwords, privileged memberships, live mosque records or remote settings were created or changed by this continuation. Git is available in the resumed workspace with existing uncommitted changes; no commit or PR was created.

## September 9 release continuation

- Reviewed the resumed auth recovery, canonical-origin validation, deployment guard, release SQL audit and browser/staging test additions. Fixed browser-channel inheritance: Edge applies only to Chromium projects. Strengthened staging draft privacy verification to require an explicit successful-save message first.
- **54 tests in 5 files passed**, including the read-only release SQL audit and authentication recovery/origin cases. Repository formatting, zero-warning ESLint, strict TypeScript and production build passed using `.tools/node/node.exe` directly. The previously documented external npm path is unavailable in this environment.
- **28 mobile/desktop Chromium browser checks passed**, including automated accessibility checks on five public pages, confirmation recovery, static-only offline cache checks and one-page A4 PDF output.
- Initial Firefox/WebKit attempts failed from inherited `msedge` configuration. After correction, sandbox startup stalled; running outside the sandbox allowed Firefox to launch. Its QR/protected-route checks passed, but the offline navigation test failed: the page showed Information unavailable rather than the offline heading. This remains unresolved; no cached schedule was shown in that failure snapshot.
- Staging configuration guard was verified to reject execution without the staging URL, member/platform credentials and acknowledgement. Those settings are missing; no authenticated hosted test or remote mutation was performed.
- README and feature/architecture notes now document release guards, confirmation recovery, database audit and staging execution. Relative Markdown file-link checks passed for the edited documentation.
- Remaining cross-browser run: **23/26 passed** (Firefox 13/13; WebKit mobile 10/13), with the already-failing offline case excluded from that run. WebKit failures were refresh not displaying the injected 22:15 time, the skip link not receiving Tab focus, and Search remaining disabled in the API-failure scenario. These need diagnosis before cross-browser acceptance can be claimed. WebKit offline was not run. Accessibility, confirmation recovery and print-layout checks passed on both engines; the Firefox poster screenshot was visually inspected.
- Final formatting and `git diff --check` passed. Lint and TypeScript passed again after the test configuration/assertion edits. No application behavior was changed during this continuation.

## Corrected mosque assignment - September 17

User clarified that the revised timetable belongs to Block A. Created publish-parsa-citi-block-a-times.sql and restored Block G SQL to its original times. Checked both scripts target their respective slugs and retain the shared audited publisher. No hosted database writes performed. This supersedes earlier references to revised Block G times.

September 17: Corrected Friday-only Jumuah activation, exact local publication date/time and per-prayer red live label. Timing/schedule tests and production build checked; local server refresh follows verification.

Map prayer status added September 17: shared timing helper and local-Friday filtering drive marker colors and blinking live label. Production build verifies types. No new live database writes.

Home return restoration: saved Home takes priority, otherwise session position and already-authorized fresh GPS. Each entry requests fresh discovery; browser pageshow restoration is handled. Production build/type verification performed; navigation browser checks pending.

Map marker name/time layout: prayer name now appears above time, including the active prayer during live/recent windows. Production build and TypeScript passed; local server restarted.

Installation and notifications: 50x50 cropped logo, visible install/settings workflow and configurable foreground-only alerts implemented. Build passed. Existing public deployment returns HTTP 200; these changes remain local. Background push is NOT implemented or configured; see feature 017.

Full-width public drawer and centered header location implemented. Logo uses natural 25x50 proportions with cropped viewBox, superseding stretched square logo. Production build/typecheck performed; interactive browser verification pending.

September 18 detail presentation: removed generic title and moved back navigation to a white/green card control. Port 3000 confirmed running Minarah; production build verification in progress.

Detail page production build and TypeScript passed. Stopped the local server; port 3000 has no listener. User will start the app; do not automatically start/restart it.

September 18 header location refinement: replaced the text glyph with location-pin and down-chevron SVG icons and removed the redundant “Near” prefix from the displayed place name. The control remains a labelled dialog-opening button. Targeted lint and TypeScript checks passed; the app server was not started.

September 18 saved-location refinement: replaced plain location rows with themed cards and labelled edit/delete icon controls. Editing updates the existing stable record’s name and map point; duplicate names are rejected. Formatting, targeted lint and TypeScript checks passed. The production bundle was rebuilt, but the user-owned server was not restarted.
