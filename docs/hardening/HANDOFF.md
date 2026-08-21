# Current Handoff

Date: 2026-08-21
Integration owner: Codex
Current task: `TS-001` complete and awaiting checkpoint commit; next task is `TS-002`

## Objective

Continue the completed compiler foundation into typed IDs and exhaustive decisions, then follow the durable execution system for Core Hardening, Game Feel, lobby pacing, Beginner Assist, Tutorial, and release QA.

## Approved scope

Read `SPEC.md` and `DECISIONS.md`. Database, persistent accounts/scores, C#, new gameplay content, and arbitrary rulesets are explicitly excluded.

## Current repository baseline

- Branch at planning start: `main`
- Remote: `origin`
- Planning base: `faa89ef` (`Refine responsive player tiles`)
- Documentation checkpoint: `8dfb57e` (`DOC-001-hardening-execution-plan`)
- `pnpm typecheck` now covers all four packages and passes without excluding existing source or test files.
- Automated tests passed: engine 1,087; server 41; client 162; total 1,290.
- Production client build passed on 2026-08-21.
- The server and client are deployed as one Node service; rooms are process-memory only.

## Worktree precautions

- `packages/client/src/App.tsx` has an empty content diff but mixed line endings. Do not stage it as part of documentation work.
- Do not use broad `git add -A` in a mixed worktree.
- Stage explicit documentation/ignore paths only.
- Approved and currently mapped artwork must not be replaced without user approval.

## Immediate next task after TS-001

`TS-002` — typed IDs and exhaustive decisions.

Before implementing:

1. Inventory ID and decision/action types at engine/shared/server/client boundaries.
2. Prefer derived string unions or branded types for IDs and discriminated unions for actions.
3. Keep Zod as the runtime authority for network inputs.
4. Add type-level or schema fixtures before changing boundary models.
5. Preserve runtime behavior and run the full verification gate.

## Claude coordination

Claude may perform the read-only initial audit in `CLAUDE_TASKS.md` immediately. Claude must not change production files until Codex freezes the relevant contract and assigns a bounded task with allowed/forbidden paths.

## Completion protocol

For every task:

- update status;
- record assumptions;
- implement only in scope;
- add required tests;
- run targeted verification;
- run milestone verification when applicable;
- write completion report and commit hash;
- update `PROGRESS.md` and this handoff.
