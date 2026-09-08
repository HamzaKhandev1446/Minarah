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
