# Timetables stay active until changed

Status: implemented; locally verified. User instruction September 16, 2026 supersedes mandatory effective-period entry.

Mosque-published Jamaat times stay active until replaced. The editor asks for times, not start/end dates. Every successful publication sets the server-owned `published_at` timestamp; saving a draft does not change public times or freshness. Public cards say “Last published”; details show the exact timestamp in the mosque timezone.

Internally `effective_from` remains for compatibility and timezone/date resolution, while a NULL `effective_to` represents no expiry. Existing dated publications are preserved on migration and remain subject to their original dates until explicitly replaced. Owner/editor publication of an ongoing timetable archives all overlapping published versions, including planned future periods, and records their complete snapshots in the audit. The editor states this replacement behavior. Older bounded RPC clients retain exact-period replacement and exclusion-constraint protection.

Moderators can still edit only daily times in an existing timetable and cannot publish or change Friday sessions, overrides or date boundaries. Draft revision checks and database authorization remain enforced. A private shared publisher supports authenticated publication and explicit database-owner pilot SQL without adding app privileges or manufacturing an Auth identity.

## Acceptance and verification

- Ongoing publications resolve today, tomorrow and years later; archived/draft versions never become current.
- Bounded legacy schedules still expire, and a pre-start ongoing timetable does not appear early.
- Anonymous repository queries include NULL end dates and map them correctly.
- Draft save preserves the current publication timestamp; only successful publication refreshes it.
- Replaced bundles remain archived with before/after audit snapshots; invalid or stale publication leaves current data unchanged.
- Moderators retain existing limits; anonymous and authenticated users cannot invoke the private publisher directly.
- Block G operator SQL needs no date entry, applies the six supplied times, and leaves Block A and verification status untouched.

Existing hosted projects need all earlier migrations followed by `202609160007_ongoing_schedules.sql`. `supabase/setup.sql` is regenerated for new projects only. The ongoing Block G query must be run after the migration. Hosted execution is not assumed from local tests.

Verification: full suite passed 83 tests; the subsequent additional multi-period replacement case and release audit passed in the final 18-test PostgreSQL/PostGIS run (84 total distinct tests). Production build, strict TypeScript and zero-warning lint passed. Tests cover nullable end-date queries/resolution, published timestamp changes, draft privacy, moderator restrictions, private-helper denial, audit replacement of multiple plans and the supplied Block G SQL. No authenticated hosted admin UI or live migration/publication is claimed.

September 17 clarification: the 05:45/13:30/17:30/18:40/20:30 and Friday 13:30 timetable belongs to Block A. Its separate operator script targets only block-a. Block G retains 05:30/13:15/17:15/18:42/20:15 and Friday 13:45. Both use the audited publisher.
