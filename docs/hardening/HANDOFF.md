# Current Handoff

Date: 2026-08-21
Integration owner: Codex
Current task: `TABLE-002` complete; next task is `TABLE-003`

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
- Legal-action schema checkpoint: `950699e` (`LEGAL-001-add-action-union-schemas`).
- Card-play legality checkpoint: `5404729` (`LEGAL-002-add-card-play-options`).
- Card-target legality checkpoint: `0b0f6f0` (`LEGAL-003-add-authoritative-card-targets`).
- Active-skill/client-migration checkpoint: `c6f8f61` (`LEGAL-004-migrate-client-to-authoritative-skills`).
- Table-controller checkpoint: `04af1ae` (`TABLE-001-extract-table-controllers`).
- Table-lifecycle checkpoint: `c0accf6` (`TABLE-002-deepen-table-lifecycles`).
- `pnpm typecheck` now covers all four packages and passes without excluding existing source or test files.
- Automated tests passed: engine 1,114; server 58; client 179; total 1,351.
- Production client build passed on 2026-08-21.
- The server and client are deployed as one Node service; rooms are process-memory only.

## Worktree precautions

- `packages/client/src/App.tsx` has an empty content diff but mixed line endings. Do not stage it as part of documentation work.
- Do not use broad `git add -A` in a mixed worktree.
- Stage explicit documentation/ignore paths only.
- Approved and currently mapped artwork must not be replaced without user approval.

## Immediate next task after TABLE-002

`TABLE-003` — presentational extraction and cleanup.

Before implementing:

1. Extract the action cluster, utility rail, and overlay markup into presentational modules with typed props.
2. Keep gameplay/store knowledge in the existing controllers and leave DOM anchors/class names stable.
3. Preserve Thai copy, responsive layouts, double-submit protection, modal lifetimes, and presentation-only distance display.
4. Do not merge draw animation or combat presentation into the new markup modules.
5. Run rendering/mobile/anchor/Table regressions, all package suites, typecheck, and production build.

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
