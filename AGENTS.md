# Minarah repository guidance

Before implementation, read [specs/README.md](specs/README.md), [specs/STATUS.md](specs/STATUS.md), and the relevant feature spec. Use the specs to guide scope, domain rules, acceptance criteria and verification.

- Follow the user's current instructions. Specs record product intent; they do not override user instructions or create additional approval gates.
- Inspect existing code and installed dependency versions before editing. Preserve working architecture and keep TypeScript strict.
- Keep implementation within the requested milestone or feature. Do not infer authorization to build every item in the roadmap.
- Keep Jamaat separate from calculated prayer beginning times. Never silently substitute synthetic data for failed live queries.
- Enforce authorization server-side and in the database. Preserve draft privacy, transactional publication and audit history.
- Keep schedule resolution and next-Jamaat logic centralized; use each mosque's IANA timezone.
- For changed behavior, update the relevant spec and acceptance criteria in the same change. Record significant architecture decisions in `specs/architecture.md`.
- Run checks appropriate to the change. Record actual results and limitations in `specs/STATUS.md`; distinguish domain/database support from completed user-facing workflows.
- Do not claim an acceptance criterion is verified without evidence. Documentation-only edits need formatting/link checks, not a full application build.

See [README.md](README.md) for setup and commands. `PHASE_1_PLAN.md` is the historical audit and milestone report; `specs/STATUS.md` tracks current progress.
