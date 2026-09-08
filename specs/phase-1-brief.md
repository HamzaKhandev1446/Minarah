# MINARAH — PHASE 1 MVP BUILD BRIEF

You are the senior product engineer and technical architect for **Minarah**.

The repository should now be developed toward a focused Phase 1 MVP.

The product name is:

# Minarah

Minarah connects Muslims with mosque-published Jamaat / Iqamah information.

The long-term platform may later support mosque announcements, events, Eid information, community services, classes, volunteering, giving and other mosque-community features.

Do NOT build those broader features now.

Phase 1 is about establishing the core Minarah loop:

**Mosque publishes Jamaat times → Muslim discovers mosque → Muslim follows mosque → Muslim returns for accurate Jamaat information.**

---

# PHASE 1 PRODUCT GOAL

A Muslim should be able to:

1. Open Minarah on mobile.
2. Allow location access.
3. See nearby mosques.
4. See the next Jamaat at each mosque.
5. Open a mosque page.
6. View today's mosque-published Jamaat schedule.
7. Follow / favourite that mosque.
8. Scan a Minarah QR code at a mosque and quickly follow that mosque.
9. Search manually if location is unavailable.

A mosque administrator should be able to:

1. Sign in.
2. Access an authorised mosque.
3. View the current Jamaat schedule.
4. Edit Jamaat times.
5. Publish changes.
6. Configure multiple Jumu'ah sessions.
7. See when the schedule was last updated.
8. Generate or access the mosque's Minarah QR code.

Phase 1 should prove the core end-to-end workflow.

---

# CORE PRODUCT DIFFERENTIATION

Minarah is NOT merely a prayer-time calculator.

Keep these concepts separate:

## Prayer beginning time

Calculated from astronomical/geographic rules.

Example:

Dhuhr begins:
12:47 PM

## Jamaat / Iqamah time

The actual congregation time selected by the mosque.

Example:

Masjid Al Noor:
Dhuhr Jamaat 1:15 PM

Central Mosque:
Dhuhr Jamaat 1:30 PM

Minarah's primary authoritative data is the mosque-published Jamaat time.

Do not substitute calculated prayer times when the UI claims to show mosque-published Jamaat information.

---

# PHASE 1 TECHNOLOGY DIRECTION

Unless the repository already contains a good compatible architecture, prefer:

- Next.js
- React
- TypeScript
- App Router
- Tailwind CSS
- Supabase
- PostgreSQL
- PostGIS
- Supabase Auth
- Vercel-compatible deployment
- Progressive Web App support

Inspect installed dependency versions before implementing APIs based on assumptions.

Preserve good existing architecture.

---

# MOBILE-FIRST REQUIREMENT

Minarah is primarily a mobile web application.

The public experience should be optimized for:

- one-handed usage
- fast loading
- large tap targets
- immediate visibility of the next Jamaat
- minimal navigation
- home-screen installation

Desktop should remain fully usable.

---

# PHASE 1 PUBLIC USER FLOW

Primary flow:

Open Minarah
→ request location
→ determine coordinates
→ find nearby mosques
→ order by distance
→ show nearest mosque prominently
→ show next Jamaat
→ show nearby mosque list
→ open mosque
→ follow mosque

A user should ideally know the nearest next Jamaat within a few seconds.

---

# HOME SCREEN

The homepage should prioritize:

1. Next Jamaat
2. Jamaat time
3. Mosque name
4. Distance
5. Time remaining
6. Today's full schedule
7. Verification status
8. Last updated information

Example structure:

MINARAH

Near You

Masjid Al Noor
Verified
320 m away

NEXT JAMAAT

ASR
5:15 PM

28 min

Today's Jamaat

Fajr 5:25 AM
Dhuhr 1:15 PM
Asr 5:15 PM
Maghrib 7:04 PM
Isha 8:30 PM

Updated today at 10:14 AM

[Follow Mosque]

Nearby Mosques

Central Mosque
650 m
Next: Asr — 5:30 PM

Masjid Umar
1.2 km
Next: Asr — 5:20 PM

Do not copy this literally if a better UI is possible.

Preserve the information hierarchy.

---

# LOCATION

Use browser geolocation.

Handle:

- permission not requested
- permission granted
- permission denied
- unsupported browser
- timeout
- unavailable position
- no nearby mosques

Explain permission simply:

"Minarah uses your location to find Jamaat times at mosques near you."

