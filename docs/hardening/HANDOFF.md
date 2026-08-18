# Current Handoff

Date: 2026-08-18
Integration owner: Codex
Current task: none; next task is `TS-001` after usage reset

## Objective

Use the completed durable execution system for Core Hardening, Game Feel, lobby pacing, Beginner Assist, Tutorial, and release QA. No production-code changes have started in this cycle.

## Approved scope

Read `SPEC.md` and `DECISIONS.md`. Database, persistent accounts/scores, C#, new gameplay content, and arbitrary rulesets are explicitly excluded.

## Current repository baseline

- Branch at planning start: `main`
- Remote: `origin`
- Planning base: `faa89ef` (`Refine responsive player tiles`)
- Documentation checkpoint: `8dfb57e` (`DOC-001-hardening-execution-plan`)
- Automated tests passed: engine 1,087; server 41; client 162; total 1,290.
- The server and client are deployed as one Node service; rooms are process-memory only.

## Worktree precautions

- `packages/client/src/App.tsx` has an empty content diff but mixed line endings. Do not stage it as part of documentation work.
- Do not use broad `git add -A` in a mixed worktree.
- Stage explicit documentation/ignore paths only.
- Approved and currently mapped artwork must not be replaced without user approval.

## Immediate next task after DOC-001

`TS-001` — compiler and command foundation.

Before implementing:

1. Copy its card from `TASKS.md` into an expanded active task entry.
2. Record exact current files and compiler flags.
3. Write tests/verification commands.
4. Mark owner and branch.
5. Run baseline commands.

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
