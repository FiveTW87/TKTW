# Hardening Progress

Last updated: 2026-08-18
Current milestone: Phase 1 — TypeScript foundation
Overall status: Phase 0 complete; implementation has not started

## Next task

- `TS-001` — Compiler and command foundation
- Owner: Codex
- Status: `backlog` until the user starts Core Hardening after usage reset

## Completed in this cycle

- `DOC-001` — Coordination foundation.
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

1. Push the `DOC-001` coordination checkpoint.
2. Run and record fresh typecheck/build baseline at the start of `TS-001`.
3. Review Claude's initial read-only audit if available.
4. Start `TS-001`; do not begin legal-action implementation first.

## Checkpoints

- `DOC-001`: `8dfb57e` (`DOC-001-hardening-execution-plan`).

## Known workspace notes

- `packages/client/src/App.tsx` is reported modified because its worktree line endings are mixed; content diff is empty. It is not part of `DOC-001` and must not be staged.
- Local cache/config and verified superseded untracked artwork are cleaned during `DOC-001` and listed in its completion report.
- Rooms remain in memory and are lost on a server restart; persistence is deliberately outside this cycle.

## Blockers

- None for documentation.
- GitHub CLI is not installed, so this checkpoint is pushed with normal Git rather than a CLI-created pull request.
