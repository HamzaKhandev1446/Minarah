# Implementation status

Last updated: 2026-09-09. [PHASE_1_PLAN.md](../PHASE_1_PLAN.md) retains the historical audit and Milestones 1–3 reports.

## Map-first registration revision — September 9

- Latest instruction supersedes Following-first startup. Map renders immediately; directory results and provider map places have separate marker/card/favourite handling. Provider places have no linked timetable and never display invented prayer times.
- Public registration now starts with place search, GPS, map click/drag or manual coordinates. Confirm the pin before account creation/sign-in, then enter mosque and representative details. Fixed-route auth returns and same-tab pin recovery are implemented.
- Sixth migration stores validated sect/sub-sect in the private registration record and exposes it to platform reviewers. All six migrations executed in local PostgreSQL/PostGIS; invalid sect input was rejected and valid values persisted. Hosted migrations five/six and Gmail-owned Supabase verification remain external dependencies.
- 72 tests in 8 files passed, including real SQL classification validation and callback destination restrictions. All 42 mobile/desktop Chromium browser checks passed, including search/favourites, always-visible maps, registration pin selection, GPS, manual fallback and same-tab recovery without password storage. Lint and formatting passed. Mobile registration screenshot inspected; live tile/search verification and deployment remain in progress. Authenticated hosted form completion is not claimed.

## Following, maps and deployment — September 9

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

**Phase 1 application workflows are implemented; release verification remains in progress.** The resumed workspace already contained QR, authentication/admin, schedule editing, onboarding/review and PWA implementations. This continuation verified that work, fixed a publication revision race and added missing regression coverage. Scope is recorded in [Milestones 4–9](features/004-009-mvp-completion.md).

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
