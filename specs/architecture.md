# Architecture and accepted decisions

These decisions describe the implemented foundation and intended extensions. See [status](STATUS.md) for verification boundaries and the [setup guide](../README.md) for runtime and dependency requirements. Inspect `package.json` and its lockfile before using dependency APIs.

## ARC-01 — application boundaries

Use Next.js App Router, React, strict TypeScript, Tailwind and Supabase PostgreSQL/PostGIS/Auth. Keep components small. `src/domain` owns business rules, `src/lib/supabase` owns clients, and future `src/server` repositories own database access and mapping. Public production repositories must not fall back to `src/data/sample.ts` after errors.

## ARC-02 — schedule bundles

A `jamaat_schedules` revision owns daily entries, ordered Jumu'ah sessions and date overrides. Children inherit publication state from their parent, preventing draft overrides from leaking. Published periods for a mosque cannot overlap. Application writes use transactional RPCs rather than direct table writes.

`save_schedule_draft` replaces a whole draft atomically and checks an expected revision when editing. `publish_schedule` checks active membership and revision, serializes publication per mosque, replaces an exact matching effective period and appends old/new bundle snapshots. Other overlapping periods are rejected with rollback. Published bundles are immutable through application APIs.

## ARC-03 — time

Store mosque clock values as local `time without time zone`, effective/override dates as `date`, and publication instants as `timestamptz`. Every mosque has validated coordinates and an IANA timezone. Use the shared resolver and next-Jamaat service, not duplicated UI calculations.

Resolve today and tomorrow independently. Configured Friday Jumu'ah sessions replace Dhuhr in the next-congregation sequence. Use the earlier occurrence of a repeated DST clock time; skip a nonexistent clock time rather than silently shifting it. Missing schedules produce an unavailable state, not fabricated times. Freshness is informative; age alone does not imply inaccuracy.

## ARC-04 — trust boundaries

Public users may read non-rejected mosque records and published schedules. Active owner/admin/editor members may save and publish for their authorized mosque. Use validated server sessions plus database enforcement. No browser service-role keys, client-granted memberships, user-editable platform roles, direct publication bypasses or public audit/contact records.

Claims and submissions use RLS-protected tables and validated submission/review RPCs. Pending public submissions have an hourly queue cap and duplicate gate; claims require authentication and have a daily limit. Platform approval precedes management access. Submission approval never automatically creates mosque membership; approved claims grant the reviewed role and verify the mosque.

## ARC-05 — geography and privacy

Use PostGIS geography with a GiST index, `ST_DWithin` for radius filtering and `ST_Distance` for ordered distance results. Validate coordinates, radius and result count. Server configuration owns the default radius. Manual search uses bounded name/city/locality matching and escaped wildcard input. Do not load a global mosque directory into the browser to calculate proximity. Keep visitor coordinates in transient state; do not build location history.

## ARC-06 — stable QR identity

Store random URL-safe codes independently of slugs. The implemented database default produces 22-character UUID-derived tokens. `resolve_qr` exposes only active/disabled/invalid status and the current destination slug. The `/q/[code]` route preserves `source=qr_sticker`; following remains a deliberate visitor action. Membership-protected QR print pages use a configured canonical origin and locally generated QR assets. Fictional preview codes resolve only with explicit demo mode.

The admin save action publishes only the revision produced by its own save: 1 for a new draft, or the expected revision plus 1. It must not read a newer revision after saving and adopt it for publication, since that could publish another editor's unseen changes. An intervening edit causes the database publication revision check to reject the request.

## ARC-07 — future languages

Prayer keys and stored date/time values are independent of display language. Keep Unicode original mosque names and addresses. Use logical CSS properties where direction matters. Later add translation dictionaries, locale preference/routing, localized formatters and `lang`/`dir` selection for English, Arabic and German. Optional mosque-authored translations can live in a separate table keyed by mosque and locale. Do not add a full localization subsystem in Phase 1.

## ARC-08 — verification

Use domain tests for resolution/time rules and real SQL integration tests for RLS and publication. Current integration tests execute unchanged migrations in PGlite PostgreSQL/PostGIS with a minimal Supabase auth context. They do not verify hosted Auth, PostgREST or email delivery. Repeat connected integration verification before release. Browser visual verification and PWA checks remain explicit work; build success alone does not establish them.

Authentication callbacks and QR URLs use the configured canonical origin, never request Host headers. Public deployment builds require an HTTPS origin and Supabase public configuration. Confirmation failures redirect to recovery UI without retaining callback tokens; callback responses disable caching and referrer forwarding. Staging acceptance uses separate confirmed member/platform identities and isolated browser contexts, with session artifact recording disabled.

