# Hardening Progress

Last updated: 2026-08-21
Current milestone: Phase 1 — TypeScript foundation
Overall status: Phase 0 complete; `TS-001` complete

## Next task

- `TS-002` — Typed IDs and exhaustive decisions
- Owner: Codex
- Status: `backlog`

## Completed in this cycle

- `DOC-001` — Coordination foundation.
- `TS-001` — Root compiler and command foundation.
- Added one `pnpm typecheck` gate covering engine, shared, server, and client.
- Kept all existing source and test includes active; fixed the engine contract helper's broad string indexing at its type source.
- Scope confirmed: no Database/User/Score/C#/persistent match recovery.
- Architecture ownership agreed: Codex integration owner; Claude receives bounded audit/test/content work after contracts stabilize.
- Existing source architecture and test suites reviewed.
- Current automated baseline executed successfully before this document set was created.

## Current automated baseline

| Package | Test files | Tests | Result |
|---|---:|---:|---|
| Engine | 37 | 1,087 | Passed |
| Server | 2 | 41 | Passed |
| Client | 19 | 162 | Passed |
| Total | 58 | 1,290 | Passed |

## Next actions

1. Push the `TS-001` checkpoint.
2. Review Claude's initial read-only audit if available.
3. Start `TS-002` with explicit ID/action boundary inventory.
4. Prefer derived string unions, `as const`, models, and discriminated unions; use enums only when a runtime namespace is required.

## Checkpoints

- `DOC-001`: `8dfb57e` (`DOC-001-hardening-execution-plan`).
- `TS-001`: `e75d6d3` (`TS-001-add-root-typecheck-gate`).

## Known workspace notes

- `packages/client/src/App.tsx` is reported modified because its worktree line endings are mixed; content diff is empty. It is not part of `DOC-001` and must not be staged.
- Local cache/config and verified superseded untracked artwork are cleaned during `DOC-001` and listed in its completion report.
- Rooms remain in memory and are lost on a server restart; persistence is deliberately outside this cycle.

## Blockers

- None for `TS-001`.
- GitHub CLI is not installed, so this checkpoint is pushed with normal Git rather than a CLI-created pull request.