Do not persist precise user location by default.

Do not create location history.

If permission is denied, allow manual mosque search.

---

# NEARBY MOSQUE SEARCH

Use a configurable radius.

Initial default:

5 km

Do not hardcode this throughout the codebase.

Use backend/database geospatial queries.

If PostGIS is available, use it.

The server/database should:

receive latitude
receive longitude
find mosques within radius
calculate distance
sort ascending

Do not load all mosques into the browser and calculate global distance client-side.

Add appropriate geospatial indexes.

---

# MOSQUE PAGE

Suggested route:

/mosques/[slug]

Display:

- mosque name
- verification status
- address
- distance if location is available
- next Jamaat
- time remaining
- today's full Jamaat schedule
- Jumu'ah sessions
- last updated / published time
- Follow Mosque action
- directions action if appropriate
- claim/manage mosque action if relevant

---

# FOLLOW MOSQUE

Use the terminology:

**Follow Mosque**

rather than only:

Favourite

The user concept is:

"I follow this mosque for its information."

This also supports Minarah's future product direction.

For anonymous Phase 1 users:

store followed mosque IDs in browser storage.

Do NOT require login just to follow a mosque.

Structure this so account-based syncing can be added later.

Internally, the implementation may still use a "favorites" utility if necessary, but public-facing copy should prefer "Follow".

---

# QR CODE FOLLOW EXPERIENCE

This is part of Phase 1.

Each mosque should have a unique Minarah QR code.

The mosque can place this QR code on:

- mosque notice board
- entrance
- shoe area
- prayer hall board
- printed timetable
- reception area
- community flyer

The sticker/poster should communicate something similar to:

"Get this mosque's latest Jamaat times"

"Scan & follow on Minarah"

Do not automatically create a follow merely because a QR was scanned.

Recommended flow:

scan QR
→ open mosque page
→ show mosque identity clearly
→ prominent "Follow Mosque" action
→ user confirms follow

This avoids accidental follows.

---

# QR URL DESIGN

Do NOT encode a fragile long URL tied permanently to a slug if avoidable.

Prefer a short Minarah QR route conceptually like:

/q/[code]

Example:

https://minarah.app/q/AB7K2P

The code maps to a mosque.

The QR route should:

1. validate code
2. resolve mosque
3. optionally record a scan event/count
4. redirect/open the mosque page
5. preserve QR source context if useful

This allows mosque slugs to change without reprinting physical QR stickers.

---

# QR DATA MODEL

Create a concept similar to:

mosque_qr_codes

Fields may include:

id
mosque_id
code
status
created_by
created_at
updated_at

Possible status:

active
disabled

Code must be:

- unique
- non-sequential if publicly exposed
- reasonably short
- difficult to guess at scale
- URL safe

Avoid exposing sequential database IDs.

---

# QR ANALYTICS — LIGHTWEIGHT ONLY

Do NOT build a full analytics platform.

But allow Minarah to know that a mosque was accessed from a QR code.

At minimum preserve a source concept such as:

source = qr_sticker

A simple scan_count is acceptable for Phase 1.

If individual scan events are implemented, keep them privacy-conscious.

Do not store precise user location or unnecessary personal information with QR scans.

---

# QR ADMIN EXPERIENCE

Mosque administrators should be able to access their mosque's Minarah QR code.

A simple Phase 1 admin action can be:

[View Mosque QR]

Show:

- mosque name
- QR code
- short URL
- basic printable layout

If practical, provide a downloadable/printable QR poster.

Do not block the MVP if polished PDF export would add excessive complexity.

A print-friendly browser page is sufficient for Phase 1.

---

# QR POSTER CONTENT

A printable mosque QR asset should contain:

Minarah branding

Mosque name

QR code

Short supporting message, e.g.:

"Get our latest Jamaat times"

"Scan & follow this mosque on Minarah"

Do not use excessive decorative graphics.

Keep it highly readable when physically printed.

---

# CORE PRAYERS

Support:

- Fajr
- Dhuhr / Zuhr
- Asr
- Maghrib
- Isha
- Jumu'ah

Jumu'ah must support multiple sessions.

Example:

1st — 1:15 PM
2nd — 2:00 PM
3rd — 2:45 PM

Never model Jumu'ah as one fixed field.

---

# GLOBAL-FIRST DATA MODEL

Architecture must not assume:

- one country
- one city
- one timezone
- one sect
- one madhhab
- one language
- one mosque tradition

