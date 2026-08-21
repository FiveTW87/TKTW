# Current Handoff

Date: 2026-08-21
Integration owner: Codex
Current task: `TS-002` complete; next task is `LEGAL-001`

## Objective

Continue the completed compiler foundation into typed IDs and exhaustive decisions, then follow the durable execution system for Core Hardening, Game Feel, lobby pacing, Beginner Assist, Tutorial, and release QA.

## Approved scope

Read `SPEC.md` and `DECISIONS.md`. Database, persistent accounts/scores, C#, new gameplay content, and arbitrary rulesets are explicitly excluded.

## Current repository baseline

- Branch at planning start: `main`
- Remote: `origin`
- Planning base: `faa89ef` (`Refine responsive player tiles`)
- Documentation checkpoint: `8dfb57e` (`DOC-001-hardening-execution-plan`)
- TypeScript compiler checkpoint: `e75d6d3` (`TS-001-add-root-typecheck-gate`)
- Typed protocol checkpoint: `98410dc` (`TS-002-add-typed-protocol-seams`).
- `pnpm typecheck` now covers all four packages and passes without excluding existing source or test files.
- Automated tests passed: engine 1,087; server 44; client 162; total 1,293.
- Production client build passed on 2026-08-21.
- The server and client are deployed as one Node service; rooms are process-memory only.

## Worktree precautions

- `packages/client/src/App.tsx` has an empty content diff but mixed line endings. Do not stage it as part of documentation work.
- Do not use broad `git add -A` in a mixed worktree.
- Stage explicit documentation/ignore paths only.
- Approved and currently mapped artwork must not be replaced without user approval.

## Immediate next task after TS-002

`LEGAL-001` — legal-action union and schemas.

Before implementing:

1. Define legal-action variants in the engine without moving legality into the client.
2. Mirror the union in Zod with compiler-checked variant coverage.
3. Verify owner-only projection and hidden information before client consumption.
4. Defer client legality migration to `LEGAL-004`.
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
