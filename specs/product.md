# Phase 1 product requirements

Status: accepted scope from the user-supplied [build brief](phase-1-brief.md).

## Outcome

Mosque publishes Jamaat times → Muslim discovers mosque → Muslim follows mosque → Muslim returns for accurate Jamaat information.

Minarah is mobile-first, neutral across Muslim communities and globally usable. Public browsing and anonymous following require no account.

## Requirements

| ID      | Requirement                                                                                                                                                                                    |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DATA-01 | Jamaat is the mosque-selected congregation time. Never substitute calculated prayer beginning times or fictional data when presenting mosque-published information.                            |
| PUB-01  | Offer browser geolocation with a short explanation. Handle not requested, granted, denied, unsupported, timeout, unavailable position and no nearby results. Manual search remains available.  |
| PUB-02  | Find nearby mosques using bounded backend geospatial queries, configurable 5 km default radius and ascending distance order. Search names and city/locality without GPS.                       |
| PUB-03  | Prioritize next Jamaat, local time, mosque name, distance where available, remaining time, today's schedule, verification and publication freshness.                                           |
| PUB-04  | `/mosques/[slug]` shows identity, address, next Jamaat, full published schedule, multiple Jumu'ah sessions, freshness and an explicit Follow Mosque action.                                    |
| PUB-05  | Persist anonymous followed mosque IDs in browser storage without login. Keep a storage abstraction that can later support account syncing. Do not persist precise visitor location by default. |
| QR-01   | A unique random short code resolves through `/q/[code]` to the current mosque slug. Handle disabled/invalid codes and preserve QR source context. A scan never follows automatically.          |
| QR-02   | Authorized mosque admins can view and print a readable poster containing Minarah branding, mosque identity, QR code, short URL and scan/follow message. Avoid personal scan tracking.          |
| SCH-01  | Support five daily prayers, effective-period published base schedules, date-specific overrides and multiple Jumu'ah sessions. Public reads never include drafts.                               |
| SCH-02  | Centralize schedule resolution and next-Jamaat calculation in the mosque's IANA timezone. Resolve tomorrow's published Fajr separately; handle midnight, DST and missing schedules.            |
| ADM-01  | Authenticate admins with Supabase Auth and enforce active mosque membership and allowed role on every write, server-side and through database permissions/RLS.                                 |
| ADM-02  | Admins can view schedules, save drafts and intentionally publish. Publication validates input, prevents lost edits and records significant changes atomically with publication timestamps.     |
| ONB-01  | A claim records applicant contact, mosque role and explanation. Manual platform approval is required before management access is granted.                                                      |
| ONB-02  | Add Mosque submits a proposed mosque, address, coordinates and optional contact/notes for review. Submission does not grant management access or verification.                                 |
| UX-01   | Provide semantic HTML, labels, keyboard/focus support, readable contrast, large tap targets and responsive mobile/desktop layouts. Include loading, empty and error states.                    |
| PWA-01  | Provide installability, manifest, icons, mobile viewport and minimal service worker behavior. Do not imply cached schedules are current or cache private admin responses.                      |
| QA-01   | Maintain at least ten explicitly synthetic pilot mosques and meaningful domain/database tests; verify formatting, lint, strict types and production build at release.                          |

## Later language support

English is the Phase 1 UI language. Preserve the ability to add Arabic and German through language-neutral domain identifiers, Unicode text and direction-aware layout. Translation dictionaries, locale formatting/routing/preferences and Arabic RTL presentation are future work, not currently delivered features.

## Non-goals

Do not build Quran, Qibla, Athan, announcements, events, chat, donations, payments, fundraising, lectures, matrimonial, native apps, AI assistants, advertising, complex analytics, complex push notifications, a Ramadan platform or a full localization system in Phase 1.

## End-to-end release scenarios

1. A visitor finds nearby mosques, opens one, reads its published schedule and explicitly follows it without an account.
2. A QR scan resolves a stable code, shows the correct mosque and allows an explicit follow.
3. An active authorized admin changes Isha from 20:30 to 20:45, publishes, and a public refresh shows 20:45. The old/new change and publisher are recorded; an unauthorized user cannot perform it.

These are release requirements, not claims about the current foundation preview.