Every mosque should have:

- latitude
- longitude
- IANA timezone

Examples:

Asia/Karachi
Europe/London
America/New_York

Minarah should remain neutral across Muslim communities.

---

# TIMEZONE RULE

A Jamaat time represents local mosque clock time.

If a mosque schedule contains:

13:15

that means:

1:15 PM in the mosque's timezone.

Next Jamaat calculations must use the mosque timezone, not the user's timezone.

Be careful with:

- UTC conversions
- DST
- midnight rollover
- travellers
- tomorrow's Fajr

---

# CORE DATABASE ENTITIES

Design a normalized schema around:

profiles

mosques

mosque_members

jamaat_schedules

jamaat_schedule_entries if appropriate

jumuah_sessions

schedule_overrides

schedule_change_log

mosque_claims

mosque_submissions

mosque_qr_codes

Improve this model if a cleaner design is possible.

Do not normalize for its own sake.

Choose simplicity and correctness.

---

# MOSQUES

Potential fields:

id
slug
name

address_line
locality
city
region
country_code
postal_code

latitude
longitude

timezone

phone
website

verification_status
verified_at

created_at
updated_at

Verification states:

unverified
pending
verified
rejected

Use appropriate indexes.

---

# MOSQUE MEMBERS

A mosque can have multiple authorised administrators.

Potential fields:

id
mosque_id
user_id
role
status
created_at
updated_at

Roles may include:

owner
admin
editor

Do not architect around only one Imam account.

---

# BASE JAMAAT SCHEDULE

Administrators should NOT need to re-enter all times every day.

Support a schedule applying for an effective period.

Example:

Effective:
September 1 → September 15

Fajr 5:30
Dhuhr 1:15
Asr 5:00
Maghrib 7:05
Isha 8:30

Use an appropriate database model.

---

# DATE OVERRIDES

Example:

Normal Isha:
8:30 PM

September 10:
8:45 PM

Support date-specific prayer overrides.

Public schedule resolution should apply the override automatically.

---

# SCHEDULE RESOLUTION

Create one centralized domain service.

Conceptually:

resolveMosqueSchedule({
mosqueId,
localDate
})

It should:

1. determine applicable published base schedule
2. apply published overrides
3. include applicable Jumu'ah sessions
4. return one resolved schedule

Do not duplicate this logic in UI components.

---

# NEXT JAMAAT

Create a centralized function.

Conceptually:

getNextJamaat({
mosqueTimezone,
now,
resolvedSchedule
})

Return:

prayer
jamaatLocalTime
jamaatInstant
date
timeRemaining

If all Jamaats today have passed:

use tomorrow's Fajr.

Test this carefully.

---

# ADMIN EXPERIENCE

Mosque administration should be extremely simple.

Suggested flow:

Login
→ My Mosques
→ choose mosque
→ schedule
→ edit
→ publish

Example editor:

Fajr
[05:30]

Dhuhr
[13:15]

Asr
[17:00]

Maghrib
[19:05]

Isha
[20:30]

[Save Draft]

[Publish Changes]

Last published:
Today at 10:14 AM

Avoid building a complicated CMS.

---

# DRAFT AND PUBLISHED

Public users must only see published schedule information.

Administrators should be able to edit draft data before publishing.

Publishing must be intentional.

Record change history when published data changes.

---

# CHANGE HISTORY

Create an audit trail for significant schedule updates.

Store conceptually:

mosque
changed_by
prayer
previous_value
new_value
effective_date
change_type
created_at

Never silently overwrite important published schedule data with no history.

---

# AUTHENTICATION

Public browsing:

NO ACCOUNT REQUIRED

Following a mosque:

NO ACCOUNT REQUIRED in Phase 1

Mosque administration:

AUTHENTICATION REQUIRED

Use Supabase Auth unless an appropriate auth architecture already exists.

---

# AUTHORIZATION

All admin writes must be validated server-side.

Check:

- current user
- mosque membership
- membership status
- role
- requested operation

Never rely only on hidden UI elements.

If Supabase is used:

implement appropriate Row Level Security.

Never expose service-role credentials to the client.

---

# MOSQUE CLAIMING

Trust is critical.

Do not let arbitrary users modify mosque schedules.

A user may submit:

Claim this mosque

Collect:

name
contact
role at mosque
explanation
optional supporting details

Claim remains pending until manually approved by a Minarah platform administrator.

