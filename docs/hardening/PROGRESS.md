# Hardening Progress

Last updated: 2026-08-21
Current milestone: Phase 2 — Server-authoritative legal actions
Overall status: `LEGAL-003` complete; card and target legality are authoritative, skill legality/client migration are next

## Next task

- `LEGAL-004` — Skills, projection, and client migration
- Owner: Codex
- Status: `backlog`

## Completed in this cycle

- `DOC-001` — Coordination foundation.
- `TS-001` — Root compiler and command foundation.
- `TS-002` — Typed IDs and exhaustive decisions.
- `LEGAL-001` — Legal-action discriminated union and strict schemas.
- `LEGAL-002` — Literal/conversion card-play options, shared Sha quota, and stable unavailable reasons.
- `LEGAL-003` — Target contracts for range, fixed/implicit effects, Fangtian, and dependent Jiedao selection.
- Added one `pnpm typecheck` gate covering engine, shared, server, and client.
- Kept all existing source and test includes active; fixed the engine contract helper's broad string indexing at its type source.
- Added branded protocol IDs after Zod parsing without changing their wire representation.
- Exhaustive decision handling now fails typecheck when a new kind is not routed deliberately.
- Viewer actions now use six explicit variants and remain empty for non-owners.
- Scope confirmed: no Database/User/Score/C#/persistent match recovery.
- Architecture ownership agreed: Codex integration owner; Claude receives bounded audit/test/content work after contracts stabilize.
- Existing source architecture and test suites reviewed.
- Current automated baseline executed successfully before this document set was created.

## Current automated baseline

| Package | Test files | Tests | Result |
|---|---:|---:|---|
| Engine | 39 | 1,109 | Passed |
| Server | 3 | 57 | Passed |
| Client | 19 | 162 | Passed |
| Total | 61 | 1,328 | Passed |

## Next actions

1. Push the pending `LEGAL-001` through `LEGAL-003` checkpoints after explicit payload confirmation.
2. Start `LEGAL-004` with active-skill legality and projection contracts.
3. Review Claude's initial read-only audit if available.
4. Keep client consumption deferred until `LEGAL-004`.

## Checkpoints

- `DOC-001`: `8dfb57e` (`DOC-001-hardening-execution-plan`).
- `TS-001`: `e75d6d3` (`TS-001-add-root-typecheck-gate`).
- `TS-002`: `98410dc` (`TS-002-add-typed-protocol-seams`).
- `LEGAL-001`: `950699e` (`LEGAL-001-add-action-union-schemas`).
- `LEGAL-002`: `5404729` (`LEGAL-002-add-card-play-options`).
- `LEGAL-003`: `0b0f6f0` (`LEGAL-003-add-authoritative-card-targets`).

## Known workspace notes

- `packages/client/src/App.tsx` is reported modified because its worktree line endings are mixed; content diff is empty. It is not part of `DOC-001` and must not be staged.
- Local cache/config and verified superseded untracked artwork are cleaned during `DOC-001` and listed in its completion report.
- Rooms remain in memory and are lost on a server restart; persistence is deliberately outside this cycle.

## Blockers

- None for `LEGAL-004`.
- GitHub CLI is not installed, so this checkpoint is pushed with normal Git rather than a CLI-created pull request.
