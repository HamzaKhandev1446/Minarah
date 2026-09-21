# Behavior-preserving maintainability refactor

Status: implemented; final verification recorded in STATUS.

## Locked product baseline

Preserve routes, styling, public Nearby/Favourites navigation, the 800-metre nearby radius, explicit geolocation consent, device-local saved places and favourites, installation and foreground notification settings, live/demo isolation, six prayer entries, Friday-only Jumuah eligibility, Arabic live labels, Hijri dates, directions, and existing authorized administration/registration workflows. No database mutation, dependency upgrade, new background-delivery claim or server startup is part of this refactor.

## Scope

- Group feature components by ownership instead of a single flat directory.
- Separate public-screen presentation from screen orchestration.
- Keep reusable UI and cross-feature context shared; keep business rules framework-independent.
- Enforce import direction with lint rules.
- Validate discovery response payloads before rendering; retain explicit live/demo modes.
- Add a credential-free CI quality workflow and clean-checkout route type generation.
- Document extension points, verification limits, and a resumable checkpoint.

## Acceptance

- Existing domain/database regression suite passes before and after changes.
- TypeScript, lint and production build pass after imports move.
- No route or database contract is changed by file relocation.
- Feature components do not import route implementation; domain modules do not import UI, server, or browser adapters.
- No credentials or local environment contents enter documentation or logs.
- Browser/hosted acceptance is reported separately from static checks. Do not start the user's server.

## Continuation

Read this specification and STATUS before resuming. Preserve staged pre-existing work; do not reset or mass-stage it. Complete each extraction with compilation and test evidence before proceeding to the next architectural change. No reliable session-limit timer or automatic restart has been configured.

Completed: 23 feature components relocated with imports updated, two public card components extracted, request lifecycle isolated into a hook, pure timetable model extracted, Arabic live label shared with the map, import boundaries linted, discovery payload validation added, clean-checkout typecheck and CI configured. No migrations or operator SQL changed. Existing Block G test fixtures corrected to its supplied times rather than Block A's; the database correctly rejected the stale moderator fixture before that correction.

Release follow-up: browser visual/interaction verification against the user's running server, hosted auth/publication smoke checks, and real-device PWA checks. Stylesheet decomposition is deliberately deferred until visual comparison is available; current cascade order and class names are preserved. Background push remains unimplemented as before. CI definition is checked locally but has not run on GitHub.
