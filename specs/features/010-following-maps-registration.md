# Following, mosque boards, maps and registration

Status: in progress. Authorized September 9, 2026.

## User outcome

Open Minarah to an always-visible map (latest user instruction replaces the earlier Following-first start), search for mosques and save favourites. In Following, select the most frequently opened mosque and immediately see its published timetable in the LCD-style layout supplied in `D:/Minarah Project.png`. Discover mosques on a map. Install the deployed PWA on a phone. Mosque representatives enter registration and management through Register your mosque.

## Acceptance criteria

- [ ] **M10-AC01:** Map is the initial home/PWA screen and renders without results. Search produces selectable registered mosque markers and separately labelled provider places, each with a deliberate favourite action. Following preserves ranked registered-mosque favourites and separately saved map places. Provider places never acquire invented Jamaat times.
- [x] **M10-AC02:** Selecting a loaded mosque opens its board immediately without awaiting another query. The board uses the shared resolver, mosque-local clock/date, five prayer rows, next Jamaat and Friday sessions. A decorative mosque banner never pretends to be a photograph of that particular mosque. Refresh/error and unavailable behavior remain honest.
- [x] **M10-AC03:** An interactive map displays bounded directory and separately labelled provider search results, supports markers and timetable selection, and has a list alternative. Location stays transient; map failures never generate fake mosques. Tiles retain attribution and use browser HTTP caching without offline downloads.
- [ ] **M10-AC04:** Public navigation exposes Following, map/discovery and Register your mosque. The registration entry opens a map without requiring login. Search/current location/click/drag/manual coordinates set a pin; confirmation precedes account creation or sign-in and the representative form. The selected pin survives same-tab reloads without saving credentials. The form includes mosque name/address/timezone, required sect selection, optional sub-sect and up to two limited moderators, plus access to existing mosque management. Membership remains subject to reviewed authority and server/database enforcement.
- [ ] **M10-AC05:** The production HTTPS deployment has canonical URLs, manifest, icons, service worker and clear Android/iPhone installation guidance. Actual deployment and physical installation are recorded separately.

## Data and security

Browser-local open counts contain stable followed mosque IDs and counts only, capped at 50, isolated for demo/live, with no coordinates or schedules in that ranking storage. Explicitly saved provider places use separate validated local storage (maximum 50). The registration pin is saved in session storage for same-tab recovery; no account credentials are persisted there. Public board snapshots stay in component memory and refresh; no private data caching. Registration and moderator rights require database tests and review before activation.

## Verification

Unit tests cover ranking/storage boundaries. Browser tests cover default Following, immediate board selection, map selection/failure and registration navigation. Domain/database tests continue to cover schedules, privacy and authorization. Run lint, strict types, tests and production build; inspect mobile and desktop layouts. Hosted credentials and phone installation are external dependencies.

## Implementation evidence

- 67 unit/database tests passed; the registration test exercises actual migration SQL, review, two accepted moderators, private drafts and prohibited operations. Membership tests prove fallback occurs only for a missing new RPC and still requires existing manager authorization.
- 34 mobile/desktop Chromium tests passed, including Following order, immediate board selection without a network request, map marker selection with tile failure, navigation, accessibility and the existing public/QR/PWA flows. An earlier production browser run separately verified actual tile loading and the installed service worker; the latest map-first changes need a new deployment check.
- Public HTTPS deployment is available at https://minarah-seven.vercel.app. Canonical Vercel settings are configured. Registration/nomination workflows are implemented but not hosted-verified: the fifth migration is absent remotely. Physical phone installation is a user/device step, so AC04/AC05 remain open for full acceptance.
- Default moderator scope is daily-time drafts only; owners/managers publish. Review creates nominations, not email messages. Each moderator accepts with their own confirmed email. No claim of Google POI coverage or mosque-specific photography is made.
