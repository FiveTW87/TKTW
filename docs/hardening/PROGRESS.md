# Hardening Progress

Last updated: 2026-08-21
Current milestone: Phase 2 — Server-authoritative legal actions
Overall status: `LEGAL-004` complete; main-action card, target, and active-skill affordances now consume authoritative legal actions

## Next task

- `TABLE-001` — Decision and main-action controllers
- Owner: Codex
- Status: `backlog`

## Completed in this cycle

- `DOC-001` — Coordination foundation.
- `TS-001` — Root compiler and command foundation.
- `TS-002` — Typed IDs and exhaustive decisions.
- `LEGAL-001` — Legal-action discriminated union and strict schemas.
- `LEGAL-002` — Literal/conversion card-play options, shared Sha quota, and stable unavailable reasons.
- `LEGAL-003` — Target contracts for range, fixed/implicit effects, Fangtian, and dependent Jiedao selection.
- `LEGAL-004` — Active-skill contracts, owner projection, atomic validation, and client migration off legality mirrors.
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
| Engine | 40 | 1,114 | Passed |
| Server | 3 | 58 | Passed |
| Client | 19 | 164 | Passed |
| Total | 62 | 1,336 | Passed |

## Next actions

1. Push the pending `LEGAL-001` through `LEGAL-004` checkpoints after explicit destination confirmation.
2. Start `TABLE-001` by extracting typed decision and main-action controllers without changing behavior.
3. Review Claude's initial read-only audit if available.
4. Keep presentation-only distance calculations separate from gameplay legality.

## Checkpoints

- `DOC-001`: `8dfb57e` (`DOC-001-hardening-execution-plan`).
- `TS-001`: `e75d6d3` (`TS-001-add-root-typecheck-gate`).
- `TS-002`: `98410dc` (`TS-002-add-typed-protocol-seams`).
- `LEGAL-001`: `950699e` (`LEGAL-001-add-action-union-schemas`).
- `LEGAL-002`: `5404729` (`LEGAL-002-add-card-play-options`).
- `LEGAL-003`: `0b0f6f0` (`LEGAL-003-add-authoritative-card-targets`).
- `LEGAL-004`: `c6f8f61` (`LEGAL-004-migrate-client-to-authoritative-skills`).

## Known workspace notes

- `packages/client/src/App.tsx` is reported modified because its worktree line endings are mixed; content diff is empty. It is not part of `DOC-001` and must not be staged.
- Local cache/config and verified superseded untracked artwork are cleaned during `DOC-001` and listed in its completion report.
- Rooms remain in memory and are lost on a server restart; persistence is deliberately outside this cycle.

## Blockers

- None for `TABLE-001`.
- Local commits are ahead of `origin/main`; push still requires explicit destination approval.
