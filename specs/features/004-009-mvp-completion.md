# Milestones 4–9 — complete Phase 1

Status: in progress. The user authorized all remaining MVP implementation and connection work on September 8, 2026. Hosted account/project access remains a user dependency; do not invent credentials or bypass authorization for a demo.

## Acceptance criteria

- [ ] QR tokens resolve independently of slugs; invalid/disabled states are clear; QR source is preserved and no automatic follow occurs.
- [ ] Authorized admins have QR posters with mosque identity, short URL, readable QR and browser printing. Synthetic poster previews are explicitly labelled and isolated.
- [ ] Supabase authentication supports sign-in, account registration/confirmation and sign-out. Membership is required for every schedule/QR management operation; platform role is required for reviews.
- [ ] Admin dashboard lists only authorized mosques; editor supports effective periods, daily prayers, multiple Friday sessions, date overrides, draft saves, intentional publication and visible change history.
- [ ] Concurrency conflicts and validation failures preserve published data; successful publishing updates public reads and audit metadata atomically.
- [ ] Public Add Mosque and authenticated claims submit pending records. Platform reviewers approve/reject; only approved claims grant membership. Submission approval creates an unverified mosque without membership.
- [ ] Manifest, PNG icons, mobile metadata and a minimal service worker enable installation. Offline fallback never presents cached schedule data as current and never caches private responses.
- [ ] Tests cover security/permissions, publishing, reviews, QR, PWA and user-visible forms; run formatting, lint, typechecks, tests and production build. Record external integration limits honestly.

## Implementation order

QR routes/poster components → authentication and protected admin/editor → onboarding/review transactions and UI → PWA → complete verification and deployment setup documentation.

## Connection dependencies

User is creating Supabase project. Public URL/key configure application connectivity; migration execution requires authorized database/CLI access or the user running the prepared SQL. Bootstrap the first platform admin only for a confirmed Auth user via a privileged operator. No shared default passwords or client-side admin bypasses.

## Verification evidence

Application routes and forms for the criteria above are implemented. Checkboxes remain open where complete user-facing or device verification is missing; database support is not equivalent to a verified hosted workflow. See [current status](../STATUS.md) for actual results.

- Publication must use only the revision returned implicitly by its own save contract (new draft: 1; existing draft: expected revision + 1). A competing edit between save and publish must fail publication rather than publish unseen changes. `tests/admin-actions.test.ts` covers this boundary; database tests cover stale revisions, rollback and audit.
- `tests/database.test.ts` covers submission approval without membership, platform-only reviews, claim-approved membership, duplicate submission rejection and stable authorized QR creation.
- `tests/e2e/mvp.spec.ts` covers QR source/no-auto-follow, protected-route redirects, manifest and static-only offline caches on mobile/desktop Chromium. Real printed scanning, installation and authenticated form acceptance remain pending.
- Public hosted search and QR RPCs returned HTTP 200 in a read-only check on September 8. Auth/email and authenticated writes were not exercised.

## Release setup

Use `/auth/login` to register, confirm an email and sign in. `/admin` lists active memberships; `/admin/[mosqueId]` supports effective periods, drafts, publication, Friday sessions, overrides and history. `/admin/[mosqueId]/qr` provides the protected poster; `/demo/qr/sample-cedar` is a fictional preview.

Public `/submit` creates a pending mosque submission. Signed-in visitors claim a real mosque from its detail page and track requests at `/claims`. Platform administrators review at `/platform`. Submission approval creates an unverified mosque without membership; claim approval grants the selected role and verifies the mosque.

Set `NEXT_PUBLIC_SITE_URL` in `.env.local` to the canonical deployment origin before printing real posters or sending confirmation emails. Configure Supabase Auth Site URL and `/auth/callback` redirect allowlisting for that origin. `npm run db:prepare` generates `supabase/setup.sql` for a **new, empty** project; existing projects must use versioned migrations. Generation does not apply SQL remotely.

Run `node --env-file=.env.local scripts/check-connection.mjs` for read-only public search/QR connectivity. It prints HTTP status/error codes without keys or response bodies. It does not verify authentication, email or privileged workflows.

This workspace has an ignored Node 24 executable at `.tools/node/node.exe`. It is local tooling, not a committed dependency. No global installation or persistent PATH change is required; set PATH only in the command session to use it. All environment modifications must stay project-scoped per the user's instruction.

Before release, verify registration/confirmation, approved membership, private drafts and authenticated publication from 20:30 to 20:45 against the connected project, including public refresh and audit. Verify printed QR scanning and installation on real devices. The service worker caches only static offline assets, never schedules or private responses.

### Release verification continuation � September 9

- Acceptance requires canonical-origin redirects, recovery for failed confirmations, and resend support without disclosing callback tokens. `tests/auth.test.ts` covers origin validation, PKCE and email-token confirmation, recovery and resend.
- `tests/e2e/release.spec.ts` checks automated WCAG A/AA rules on five public pages, viewport overflow, confirmation recovery and poster print layout. Optional Firefox/WebKit projects extend the browser matrix.
- `supabase/verify-release.sql` checks required database objects, RLS and anonymous write restrictions in a read-only transaction; the database suite executes it locally.
- `tests/live/workflows.spec.ts` provides the dedicated-staging submission/claim/publication scenario. Draft privacy is assessed only after an explicit successful-save message. Execution requires staging configuration and confirmed test identities; preparation alone does not verify hosted acceptance.
