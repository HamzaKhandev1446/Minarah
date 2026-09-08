# Minarah specifications

This folder is the entry point for spec-driven development by people and AI agents. Keep product intent, implementation scope and verification evidence together as Minarah evolves.

## Read order

1. [Current status](STATUS.md): what exists, what is verified and what comes next.
2. [Product requirements](product.md): Phase 1 scope and stable requirement IDs.
3. [Architecture decisions](architecture.md): domain, data and security rules.
4. The relevant feature spec, starting with [Milestone 3: public read experience](features/003-public-read.md).
5. [Original build brief](phase-1-brief.md) when full source requirements are needed.

The original brief is preserved as a historical source. Its initial audit approval checkpoint has already been satisfied. The user's latest instructions take precedence; neither a future feature spec nor the roadmap is an instruction to implement that feature immediately.

## Working process

1. Read the relevant spec and inspect the implementation. Identify differences before editing.
2. For a new feature, copy [the feature template](templates/feature.md) to `features/NNN-short-name.md`. Define the user outcome, scope, acceptance criteria, data/security effects and verification plan. Keep small changes small.
3. Implement the requested scope. Update the spec when an authorized decision changes behavior; do not rewrite requirements merely to match an implementation defect.
4. Verify observable acceptance criteria using appropriate tests or manual checks. Record failures and unverified dependencies honestly.
5. Update `STATUS.md` with delivered scope, evidence, limitations and next work. Keep milestone history in `../PHASE_1_PLAN.md`; avoid maintaining competing current checklists.

Use stable IDs such as `PUB-01` for requirements and `M3-AC01` for feature acceptance criteria so tests and reports can refer to them. Spec statuses are `planned`, `in progress`, `implemented`, and `verified`. A database function alone does not verify a complete public or admin workflow.

## Suggested AI task wording

> Implement the requested scope in `specs/features/003-public-read.md`. Read `AGENTS.md` and `specs/STATUS.md` first, inspect existing code, preserve the domain and security rules, and update the spec/status with actual verification results. Report remaining limitations.

## Maintenance

- `product.md` owns product requirements and non-goals.
- `architecture.md` owns accepted technical decisions and extension points.
- Feature specs own detailed acceptance criteria and planned verification.
- `STATUS.md` owns the current implementation and verification state.
- `phase-1-brief.md` preserves the supplied brief; do not silently edit the source history.
- Root `README.md` owns setup instructions; link to it instead of copying commands that can drift.