Only then should management access be granted.

---

# MISSING MOSQUE SUBMISSION

Public user flow:

Can't find your mosque?
→ Add Mosque

Collect:

mosque name
address
coordinates
optional phone
optional website
optional notes

The mosque should begin as:

unverified/pending

Submission does not automatically grant management access.

---

# FRESHNESS

Show when mosque information was last published.

Examples:

Updated today at 10:14 AM

Updated yesterday

Updated 12 days ago

Do not automatically label older schedules incorrect.

Some mosque schedules remain unchanged for long periods.

---

# PWA

Make Minarah installable.

Include:

name:
Minarah

short_name:
Minarah

display:
standalone

manifest

mobile viewport

icons/placeholders

theme/background configuration

basic service-worker behavior

Do not build complex offline synchronization.

---

# DESIGN DIRECTION

The UI should feel:

- calm
- modern
- trustworthy
- minimal
- global
- welcoming
- respectful

Avoid sect-specific or country-specific visual identity.

Avoid excessive:

- crescents
- mosque domes
- ornate patterns
- decorative calligraphy

Use:

- strong typography
- whitespace
- clean cards
- subtle Minarah identity
- excellent hierarchy

Design for one-handed mobile use.

---

# ACCESSIBILITY

Use:

semantic HTML
labels
keyboard support
focus states
good contrast
accessible buttons
clear heading hierarchy

Do not communicate important information only through color.

---

# SEARCH

Allow manual mosque search even without location.

Phase 1 should support useful basic search by:

- mosque name
- city/locality where feasible

Do not make GPS mandatory.

---

# SEED DATA

Create realistic synthetic seed data for at least 10 mosques around one sample pilot location.

Include differences in:

- distance
- Jamaat times
- verification
- Jumu'ah sessions
- freshness
- at least one date-specific override

Also create QR codes for seeded mosques.

Use synthetic mosque names rather than making claims about real mosque schedules.

---

# TESTING PRIORITIES

Create meaningful tests for:

- schedule resolution
- override behavior
- next Jamaat
- tomorrow Fajr rollover
- mosque timezone handling
- DST where applicable
- distance calculation
- multiple Jumu'ah sessions
- QR code resolution
- disabled/invalid QR behavior
- authorization
- validation

Avoid huge quantities of superficial tests.

---

# PHASE 1 NON-GOALS

Do NOT build:

- Quran
- Qibla compass
- full Athan system
- mosque announcements
- events platform
- community chat
- donations
- payments
- fundraising
- lectures
- matrimonial
- native apps
- AI assistant
- advertising
- complex analytics
- complex push notifications
- full localization system
- Ramadan platform

Keep Phase 1 focused.

---

# MINARAH PHASE 1 SUCCESS SCENARIO

The following workflow must work end-to-end.

## PUBLIC USER

User opens Minarah.

Allows location.

Sees:

Masjid Al Noor
300 m

Next Jamaat:
Dhuhr — 1:15 PM

Central Mosque
650 m

Next Jamaat:
Dhuhr — 1:30 PM

User opens Masjid Al Noor.

Sees the full published schedule.

User taps:

Follow Mosque

The mosque is saved locally.

---

## QR USER

User sees a Minarah sticker inside Masjid Al Noor.

Scans QR.

QR opens:

/q/AB7K2P

Minarah resolves the QR code.

User sees:

Masjid Al Noor

Get this mosque's latest Jamaat times.

[Follow Mosque]

User taps Follow Mosque.

Masjid Al Noor is now followed.

---

## MOSQUE ADMIN

Authorised admin logs in.

Opens:

Masjid Al Noor

Current:

Isha 8:30 PM

Changes to:

Isha 8:45 PM

Publishes.

System:

- validates authorization
- updates published schedule
- records audit history
- updates published timestamp

Public user refreshes mosque page.

Now sees:

Isha 8:45 PM

This is the primary Phase 1 product loop.

---

# DEVELOPMENT ORDER

Work in milestones.

Do not attempt to generate the whole application at once.

## MILESTONE 1 — REPOSITORY AUDIT

First inspect:

- directory structure
- package.json
- dependencies
- Next.js/framework version
- TypeScript configuration
- lint configuration
- environment files
- database files
- current UI
- existing routes
- existing auth
- existing tests
- git status if available

Report:

### Current State

### What Can Be Reused

### Missing Foundation

### Risks

