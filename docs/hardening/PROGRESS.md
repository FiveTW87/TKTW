# Hardening Progress

Last updated: 2026-08-21
Current milestone: Phase 1 — TypeScript foundation
Overall status: Phase 1 complete; `TS-001` and `TS-002` complete

## Next task

- `LEGAL-001` — Legal-action union and schemas
- Owner: Codex
- Status: `backlog`

## Completed in this cycle

- `DOC-001` — Coordination foundation.
- `TS-001` — Root compiler and command foundation.
- `TS-002` — Typed IDs and exhaustive decisions.
- Added one `pnpm typecheck` gate covering engine, shared, server, and client.
- Kept all existing source and test includes active; fixed the engine contract helper's broad string indexing at its type source.
- Added branded protocol IDs after Zod parsing without changing their wire representation.
- Exhaustive decision handling now fails typecheck when a new kind is not routed deliberately.
- Scope confirmed: no Database/User/Score/C#/persistent match recovery.
- Architecture ownership agreed: Codex integration owner; Claude receives bounded audit/test/content work after contracts stabilize.
- Existing source architecture and test suites reviewed.
- Current automated baseline executed successfully before this document set was created.

## Current automated baseline

| Package | Test files | Tests | Result |
|---|---:|---:|---|
| Engine | 37 | 1,087 | Passed |
| Server | 3 | 44 | Passed |
| Client | 19 | 162 | Passed |
| Total | 59 | 1,293 | Passed |

## Next actions

1. Push the `TS-002` checkpoint.
2. Review Claude's initial read-only audit if available.
3. Start `LEGAL-001` with per-variant schema/tests before client migration.
4. Keep Zod parsing authoritative at external seams and preserve hidden-information tests.

## Checkpoints

- `DOC-001`: `8dfb57e` (`DOC-001-hardening-execution-plan`).
- `TS-001`: `e75d6d3` (`TS-001-add-root-typecheck-gate`).
- `TS-002`: `98410dc` (`TS-002-add-typed-protocol-seams`).

## Known workspace notes

- `packages/client/src/App.tsx` is reported modified because its worktree line endings are mixed; content diff is empty. It is not part of `DOC-001` and must not be staged.
- Local cache/config and verified superseded untracked artwork are cleaned during `DOC-001` and listed in its completion report.
- Rooms remain in memory and are lost on a server restart; persistence is deliberately outside this cycle.

## Blockers

- None for `TS-002`.
- GitHub CLI is not installed, so this checkpoint is pushed with normal Git rather than a CLI-created pull request.
