# MVP reliability and usability follow-up

Status: in progress. User authorized starting the six-item improvement list on September 19.

## Sequence

1. Run mobile/desktop regression against an existing app server only. Refresh stale tests to the current accepted UI; diagnose actual failures separately.
2. Improve timetable editing with a preview and deliberate publication confirmation while preserving server authorization, moderator restrictions and revision checks.
3. Distinguish missing schedules, publication freshness and failed refreshes without inventing data or declaring old publications invalid.
4. Add operational failure diagnostics without logging visitor coordinates, request bodies, private claims, tokens or contacts.
5. Background notification delivery requires a deployment decision and secure sender configuration. Foreground notifications remain accurately labelled until delivery is connected and verified.
6. Split large stylesheets only after browser baselines are captured, preserving CSS order and comparing the resulting screens.

## Verification

Use `playwright.existing.config.ts` for an already-running server; it has no webServer command. Browser tests use isolated profiles and synthetic locations/fixtures, never the user's real saved settings. Do not publish to hosted mosques during regression tests. Record local checks and external configuration gaps separately in STATUS.