### Proposed Architecture

### Proposed Database Model

### Security / RLS Strategy

### Implementation Order

Do not perform a massive implementation before completing this audit.

---

## MILESTONE 2 — FOUNDATION

Implement:

- core application foundation
- TypeScript
- Tailwind/design primitives
- Supabase setup
- environment example
- migrations
- RLS
- seed infrastructure
- domain types
- sample mosque data
- QR code model

Ensure project runs.

---

## MILESTONE 3 — PUBLIC READ EXPERIENCE

Implement:

- homepage
- location flow
- nearby mosque search
- mosque cards
- mosque page
- full schedule
- next Jamaat
- time remaining
- manual search
- Follow Mosque

---

## MILESTONE 4 — QR FLOW

Implement:

- unique mosque QR codes
- /q/[code] route
- QR resolution
- redirect/open mosque page
- invalid QR state
- disabled QR state
- source context
- QR display in admin
- simple print-friendly QR page/poster

---

## MILESTONE 5 — AUTH + MOSQUE ADMIN

Implement:

- authentication
- protected routes
- membership authorization
- admin dashboard
- schedule editing
- draft
- publish
- audit history

---

## MILESTONE 6 — SCHEDULE FEATURES

Implement:

- effective schedule periods
- date overrides
- multiple Jumu'ah
- centralized resolution
- robust next Jamaat logic

---

## MILESTONE 7 — MOSQUE ONBOARDING

Implement:

- mosque submission
- claim mosque
- pending claims
- simple platform admin review
- verification

---

## MILESTONE 8 — PWA + POLISH

Implement:

- manifest
- installability
- responsive polish
- accessibility
- empty states
- error states
- loading states
- metadata
- print-friendly QR presentation

---

## MILESTONE 9 — FINAL PHASE 1 REVIEW

Run:

- formatter
- lint
- TypeScript checks
- automated tests
- production build

Fix failures.

Review:

- authorization
- RLS
- timezone handling
- geospatial performance
- QR security
- validation
- privacy
- mobile UX
- PWA behavior

---

# ENGINEERING RULES

1. Inspect before editing.
2. Reuse good existing code.
3. Keep TypeScript strict.
4. Use migrations.
5. Never commit secrets.
6. Keep privileged logic server-side.
7. Never weaken authorization for convenience.
8. Centralize domain logic.
9. Avoid giant components.
10. Avoid unnecessary dependencies.
11. Do not invent dependency APIs without checking versions.
12. Run relevant checks after meaningful changes.
13. Do not silently delete working functionality.
14. Document important architecture decisions.
15. Keep Minarah neutral across Muslim communities.

---

# KEEP A RUNNING CHECKLIST

Maintain:

[ ] Repository audit

[ ] Architecture

[ ] Database schema

[ ] Supabase setup

[ ] RLS

[ ] Seed mosques

[ ] Geolocation

[ ] Nearby mosque query

[ ] Homepage

[ ] Mosque page

[ ] Next Jamaat

[ ] Follow Mosque

[ ] QR data model

[ ] QR short route

[ ] QR admin view

[ ] QR printable page

[ ] Authentication

[ ] Mosque membership

[ ] Admin dashboard

[ ] Schedule editing

[ ] Draft/publish

[ ] Overrides

[ ] Multiple Jumu'ah

[ ] Audit history

[ ] Mosque submissions

[ ] Mosque claims

[ ] Verification

[ ] PWA

[ ] Accessibility

[ ] Tests

[ ] Production build

Update this checklist after each milestone.

---

# AFTER EACH MILESTONE REPORT

Tell me:

## Implemented

## Files Created

## Files Modified

## Database Changes

## Commands Run

## Test Results

## Known Limitations

## Next Recommended Step

Do not claim something works if it was not actually implemented or tested where testing is possible.

---

# FIRST ACTION

Start now with:

# MINARAH PHASE 1 — REPOSITORY AUDIT

Do not begin the full build immediately.

Inspect the repository first and return:

1. Current state
2. Existing reusable architecture
3. Missing dependencies/infrastructure
4. Proposed directory structure
5. Proposed database schema
6. QR-code architecture
7. Authentication/authorization strategy
8. Geospatial strategy
9. Timezone/schedule strategy
10. Exact milestone implementation order
11. Major risks or decisions
12. Immediate next implementation step

Once the repository audit is complete, wait for approval before beginning the first major implementation milestone.