## ARC-09 — public read transport and demo isolation

Public repositories create a stateless anonymous Supabase client with no user cookies, even if an administrator is signed in elsewhere. Validate and map database rows at the repository boundary. Batch published schedules for a bounded set of mosques and a date window covering each mosque's today/tomorrow; resolve them through the existing domain service. Sort daily prayers by canonical prayer order, not incidental database order.

`POST /api/discovery` carries validated nearby/search/followed/detail queries. Coordinates remain out of URLs and browser storage; responses and outgoing database fetches use `no-store`. Detail pages use the RLS-protected `mosque_distance` RPC when transient coordinates are available. Hosting-level request body logging must be configured separately.

`?mode=demo` explicitly opts into fictional pilot data, including server-side distance calculations for only the ten fixture records. Live mode always uses PostGIS; missing configuration or failed live queries never trigger demo fallback. Local follows use separate versioned demo/live storage keys and a 50-mosque cap. Components report storage failures without claiming persistence.

Public views recalculate mosque-local date and next Jamaat as the clock ticks, refresh published data every minute while visible and on window focus, and report failed refreshes alongside previously loaded information. Request sequencing prevents a slower previous search from replacing a newer result.

## ARC-10 — Following, boards and maps

The home/PWA start route now shows Map, per the latest user instruction. Following is available through its own view. Store at most 50 followed-mosque open counts locally, separated by demo/live; no coordinates, personal account data or schedules enter this ranking storage. A selected result renders its timetable immediately from current component memory, with the shared resolver and ongoing refresh. The LCD-style board uses a labelled illustrative mosque backdrop. It is not a photograph of a particular directory mosque.

Leaflet 1.9.4 renders bounded directory results and separately labelled Photon place-search results, without importing provider places into the database or inferring their Jamaat times. OpenStreetMap raster tiles load whenever viewing the map, including an empty result set, with visible attribution, normal browser caching and no offline prefetch. Coordinates remain transient. Tile failure leaves the mosque list usable; Google Maps directions use the mosque's coordinates. See [Leaflet's integration guide](https://leafletjs.com/examples/quick-start/) and [tile policy](https://operations.osmfoundation.org/policies/tiles/).

## ARC-11 — Representative registration and limited moderators

The fifth migration adds private representative registrations and a maximum of two nomination slots per mosque. Only confirmed signed-in representatives can register. Platform review atomically creates the verified mosque, owner membership and nominations; existing directory submissions still grant no membership. Nominated users must sign in with their own confirmed nominated email and accept inside the dashboard. No invitation emails are sent by this workflow.

The new moderator role can read and save daily-time drafts for an existing period. The transaction rejects changes to period boundaries, Friday sessions and overrides. Existing manager authorization still controls publication, QR and audit access. Moderator acceptance locks the mosque and verifies the two-member limit; clients cannot write memberships directly. Publication retains revision checks and transactional audit history.

During schema rollout, only a missing `can_edit_timetable` RPC allows fallback to the existing `can_manage_mosque` check. Other errors deny access. Registration submission stays unavailable until the registration table and classification columns exist, and legacy platform reviews remain usable while the new schema is absent. This compatibility path never fabricates data or grants moderator access before migration.

## ARC-12 — Location-first registration and place search

Use explicit, bounded Photon searches (five results, timeout, abort on superseding requests) through a replaceable NEXT_PUBLIC_GEOCODER_URL endpoint. The public Photon service permits reasonable project use without availability guarantees; configure a private/hosted instance as traffic grows. See [Photon service guidance](https://github.com/komoot/photon#demo-server) and [API documentation](https://github.com/komoot/photon/blob/master/docs/api-v1.md). Search failures remain visible; registration still supports GPS, map click/drag and manual coordinates. No automatic background place crawling or synthetic fallback.

Map places are separate from registered mosque UUIDs and published schedules. Explicit favourite actions persist up to 50 validated provider places locally; they never imply a linked timetable or verification. Registration links may carry selected mosque coordinates, while visitor discovery coordinates continue to use POST/transient state. A registration pin is kept in session storage, without passwords/contact details. Auth return destinations accept only the fixed registration route or existing admin default.

Migration six stores representative-provided sect and optional sub-sect in the private registration record, with database constraints and platform review visibility. It does not infer classification from location/name or grant any access. Existing role, publication and review transactions are preserved.
