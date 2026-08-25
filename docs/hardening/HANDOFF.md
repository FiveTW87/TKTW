# Current Handoff

Date: 2026-08-25
Integration owner: Codex
Current task: `QA-001` complete; next task is `QA-002`

## Objective

Run full release QA over the completed hardening, game-feel, lobby, assistance, tutorial, mobile, and reliability milestones without expanding product scope.

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
- Latest pushed checkpoint before QA-001: `1c40921` (`REL-001-record-completion`).
- `pnpm typecheck` now covers all four packages and passes without excluding existing source or test files.
- `pnpm verify:milestone` is the canonical sequential gate; see `QA_MATRIX.md`.
- Automated tests passed: engine 1,122; server 76; client 300; total 1,498.
- Production client build passed with 305 modules on 2026-08-25.
- The server and client are deployed as one Node service; rooms are process-memory only.

## Worktree precautions

- `packages/client/src/App.tsx` has an empty content diff but mixed line endings. Do not stage it as part of documentation work.
- Do not use broad `git add -A` in a mixed worktree.
- Stage explicit documentation/ignore paths only.
- Approved and currently mapped artwork must not be replaced without user approval.

## Immediate next task after QA-001

`QA-002` — full release and production smoke test.

Before implementing:

1. Re-run `pnpm verify:milestone` at the final release candidate.
2. Complete named 3/5/8/10-player, reconnect/timeout/forfeit/rematch, hidden-information, tutorial, sound, reduced-motion, and mobile cells from `QA_MATRIX.md`.
3. Verify 932×430, 844×390, and 740×360 plus a real iPhone Safari landscape pass.
4. Run production server/client and `/health`, then record the in-memory restart limitation.
5. Do not mark unavailable real-device or independent-review evidence as passed.

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
