# Hardening Task Board

## Rules

- Only one owner may edit a file at a time.
- A task moves `ready → in_progress → review → completed`.
- Claude may move assigned work to `review`; Codex is the integration owner and marks `completed` after verification.
- Every task must use the task specification below. A task without a test plan must not start.
- Every completion report records changed files, tests added, verification commands/results, commit, limitations, and follow-up.

## Required task specification

```md
## ID — Title
Status / Owner / Reviewer / Branch / Dependencies / Estimate / Risk

### Objective
### Current behavior
### Expected behavior
### In scope / allowed files
### Out of scope / forbidden files
### Type or protocol changes
### Implementation steps
### Edge cases
### Acceptance criteria
### Tests to add
### Verification commands
### Completion report
```

## Board

| ID | Title | Status | Owner | Estimate | Depends on |
|---|---|---|---|---:|---|
| DOC-001 | Coordination foundation | completed | Codex | 1d | — |
| TS-001 | Compiler and command foundation | completed | Codex | 0.5d | DOC-001 |
| TS-002 | Typed IDs and exhaustive decisions | completed | Codex | 1d | TS-001 |
| LEGAL-001 | Legal-action union and schemas | completed | Codex | 1d | TS-002 |
| LEGAL-002 | Card play and conversion legality | completed | Codex | 1.5d | LEGAL-001 |
| LEGAL-003 | Targets, range, and multi-step legality | completed | Codex | 1.5d | LEGAL-002 |
| LEGAL-004 | Skills, projection, and client migration | completed | Codex | 2d | LEGAL-003 |
| TABLE-001 | Decision and main-action controllers | completed | Codex | 1d | LEGAL-004 |
| TABLE-002 | Selection, dialogs, and sound controllers | completed | Codex | 1d | TABLE-001 |
| TABLE-003 | Presentational extraction and cleanup | completed | Codex | 1d | TABLE-002 |
| ASSET-001 | Typed general-art manifest | completed | Codex | 1.5d | TS-002 |
| PRES-001 | Presentation-event model and queue | completed | Codex | 1.5d | LEGAL-004, ASSET-001 |
| PRES-002 | Anchor retry, reconnect, and reduced motion | completed | Codex | 1d | PRES-001 |
| SFX-001 | Audio manager and preferences | completed | Codex | 1.5d | PRES-001 |
| FX-001 | Card and equipment motion | completed | Codex | 2d | PRES-002 |
| FX-002 | Combat and skill sequences | completed | Codex | 2.5d | FX-001, SFX-001 |
| FX-003 | Judgment, Wuxie, turn, and timer feedback | complete | Codex | 2d | FX-002 |
| ROOM-001 | Typed room settings and presets | completed | Codex | 1.5d | LEGAL-001 |
| ROOM-002 | Create/lobby UI and lifecycle preservation | completed | Codex | 1.5d | ROOM-001 |
| ASSIST-001 | Preferences and first-time onboarding | completed | Codex | 2d | TABLE-003, ROOM-002 |
| ASSIST-002 | Context help and unavailable-action reasons | completed | Codex | 3d | LEGAL-004, ASSIST-001 |
| TUT-001 | Tutorial scenario/controller foundation | completed | Codex | 2d | ASSIST-002, PRES-002 |
| TUT-002 | Basic lessons and scripted bot | completed | Codex + Claude content | 3d | TUT-001 |
| TUT-003 | Advanced lessons, resume, and polish | completed | Codex + Claude content | 4d | TUT-002 |
| MOB-001 | Mobile layout-mode and Safari hardening | completed | Codex | 2d | FX-003, ASSIST-002 |
| REL-001 | Structured diagnostics and failure UX | completed | Codex | 1.5d | ROOM-002 |
| SFX-002 | Layered game-audio reset and event mix | completed | Codex | 2.5d | SFX-001, FX-003 |
| QA-001 | Milestone verification matrix | completed | Codex + Claude review | 2d | Each milestone |
| QA-002 | Full release and production smoke test | backlog | Codex | 3d | All tasks, SFX-002 |

---

## DOC-001 — Coordination foundation

Status: completed
Owner: Codex
Reviewer: User
Branch: current integration branch
Dependencies: none
Estimate: 1 day
Risk: Low

### Objective

Create durable scope, roadmap, task, progress, decision, handoff, test-baseline, and Claude-work documents before production changes begin.

### Current behavior

Requirements exist across long specification/TODO documents and conversation history, but there is no focused execution ledger for this hardening cycle.

### Expected behavior

Any agent can read `docs/hardening` and identify the approved scope, current task, file ownership, test gate, latest commit, and safe next action.

### In scope / allowed files

- `docs/hardening/**`
- `.gitignore` for local cache/config exclusions
- removal of verified untracked cache and superseded untracked artwork only

### Out of scope / forbidden files

- Production TypeScript, CSS, tracked artwork, dependencies, and existing canonical SPEC/TODO documents.

### Type or protocol changes

None.

### Implementation steps

1. Verify the worktree and classify existing changes.
2. Create all coordination documents.
3. Record the current test baseline and known limitations.
4. Define task/test/completion templates.
5. Add Claude handoff and read-only starter work.
6. Remove only verified cache, machine-local config, and unused superseded untracked artwork.
7. Verify links/status, commit, and push.

### Edge cases

- Existing user changes must not be staged.
- Approved artwork must not be deleted.
- Machine-local configuration must not become a repository requirement.

### Acceptance criteria

- Documents are internally consistent and identify Database/User/Score/C# as out of scope.
- Every planned implementation task has an objective, scope, acceptance criteria, and test expectations.
- Worktree cleanup is explicit and recoverability is reported.
- Only intended files are staged.

### Tests to add

No code tests. Verify Markdown paths, Git diff, and repository status.

### Verification commands

- `git diff --check`
- `git status --short`
- `rg --files docs/hardening`

### Completion report

Completed at: 2026-08-18
Commit: `8dfb57e` (`DOC-001-hardening-execution-plan`)
Status: completed

#### Changed

- Created the focused hardening specification, roadmap, task board, progress ledger, decisions, handoff, baseline, and Claude work packages.
- Added ignore rules for the workspace-local pnpm store and Claude machine-local permission file.
- Removed the untracked `.pnpm-store` cache and `.claude/settings.local.json`.
- Removed three verified untracked superseded artwork files: `guo_jia_attack-v1.png`, `liu_bei_hit-v1.png`, and `liu_bei_hit-v2.png`. The tracked canonical replacements are `guo_jia_attack-v2.png` and `liu_bei_hit-v3.png`.

#### Files changed

- `.gitignore`
- `docs/hardening/**`

#### Tests and verification

- No production code changed, so no new automated code test was required by this task's test plan.
- `git diff --check`: passed.
- Verified all eight hardening documents are discoverable with `rg --files docs/hardening`.
- Verified removed artwork names have no source reference and their tracked canonical replacements remain present.
- Existing full-suite baseline immediately before documentation work: 1,290/1,290 passed.

#### Known limitations

- `packages/client/src/App.tsx` still appears modified from mixed worktree line endings, with no content diff. It was deliberately excluded.
- GitHub CLI is unavailable; normal Git push is used and no pull request is created for this direct documentation checkpoint.

#### Follow-up

- `TS-001` — Compiler and command foundation.

---

## TS-001 — Compiler and command foundation

Status: completed | Owner: Codex | Reviewer: Claude audit | Estimate: 0.5 day | Risk: Medium

### Objective

Create a single root typecheck gate and enable additional compiler safety only after measuring the resulting errors.

### Scope

Root/package scripts, TypeScript configs, and typecheck documentation. No behavior changes.

### Acceptance criteria

- One root command typechecks all four packages.
- New checks do not silently exclude source files.
- Existing build and tests remain green.

### Tests and verification

- Add script/config assertions if available.
- Run root typecheck, all package builds, and the full test suite.

### Completion report

Completed at: 2026-08-21
Commit: `e75d6d3` (`TS-001-add-root-typecheck-gate`)
Status: completed

Changed:

- Added `pnpm typecheck` as the single root gate for all four packages.
- Added package-level `tsc --noEmit` scripts without changing existing include lists.
- Added `CardTypeKey` derived from the canonical JSON catalog.
- Typed the contract-suite card lookup with known catalog keys instead of weakening `noUncheckedIndexedAccess` or excluding tests.

Verification:

- `pnpm typecheck`: passed for engine, shared, server, and client.
- `pnpm test`: 58 files and 1,290 tests passed.
- `pnpm build:client`: production build passed.
- No runtime behavior changes and no source/test files excluded from typechecking.

---

## TS-002 — Typed IDs and exhaustive decisions

Status: completed | Owner: Codex | Reviewer: Claude | Estimate: 1 day | Risk: High

### Objective

Introduce safe ID distinctions and exhaustive decision/action handling at package boundaries without rewriting the engine state model.

### Scope

Shared protocol types, boundary adapters, decision-copy routing, and focused tests. No gameplay-rule changes.

### Acceptance criteria

- Important action/decision switches fail typecheck when a new variant is unhandled.
- Player/card/match/decision IDs cannot be casually interchanged at new boundaries.
- Zod parsing remains the runtime authority for network inputs.

### Tests and verification

- Type-level compile fixtures where practical.
- Protocol-schema tests, full typecheck, shared/server/client tests, and build.

### Completion report

Completed at: 2026-08-21
Commit: `98410dc` (`TS-002-add-typed-protocol-seams`)
Status: completed

Changed:

- Added the canonical `DecisionKind` union and compiler-checked runtime Zod vocabulary.
- Made the engine bot, client decision-copy routing, and client interaction reducer exhaustive.
- Added Zod-branded `PlayerId`, `CardId`, `MatchId`, `DecisionId`, and `ClientActionId` outputs at protocol seams.
- Kept engine state IDs and the wire representation as strings; this is not a state-model rewrite.
- Added compile-only ID interchange fixtures and runtime protocol-schema tests.

Verification:

- Targeted protocol tests: 3 passed.
- `pnpm typecheck`: passed for engine, shared, server, and client.
- `pnpm test`: 59 files and 1,293 tests passed.
- `pnpm build:client`: production build passed with 198 modules transformed.
- No gameplay-rule changes.

---

## LEGAL-001 — Legal-action union and schemas

Status: completed | Owner: Codex | Reviewer: Claude | Estimate: 1 day | Risk: High

### Objective

Define the viewer-facing discriminated union for play-card, use-skill, response, draw, discard, and end-phase actions.

### Scope

Engine legal-action model, shared schemas/views, projection tests. Client consumption is deferred to `LEGAL-004`.

### Acceptance criteria

- Union variants carry only information required by their action.
- Schemas parse real assembled GameViews.
- Non-owner viewers receive no private legal actions.

### Tests and verification

- Unit/schema snapshots for every variant.
- Hidden-information tests.
- Engine/shared/server tests, typecheck, and build.

### Completion report

Completed at: 2026-08-21
Commit: `950699e` (`LEGAL-001-add-action-union-schemas`)
Status: completed

Changed:

- Replaced the optional-field legal-action object with six discriminated variants: `playCard`, `useSkill`, `response`, `draw`, `discard`, and `endPhase`.
- Split `mainAction` into three explicit action markers while deferring card/skill enumeration to `LEGAL-002`/`LEGAL-003`.
- Kept reactive source context as a typed `decisionKind` and made engine routing exhaustive.
- Added strict Zod schemas that reject fields belonging to another variant.
- Preserved owner-only projection; non-owners receive an empty action array.

Verification:

- Targeted engine legal-action tests: 10 passed.
- Targeted protocol-schema tests: 10 passed.
- `pnpm typecheck`: passed for all four packages.
- `pnpm test`: 59 files and 1,302 tests passed.
- `pnpm build:client`: production build passed with 198 modules transformed.
- Existing real-GameView schema and hidden-information E2E tests passed.

---

## LEGAL-002 — Card play and conversion legality

Status: completed | Owner: Codex | Reviewer: Claude | Estimate: 1.5 days | Risk: High

### Objective

Make the engine report literal and converted card plays, per-turn limits, card-count requirements, and stable unavailable reason codes.

### Scope

Basic/trick/equipment main actions and conversion skills. Target enumeration is `LEGAL-003`.

### Edge cases

Response-only cards, second Sha, crossbow, Zhang Fei, Zhangba, Fangtian last-card behavior, Guan Yu, Zhao Yun, Zhen Ji, Gan Ning, Da Qiao, and Hua Tuo turn scope.

### Acceptance criteria

Every advertised play is accepted by engine validation when submitted with a legal target set; unavailable plays have stable reason codes.

### Tests and verification

- Contract tests for all card categories and conversions.
- Retry-safety and atomicity regression tests.
- Engine fuzz, typecheck, and build.

### Completion report

Completed at: 2026-08-21
Commit: `5404729` (`LEGAL-002-add-card-play-options`)
Status: completed

Changed:

- Added server-authoritative literal, conversion, and Zhangba card-play options to the `playCard` legal-action variant.
- Added stable unavailable reasons for response-only cards, exhausted Sha usage, wrong conversion timing, and insufficient substitute cards.
- Centralized the Sha usage-limit query so legal-action projection and command validation use the same calculation for normal Sha, crossbow, and Zhang Fei.
- Separated conversion capability discovery from real-time validation so Hua Tuo's red-as-Tao ability can be reported as unavailable during his own turn without making the play legal.
- Passed real state into viewer-gated legal-action projection and extended the strict shared Zod schema.
- Kept target enumeration and validation metadata deferred to `LEGAL-003`.

Tests added or updated:

- Added 12 engine contract cases covering literal basic/trick/equipment plays, response-only cards, accepted equipment and Guan Yu submissions, all conversion generals in scope, Sha limits, Zhangba, Fangtian, and Hua Tuo timing.
- Added strict protocol coverage for available/unavailable option shapes and reason-code requirements.
- Updated existing legal-action/schema fixtures for the required `options` array.

Verification:

- Targeted engine legal-action tests: 22 passed.
- Targeted server protocol tests: 11 passed.
- `pnpm typecheck`: passed for engine, shared, server, and client.
- `pnpm test`: 60 files and 1,315 tests passed (engine 1,101; server 52; client 162).
- `pnpm build:client`: production build passed with 198 modules transformed.
- `git diff --check`: passed.

Known limitations:

- Card target IDs/counts are intentionally not included yet; `LEGAL-003` adds them and verifies every advertised option against eligible targets.
- Client consumption remains deferred to `LEGAL-004`; the server continues to revalidate every answer.

Follow-up:

- `LEGAL-003` — Targets, range, and multi-step legality.

---

## LEGAL-003 — Targets, range, and multi-step legality

Status: completed | Owner: Codex | Reviewer: Claude | Estimate: 1.5 days | Risk: High

### Objective

Derive eligible targets and target counts in the engine for card actions, including multi-step targeting.

### Edge cases

Self-target restrictions, Tao/self-heal, dead seats, horses, Ma Chao, Fangtian, empty targets for Guohe/Shunshou, and both steps of Jiedao.

### Acceptance criteria

- Eligible targets match engine validation.
- Jiedao cannot select its caster and only offers reachable second targets.
- Hidden zones are not revealed by eligibility metadata.

### Tests and verification

- Per-card target unit tests.
- Hidden-information and rejected-answer regression tests.
- Engine/server tests, fuzz, typecheck, and build.

### Completion report

Completed at: 2026-08-21
Commit: `0b0f6f0` (`LEGAL-003-add-authoritative-card-targets`)
Status: completed

Changed:

- Added a typed target contract for no-selection, fixed automatic, independent, and dependent two-step targeting.
- Derived eligible targets from live seats, attack/fixed range, horses, distance skills, target-immunity hooks, takeable-card state, delayed-trick duplication, and public equipment.
- Added Tao's optional implicit self target and Fangtian's last-card target cap while keeping Zhangba single-target.
- Added dependent Jiedao maps from armed player to reachable victim and hardened engine validation against out-of-range victims.
- Added `no_legal_target` so a visible card option with no valid selection is reported unavailable.
- Moved shared Sha/target predicates into `cardTargets.ts` and updated the deterministic bot to consume viewer-safe legal targets rather than invent Jiedao pairs.
- Kept client migration deferred to `LEGAL-004`.

Tests added or updated:

- Added 8 target contract tests for equipment/fixed effects, Tao, Sha range, horses, Ma Chao, dead seats, Fangtian, Zhangba, takeable cards, immunity, delayed tricks, Jiedao, and self-target rejection.
- Expanded strict protocol tests across all four target variants and malformed cross-variant fields.
- Updated conversion fixtures so availability includes real target state.

Verification:

- Targeted engine legality/trick/weapon/atomicity/retry tests: 154 passed.
- Targeted server protocol-schema tests: 16 passed.
- Previously failing fuzz/determinism group after bot integration: 71 passed, including more than 3,000 complete simulated games.
- `pnpm typecheck`: passed for engine, shared, server, and client.
- Full suites: 61 files and 1,328 tests passed (engine 1,109; server 57; client 162).
- `pnpm build:client`: production build passed with 198 modules transformed.
- `git diff --check`: passed.

Known limitations:

- Active-skill card/target legality and client consumption remain in `LEGAL-004`.
- Fixed automatic effects expose affected public player IDs but continue to submit no explicit target IDs.

Follow-up:

- `LEGAL-004` — Skills, projection, and client migration.

---

## LEGAL-004 — Skills, projection, and client migration

Status: completed | Owner: Codex | Reviewer: Claude | Estimate: 2 days | Risk: High

### Objective

Add active-skill legality and migrate the client away from authoritative mirror calculations.

### Scope

Skill card/target counts, usage limits, projection, Table controllers, and removal of replaced mirrors. Cosmetic distance display may remain client-derived if documented.

### Acceptance criteria

- Client highlights and confirm states consume legal actions.
- Server still validates every answer.
- No private choice reaches another viewer.
- Existing action UX and Thai copy remain intact.

### Tests and verification

- All 25 generals and 40 skills covered by contract or fuzz tests.
- Client card/target/skill interaction tests.
- Engine/server/client tests, typecheck, and build.

### Completion report

Completed at: 2026-08-21
Commit: `c6f8f61` (`LEGAL-004-migrate-client-to-authoritative-skills`)
Status: completed

Changed:

- Added typed selection metadata to every registered active skill: card counts, target rule, usage counters, and stable unavailable reasons.
- Centralized active-skill selection validation before handlers run, including duplicate/non-hand cards, exact target counts, target eligibility, and atomic rejection.
- Published owner-only active-skill options through the strict shared `legalActions` schema.
- Migrated Table and SelfDock card/target/skill affordances to server-projected options, including conversions, Zhangba, implicit Tao self-heal, dependent Jiedao selection, usage limits, and unavailable states.
- Removed the replaced client active-skill spec table and card/target legality mirrors; client distance remains presentation-only for badges/inspection.
- Updated deterministic bots to consume legal active-skill selections and kept server revalidation authoritative.

Tests added or updated:

- Added 5 engine contract tests covering all 7 active skills, owner-only projection, stable unavailable reasons, accepted advertised selections, and atomic rejection.
- Added client regressions proving target highlighting and skill disabling obey explicit server contracts rather than visible-player inference.
- Expanded strict protocol-schema tests for active-skill availability variants and malformed payload rejection.

Verification:

- Targeted Table suite: 67 passed.
- Engine suite: 40 files and 1,114 tests passed.
- Server suite: 3 files and 58 tests passed. The quickstart-bot test also passed alone after one parallel root-suite resource-contention timeout.
- Client suite: 19 files and 164 tests passed.
- Total clean package baseline: 62 files and 1,336 tests passed.
- `pnpm typecheck`: engine, shared, server, and client passed.
- Production client build: passed with 198 modules transformed.
- Test catalog check: 256 pass, 0 fail, 0 waived, 0 pending.
- `git diff --check`: passed.

Known limitations:

- Reactive response-card enumeration remains decision-specific and is not part of the main-action migration.
- Cosmetic attack-distance badges remain client-derived and do not enable gameplay actions.

Follow-up:

- `TABLE-001` — Decision and main-action controllers.

---

## TABLE-001 — Decision and main-action controllers

Status: completed | Owner: Codex | Reviewer: Claude | Estimate: 1 day | Risk: Medium

### Objective

Extract decision routing and main-action orchestration from `Table.tsx` into typed hooks without changing rendering.

### Acceptance criteria

- Table no longer owns server-decision routing details.
- Auto-pass and auto-accept behavior is unchanged.
- Decision changes reset local selection.

### Tests and verification

- Hook tests for every decision route.
- Existing Table, double-click, reactive, and stuck-state tests.
- Client typecheck/build.

### Completion report

Completed at: 2026-08-21
Commit: `04af1ae` (`TABLE-001-extract-table-controllers`)
Status: completed

Changed:

- Added a typed decision controller that owns owner/waiting routing, automatic answers, inline/modal/pile presentation routes, skill toast timing, and busy release.
- Added a deep main-action controller that interprets authoritative card/skill options and all target-contract variants, including Jiedao order, Tao implicit self, conversion payloads, Zhangba, selection caps, and unavailable reasons.
- Reduced `Table.tsx` to controller composition for those responsibilities without changing responsive JSX, dialogs, combat effects, or sound routing.
- Exported the interaction action union so the main-action controller has a compiler-checked dispatch interface.

Tests added or updated:

- Added 4 decision-controller tests for exact-once auto-pass, modal/inline routing, and busy release after rejection.
- Added 4 main-action-controller tests for authoritative target eligibility, dependent target order, implicit-self Tao, and unavailable actions.
- Existing 67 Table regressions all remain green, including double-submit, reactive answers, Jiedao/Lijian/Zhangba, equipment replacement, conversion, auto skills, mobile, and stuck-state coverage.

Verification:

- Client: 21 files, 172 tests passed.
- Engine: 40 files, 1,114 tests passed.
- Server: 3 files, 58 tests passed.
- Total: 64 files, 1,344 tests passed.
- `pnpm typecheck`: passed for engine, shared, server, and client.
- Production client build: passed with 200 modules transformed.
- Test catalog: 256 pass, 0 fail, 0 waived, 0 pending.
- `git diff --check`: passed for the task files.

Known limitations:

- Dialog/notice state and snapshot-diff sound routing intentionally remain in `Table.tsx` for `TABLE-002`.
- Presentational JSX extraction remains deferred to `TABLE-003`.
- The client continues to use server `legalActions` as gameplay authority; cosmetic distance display remains presentation-only.

Follow-up:

- `TABLE-002` — Selection, dialogs, and sound controllers.

---

## TABLE-002 — Selection, dialogs, and sound controllers

Status: completed | Owner: Codex | Reviewer: Claude | Estimate: 1 day | Risk: Medium

### Objective

Extract target/card selection, notices/dialog state, and snapshot-diff sound routing into focused hooks.

### Acceptance criteria

- Selection caps and multi-step ordering are preserved.
- No stale dialog or selection survives a new decision.
- Sound routing has one owner.

### Tests and verification

- Reducer/hook tests, Jiedao/Lijian/Zhangba regressions, modal and SFX tests.
- Client suite, typecheck, and build.

### Completion report

Completed at: 2026-08-21
Commit: `c0accf6` (`TABLE-002-deepen-table-lifecycles`)
Status: completed

Changed:

- Deepened `useInteraction` so callers use semantic, atomic commands rather than reducer actions or raw dispatch.
- Selection now exposes an empty state immediately when the authoritative decision key changes; same-key renders preserve the current choice.
- Added `useTableTransientUi` with explicit decision-, table-, timed cross-decision-, and match-scoped lifetimes for notices, skill toast, inspection, play-as choice, discard browser, leave confirmation, and death dismissal.
- Added `useTableSfx` as the sole owner of table snapshot-to-sound mapping, including silent initial/match-reset/log-rollback/reconnect baselines.
- Kept `mainActionController` as the pure authoritative legal-option interpreter and changed its seam to consume semantic selection commands.
- Left responsive markup, draw animation, combat presentation, audio synthesis/preferences, and DOM anchors in their existing owners.

Tests added or updated:

- Expanded interaction tests to 7 cases covering immediate decision reset, atomic mode changes, independent caps, dependent Jiedao ordering/replacement, and reset.
- Added 3 transient-UI fake-timer/lifetime tests.
- Added 3 SFX routing/reconnect tests.
- Existing 67 Table regressions, SFX/store tests, Jiedao/Lijian/Zhangba, double-submit, modal, death, mobile, and stuck-state cases remain green.

Verification:

- Client: 23 files, 179 tests passed.
- Engine: 40 files, 1,114 tests passed.
- Server: 3 files, 58 tests passed.
- Total: 66 files, 1,351 tests passed.
- `pnpm typecheck`: passed for engine, shared, server, and client.
- Production client build: passed with 202 modules transformed.
- Test catalog: 256 pass, 0 fail, 0 waived, 0 pending.
- `git diff --check`: passed for task files.

Known limitations:

- Table overlay markup and the action cluster remain in `Table.tsx` for `TABLE-003`.
- Hand draw-flash animation remains local; presentation-event/queue consolidation belongs to later PRES tasks.
- Audio manager, concurrency limits, preload/fallback, and new sounds remain deferred to `SFX-001`.

Follow-up:

- `TABLE-003` — Presentational extraction and cleanup.

---

## TABLE-003 — Presentational extraction and cleanup

Status: completed | Owner: Codex | Reviewer: Claude | Estimate: 1 day | Risk: Medium

### Objective

Leave `Table.tsx` as a composition layer by extracting action cluster, utility rail, and overlays.

### Acceptance criteria

- No gameplay behavior changes.
- Desktop and compact DOM anchors remain stable for effects.
- Component props are typed view models rather than broad store access.

### Tests and verification

- Rendering and mobile viewport tests.
- Anchor/effect regressions.
- Client suite, typecheck, and build.

### Completion report

Completed at: 2026-08-21
Commit: `d737611` (`TABLE-003-extract-table-presentation`)
Status: completed

Changed:

- Added `TableControls` with a discriminated action view model for hidden, confirm, discard, and end-phase states.
- Moved the utility rail and its complete SFX preference popover behind a focused callback-only interface.
- Added `TableOverlays` and `TableRecoveryPanel` with grouped typed presentation models and no game-store access.
- Preserved overlay sibling order, fixed geometry, compact/desktop anchors, Thai copy, close-before-submit behavior, and diagnostics ordering.
- Reduced `Table.tsx` to 326 lines while keeping board/controller composition there.
- Added focused rendering tests for action priority, disabled states, utility preferences, overlay ordering, recovery commands, and diagnostics.

Verification:

- Focused TABLE-003 tests: 2 files and 9 tests passed.
- Client suite: 25 files and 188 tests passed, including 67 Table regressions and all mobile viewport/anchor checks.
- Engine suite: 40 files and 1,114 tests passed.
- Server suite: 3 files and 58 tests passed.
- Total: 68 files and 1,360 tests passed.
- `pnpm typecheck`: passed for engine, shared, server, and client.
- Client production build: passed with 204 modules transformed.
- No gameplay, CSS, responsive layout, DOM-anchor, or visual behavior changes; screenshots were intentionally omitted because this task only reorganized code.

Limitations and follow-up:

- `GameBoard`, draw-card animation state, and controller composition intentionally remain in `Table.tsx`.
- Presentation-event queuing, anchor retry, new effects, and sound expansion remain in `PRES-*`, `FX-*`, and `SFX-*`.

---

## ASSET-001 — Typed general-art manifest

Status: completed | Owner: Codex | Reviewer: Claude inventory | Estimate: 1.5 days | Risk: Medium

### Objective

Replace scattered filename/layout mappings with a complete typed manifest for all 25 generals.

### Current behavior

- Portrait/full-body paths are inferred from a filename-stem map while action paths and Lu Bu layout live in separate maps.
- Resolver inputs are defensive strings and unknown/hidden generals return no character art.
- The general-art directory contains 125 selected files plus four unmapped Dian Wei/Xu Chu files with no explicit inventory status.

### Expected behavior

- One typed manifest explicitly records all five approved paths and action layout metadata for every playable general.
- Runtime resolvers keep their existing safe string interface and fallback behavior.
- Tests reconcile the manifest with the Engine roster and on-disk inventory, including deliberate unmapped files.

### In scope / allowed files

- `packages/client/src/data/generalArt.ts`
- `packages/client/src/data/generalNames.ts` only for a derived playable-general ID type
- `packages/client/tests/generalArt.test.ts`
- `packages/client/tests/generalData.test.ts` only if roster typing needs coverage
- `docs/hardening/TASKS.md`, `PROGRESS.md`, and `DECISIONS.md`

### Out of scope / forbidden files

- No additions, edits, renames, or deletion under `packages/client/public/assets/**`.
- No Engine, Shared, Server, protocol, gameplay, Table/controller, CSS, or DOM changes.
- No package dependency/configuration changes and no Thai name/skill copy changes.
- Do not stage the pre-existing `packages/client/src/App.tsx` line-ending-only change.

### Type or protocol changes

- Add a client-only `GeneralId` string union derived from the display roster.
- Add template-literal asset-path types and an exhaustive general-art manifest.
- No wire, Zod, Engine state, or server protocol changes.

### Implementation steps

1. Freeze the 25-general roster and define the typed manifest interface.
2. Add completeness, filesystem, inventory-exclusion, fallback, version, and layout tests.
3. Replace the filename/action/layout maps with one explicit manifest while preserving resolver exports.
4. Run focused and full verification, then record the selected paths and unmapped inventory.

### Edge cases

- `none` and an empty/unknown ID must not reveal character art.
- Invalid factions continue to use the independent background; a known general still uses the caller-supplied background faction.
- Action loading fallback remains full-body then portrait and never blocks gameplay.
- Guo Jia attack v2, Liu Bei hit v3, Guan Yu hit v2, and all three Lu Bu layouts remain explicit.
- Dian Wei/Xu Chu files remain on disk but are deliberately excluded because they have no registered Engine general.

### Acceptance criteria

- Every general has portrait, full-body, attack, hit, and skill resolution with documented fallback.
- Canonical paths exist on disk.
- Superseded or unmapped assets are reported, not silently selected.

### Tests and verification

- Manifest completeness and filesystem existence tests.
- Fallback and Lu Bu normalization tests.
- Client suite and build.

### Completion report

Completed at: 2026-08-21
Commit: `da0f7ad` (`ASSET-001-add-typed-general-art-manifest`)
Status: completed

Changed:

- Derived the client `GeneralId` union from the canonical display roster and made faction coverage compile-time exhaustive.
- Replaced separate filename, pose, and layout maps with one typed manifest containing 25 generals and 125 explicit approved paths.
- Preserved the public resolver interface and all hidden/unknown/faction fallback behavior, so production callers required no changes.
- Kept Guo Jia attack v2, Liu Bei hit v3, Guan Yu hit v2, and Lu Bu's three normalized layouts explicit.
- Declared Dian Wei and Xu Chu portrait/full-body files as four known unmapped assets without selecting, deleting, or modifying them.
- Added test-time roster and filesystem reconciliation so missing, extra, renamed, or silently superseded art fails verification.

Verification:

- Focused manifest/roster/combat/player-art verification: 5 files and 35 tests passed.
- Client suite: 25 files and 192 tests passed.
- Engine suite: 40 files and 1,114 tests passed.
- Server suite: 3 files and 58 tests passed.
- Total: 68 files and 1,364 tests passed.
- `pnpm typecheck`: passed for engine, shared, server, and client.
- Client production build: passed with 204 modules transformed.
- No UI, CSS, DOM, gameplay, protocol, or artwork-file changes; screenshots were intentionally omitted.

Limitations and follow-up:

- Runtime image decode/network failure remains non-blocking and continues to use the existing full-body fallback in combat presentation.
- Dian Wei and Xu Chu remain inventory-only until matching Engine generals are deliberately added in a future scoped task.
- Presentation event mapping and preload/queue behavior remain in `PRES-001` and `PRES-002`.

---

## PRES-001 — Presentation-event model and queue

Status: completed | Owner: Codex | Reviewer: Claude event audit | Branch: main | Dependencies: LEGAL-004, ASSET-001 | Estimate: 1.5 days | Risk: High

### Objective

Translate structured game logs into typed, ordered, deduplicated presentation events managed by a non-blocking queue.

### Current behavior

- Combat effects and table sounds independently diff raw game-log counts.
- Combat presentation derives semantic meaning, DOM anchors, artwork, and animation timing in one hook.
- Count-only diffing cannot distinguish a safe append from a same-length replacement and does not deduplicate overlapping snapshots by stable event identity.
- Initial mount is silent, while sound routing separately owns match and reconnect baselines.

### Expected behavior

- One pure module maps supported structured logs to a typed presentation-event union.
- One queue hook owns silent baselines, authoritative array ordering, stable-ID dedupe, rollback/match reset, and per-event failure isolation.
- Combat presentation consumes queued semantic events while preserving existing anchors, artwork, timing, reduced-motion behavior, and visual output.
- Table sound keeps its existing snapshot/reconnect baseline until SFX-001; gameplay never waits for presentation work.

### In scope / allowed files

- `packages/client/src/presentation/presentationEvents.ts`.
- `packages/client/src/hooks/usePresentationQueue.ts`.
- Targeted integration edits to `packages/client/src/hooks/useCombatPresentation.ts` and `packages/client/src/screens/Table.tsx`.
- Narrow `useTableSfx.ts` edits only if typed log-event consumption can preserve its discard, turn, and reconnect behavior exactly.
- Focused client tests for the event model, queue, combat adapter, and existing sound baseline.
- `docs/hardening/TASKS.md`, `docs/hardening/PROGRESS.md`, and a narrowly scoped decision record if implementation creates a durable new architectural decision.

### Out of scope / forbidden files

- Engine log generation, Shared schemas/protocols, Server, Zustand store, sockets, reconnect flow, answers, turns, and legal actions.
- UI markup, CSS, DOM anchor names/placement, artwork/assets, audio synthesis/preferences, and new visual or sound effects.
- Anchor retry and expanded reconnect/reduced-motion hardening, which remain in PRES-002.
- `packages/client/src/App.tsx`, including its pre-existing line-ending-only worktree change.

### Type or protocol changes

- Add a client-only discriminated `PresentationEvent` union for `draw`, `skill`, `damage`, `hpLoss`, `dodge`, `heal`, and `death`.
- Normalize damage/dodge recipients as `targetId` and optional scalar `data.sourceId` as `sourceId`.
- Use match-scoped semantic IDs in the form `${matchId}:${logId}:${kind}`; visual phase IDs append their own suffixes.
- Do not change wire schemas or import Engine runtime code into the client.

### Implementation steps

1. Add red tests for event mapping, stable IDs, authoritative order, unsupported logs, optional fields, and malformed data.
2. Add red tests for initial silence, multi-log batches, overlapping snapshots, duplicate IDs, visible ID gaps, same-length replacement, rollback, match reset, per-event failures, and unmount cleanup.
3. Implement the pure typed mapper without localized labels, artwork, DOM coordinates, or animation timing.
4. Implement the queue lifecycle without sorting log IDs or awaiting presentation from gameplay/network paths.
5. Migrate combat presentation to queued semantic events and retain its adapter responsibilities and existing external behavior.
6. Run focused tests, the full client/engine/server suites, root typecheck, production build, and scoped diff review.

### Edge cases

- `log_10` must follow `log_9` by received array position, never lexical sorting.
- Private-log projection may leave valid raw-ID gaps.
- Duplicate raw IDs keep the first mapped semantic event and do not replay.
- Same-match non-prefix replacement or truncation silently clears pending work and establishes a new baseline.
- Rematches may reuse `log_0`; match-scoped IDs prevent cross-match collisions.
- Unknown event types, absent optional fields, empty `sourceId`, missing actors/anchors, and presenter errors fail safely.
- StrictMode replays, rapid snapshots, rejected presenter promises, and timer callbacks after unmount must not duplicate work or affect gameplay.

### Acceptance criteria

- Stable event IDs and ordering.
- Multiple logs in one snapshot queue correctly.
- Initial mount does not replay prior history.
- Queue errors do not affect gameplay.

### Tests to add

- Pure mapper coverage for all seven event kinds, unknown events, optional data, match-scoped IDs, and deterministic order.
- Queue coverage for rich initial snapshot silence, three-or-more appended events, overlap/dedupe, ID gaps, duplicate IDs, same-length replacement, rollback, match change, error continuation, and unmount cleanup.
- Combat adapter regression coverage for travel-to-hit, dodge, heal, skill, death, pose priority, reduced motion, rollback/reset, and visual child IDs.
- Retain the table-SFX reconnect and snapshot-delta regression suite.

### Verification commands

- `pnpm --filter @tktw/client exec vitest run tests/presentationEvents.test.ts tests/usePresentationQueue.test.tsx tests/useCombatPresentation.test.tsx tests/useTableSfx.test.tsx`.
- `pnpm --filter @tktw/client test -- --run`.
- `pnpm --filter @tktw/engine test -- --run`.
- `pnpm --filter @tktw/server test -- --run`.
- `pnpm typecheck`.
- `pnpm --filter @tktw/client build`.

### Completion report

Changed files:

- Added `packages/client/src/presentation/presentationEvents.ts`, the client-only seven-kind discriminated event model and authoritative-order mapper.
- Added `packages/client/src/hooks/usePresentationQueue.ts`, which owns silent baseline, stable-ID dedupe, cadence, reset, disposal, and per-event error isolation.
- Migrated `useCombatPresentation.ts` and its Table integration to queued typed events while retaining its DOM-anchor, approved-artwork, timing, pose-priority, and reduced-motion responsibilities.
- Added `presentationEvents.test.ts` and `usePresentationQueue.test.tsx`; updated combat regressions for match-scoped semantic/visual IDs.
- Expanded this task specification and progress record before implementation.

Behavior and type results:

- Supported public logs now map to `draw | skill | damage | hpLoss | dodge | heal | death` events with match-scoped IDs.
- Queue order follows the received array, so `log_10` cannot be lexically moved before `log_9`; valid projected-ID gaps remain safe.
- Initial history, match change, non-prefix replacement, truncation, and missing snapshots establish a silent baseline/reset rather than replaying history.
- Overlapping snapshots and duplicate semantic IDs present once; presenter throws/rejections are reported best-effort and never stop cadence or gameplay.
- Existing sound reconnect/discard/turn behavior remains unchanged and separately owned until SFX-001.

Tests added:

- 3 mapper tests covering all seven kinds, match-scoped IDs, received ordering, optional fields, unsupported events, and malformed entries.
- 6 queue tests covering initial silence, multi-log batching, gaps, dedupe, duplicate IDs, replacement, rollback, match reset, missing snapshot, throw/reject continuation, and unmount cleanup.
- Existing 12 combat, 3 sound, and 67 Table regressions remain green.

Verification results:

- Focused presentation/SFX suite: 4 files and 24 tests passed.
- Client suite: 27 files and 201 tests passed.
- Engine suite: 40 files and 1,114 tests passed.
- Server suite: 3 files and 58 tests passed.
- Total: 70 files and 1,373 tests passed.
- `pnpm typecheck`: passed for Engine, Shared, Server, and Client.
- Client production build: passed with 206 modules transformed.
- `git diff --cached --check`: passed before commit.
- No UI, DOM, CSS, artwork, gameplay, protocol, or sound behavior changed; screenshots were intentionally omitted.

Commit:

- `5259d14` (`PRES-001-add-presentation-event-queue`).

Limitations and follow-up:

- Missing DOM anchors still drop the visual cue immediately; bounded retry and reconnect/reduced-motion hardening remain PRES-002.
- Table sound retains its proven independent reconnect baseline and raw snapshot diff until SFX-001 adopts the event model without weakening malformed-log compatibility.
- The queue intentionally does not await presenter promises; future animation adapters must keep their own visual lifetime and cleanup local.

---

## PRES-002 — Anchor retry, reconnect, and reduced motion

Status: completed | Owner: Codex | Reviewer: Claude | Branch: main | Dependencies: PRES-001 | Estimate: 1 day | Risk: Medium

### Objective

Make presentation reliable across layout mounts, reconnects, compact/desktop anchors, and reduced motion.

### Current behavior

- `usePresentationQueue` handles initial/match/rebuilt snapshots but does not know connection lifecycle, so the first fresh view after a live reconnect can replay logs accumulated while disconnected.
- `useCombatPresentation` resolves target/source DOM anchors once; a temporarily unmounted desktop/mobile anchor drops the effect permanently.
- Reduced motion already omits travel and CSS particles while retaining outcome content, but only damage has focused hook coverage.
- Mobile may expose duplicate anchors for a focused opponent or self; the current resolver uses the first DOM match.

### Expected behavior

- The existing queue owns disconnect/reset, waits through the same stale snapshot, silently baselines the first fresh snapshot, and emits only later appends.
- The combat adapter retries required target anchors and declared non-reduced-motion source anchors on a bounded cadence, re-reading geometry every attempt.
- A target appearing within the bound receives exactly one effect; a source that remains missing degrades to a target-only outcome; a missing target fails harmlessly.
- Reduced motion never waits for or renders travel, yet preserves damage/heal numbers, dodge/skill/death text, and the existing approved pose/output behavior.
- Existing first-usable anchor selection and all desktop/mobile DOM structures remain unchanged.

### In scope / allowed files

- `packages/client/src/hooks/usePresentationQueue.ts` and `packages/client/tests/usePresentationQueue.test.tsx`.
- `packages/client/src/hooks/useCombatPresentation.ts` and `packages/client/tests/useCombatPresentation.test.tsx`.
- Targeted integration edit to `packages/client/src/screens/Table.tsx`.
- Narrow semantic-output regression additions to `CombatEffectLayer.test.tsx` only if needed; production `CombatEffectLayer.tsx`/CSS only if a proven meaning gap exists.
- `docs/hardening/TASKS.md`, `docs/hardening/PROGRESS.md`, and a narrowly scoped decision record if required.

### Out of scope / forbidden files

- Engine, Shared, Server, store/socket/rejoin flow, gameplay, decisions, legal actions, and `packages/client/src/App.tsx`.
- `useTableSfx`, sound behavior/preferences, the presentation-event union/mapper, artwork/assets, and new effects.
- GameBoard, PlayerTile, SelfDock, compact/desktop anchor markup, anchor priority, layout, CSS, z-index, and responsive redesign.
- Unbounded polling, MutationObserver infrastructure, generic anchor registries, or a new one-consumer anchor module.

### Type or protocol changes

- Add required connection state to the existing presentation-queue options interface.
- Change the combat hook to one grouped options interface containing `connected`, `matchId`, `logs`, and `players`.
- No wire, Engine, Shared schema, event-union, store, or DOM-attribute change.

### Implementation steps

1. Add red queue tests for disconnect cancellation/reset, same stale snapshot, silent first fresh snapshot, and later append delivery.
2. Add red combat tests for delayed target/source anchors, bounded failure/fallback, timer cancellation, duplicate/zero-area anchor behavior, and reduced-motion meaning.
3. Deepen queue reconnect lifecycle using snapshot identity rather than log count/IDs alone.
4. Deepen combat presentation with a private bounded retry policy and shared existing timer ownership.
5. Pass connection state from Table without changing rendered markup or gameplay orchestration.
6. Run focused and full verification, inspect the scoped diff, record completion, commit, and push.

### Edge cases

- The board remains mounted under `ReconnectingOverlay`; reconnect may set `connected=true` before a fresh `GameView` arrives.
- Initial disconnected mount must wait for fresh data; pending queue items and active/retry effects cancel once on disconnect.
- First fresh reconnect logs may be an exact-prefix append and must still baseline silently.
- Target/source nodes may be detached, zero-area, appear on the final retry, or disappear again between attempts.
- Mobile duplicate anchors remain first-usable by DOM order; PRES-002 does not choose largest or focused anchors.
- Source absent after the bound produces no travel but still one target outcome; target absent produces nothing.
- Reduced motion does not retry an unused source and must not invent an amount for malformed events.
- Match reset, log rollback, disconnect, StrictMode replay, and unmount must cancel retry/queue timers safely.

### Acceptance criteria

- Bounded anchor retries.
- Reconnect resumes from the new baseline.
- Reduced motion preserves labels/numbers without travel particles.

### Tests to add

- Queue reconnect lifecycle tests with fake timers and snapshot identity.
- Combat target/source retry, timeout fallback, reset/unmount cleanup, first-usable anchor, and desktop/mobile coordinate tests.
- Reduced-motion regressions for damage, dodge, heal, skill, and death outcome meaning with no travel.
- Retain existing presentation mapper/queue/combat/SFX/Table regressions.

### Verification commands

- `pnpm --filter @tktw/client exec vitest run tests/usePresentationQueue.test.tsx tests/useCombatPresentation.test.tsx tests/CombatEffectLayer.test.tsx tests/useTableSfx.test.tsx`.
- `pnpm --filter @tktw/client test -- --run`.
- `pnpm --filter @tktw/engine test -- --run`.
- `pnpm --filter @tktw/server test -- --run`.
- `pnpm typecheck`.
- `pnpm --filter @tktw/client build`.

### Completion report

Changed files:

- Deepened `usePresentationQueue.ts` with connection lifecycle: disconnect cancellation/reset, stale-snapshot waiting, and silent first-fresh baselining by logs-array identity.
- Deepened `useCombatPresentation.ts` with a grouped options interface and private target/source anchor retry policy: initial lookup plus four 50 ms retries.
- Kept first usable nonzero connected anchor selection, existing desktop/mobile geometry, pose/art/timing policy, and reduced-motion output local to the combat adapter.
- Passed `connected` from Table without changing its rendered markup or gameplay orchestration.
- Expanded queue and combat tests for reconnect, bounded retry/fallback, duplicate/zero-area anchors, cleanup, and every reduced-motion outcome.

Behavior and type results:

- Pending and active presentation cancels once when connection drops; reconnecting against the retained stale `GameView` cannot replay or advance the queue.
- The first different logs snapshot after reconnect establishes a silent baseline even when it contains exact-prefix appends; only later appends present.
- Temporarily absent required target/source anchors are re-read through 200 ms; target absence drops harmlessly, while source absence degrades to one immediate target-only outcome.
- Detached/zero-area matches are skipped, while duplicate mobile anchors retain current first-usable DOM order.
- Reduced motion performs no source retry or travel and retains damage/heal numbers, dodge text, skill label, and death outcome through the existing effect model/CSS.
- No generic anchor module, MutationObserver, store/socket change, sound change, DOM edit, or new effect was introduced.

Tests added:

- 2 queue reconnect tests covering pending cancellation, stale snapshot waiting, silent fresh baseline, later resume, and initial disconnected mount.
- 7 combat cases covering delayed target, delayed source, source timeout fallback, reset/unmount cleanup, zero-area duplicate selection, and all reduced-motion outcomes.
- Existing mapper, SFX reconnect, CombatEffectLayer, Table, desktop, and mobile regressions remain green.

Verification results:

- Focused presentation/SFX suite: 4 files and 34 tests passed.
- Client suite: 27 files and 210 tests passed.
- Engine suite: 40 files and 1,114 tests passed.
- Server suite: 3 files and 58 tests passed.
- Total: 70 files and 1,382 tests passed.
- `pnpm typecheck`: passed for Engine, Shared, Server, and Client.
- Client production build: passed with 206 modules transformed.
- `git diff --cached --check`: passed before commit.
- No UI, CSS, DOM, artwork, gameplay, protocol, or sound behavior changed; screenshots were intentionally omitted.

Commit:

- `e3f0525` (`PRES-002-harden-presentation-lifecycle`).

Limitations and follow-up:

- Duplicate mobile anchors deliberately retain first-usable DOM order; choosing focused/largest anchors would be a separate visual-layout decision.
- The 200 ms retry bound is intentionally fixed and private; room presentation pacing settings may expose a broader policy only if later effect work proves a need.
- Audio concurrency, preload/fallback, and autoplay recovery remain SFX-001.

---

## SFX-001 — Audio manager and preferences

Status: completed | Owner: Codex | Reviewer: Claude event inventory | Branch: main | Dependencies: PRES-001 | Estimate: 1.5 days | Risk: Medium

### Objective

Centralize sound categories, preload/fallback, volume, mute, and concurrency limiting.

### Current behavior

- `lib/sfx.ts` owns synthesized note definitions but uses module-level procedural helpers and a global raw `AudioContext`.
- Context construction, node creation, connection, start/stop, and `resume()` failures can escape; rejected resume promises are not observed.
- Playback schedules immediately even when the context remains suspended, and each repeated sequence can create two or three more voices without a cap.
- There is no user-gesture recovery owner, logical-effect cleanup, or deterministic Web Audio test seam.
- The preference store persists mute/volume and the existing Table control edits them, but storage writes and non-finite volume input can still throw/corrupt state.

### Expected behavior

- One deep SFX manager owns lazy context creation, logical-effect playback, autoplay recovery, concurrency/priority, cleanup, and all failure isolation.
- One synthesized sequence counts as one logical effect even when it contains multiple oscillator notes.
- Global and repeated-name limits bound overlap; high-importance result/death cues may evict older lower/equal-priority effects while low-priority cues cannot evict protected cues.
- A blocked sound is dropped and never replayed later; pointer/keyboard interaction only unlocks the context for future sounds.
- Unsupported Web Audio, context/node/resume/start/stop/listener failures, mute/zero volume, and storage failure remain harmless.
- Existing Result, Table SFX routing, and utility-rail UI behavior remain unchanged.

### In scope / allowed files

- `packages/client/src/lib/sfx.ts` and `packages/client/tests/sfx.test.ts`.
- `packages/client/src/store/sfxStore.ts` and `packages/client/tests/sfxStore.test.ts` for safe preference validation/persistence.
- Narrow caller/test typing edits to `useTableSfx.ts`, `Result.tsx`, or their tests only if the manager seam requires them while preserving behavior.
- `docs/hardening/TASKS.md`, `docs/hardening/PROGRESS.md`, and a narrowly scoped audio decision record.

### Out of scope / forbidden files

- New audio assets, licensing/downloads, music, spatial audio, voice chat, haptics, or changing synthesized melodies.
- Engine, Shared, Server, game store/socket flow, presentation ordering, gameplay, legal actions, and `packages/client/src/App.tsx`.
- Table controls markup/CSS/layout, preference UX redesign, mobile/desktop layout, new sound event categories, and reconnect-routing changes.
- An audio queue that replays blocked history, an unbounded pending list, or multiple one-consumer preload/limiter modules.

### Type or protocol changes

- Replace raw helpers with a client-only `SfxManager` interface and narrow audio-driver/voice seam used by the real Web Audio adapter and deterministic fake tests.
- Keep the existing `SfxName` union and `playSfx(name): void` caller interface stable.
- Add no wire, Engine, Shared, store/socket, gameplay, or persisted-storage schema change.

### Implementation steps

1. Add red fake-driver tests for lazy creation, preference gating/scaling, logical sequences, global/per-name limits, priority eviction, and cleanup.
2. Add red autoplay tests for suspended context, resume rejection, gesture unlock, no blocked replay, and listener disposal.
3. Add red failure-isolation tests for unavailable/throwing context, node/play/stop failures, and storage errors/non-finite volume.
4. Implement one manager with private synth definitions and a production Web Audio adapter; retain `playSfx` as the compatibility adapter.
5. Harden preference persistence without changing control markup or stored field names.
6. Run focused/full verification, inspect scoped diff, record completion/decision, commit, and push.

### Edge cases

- `AudioContext`/`webkitAudioContext` may be absent, throw on construction, be suspended/closed, or reject `resume()` asynchronously.
- Rapid logs can request many multi-note effects in one render; each sequence must consume one logical slot and active counts must release exactly once.
- `onended`, explicit eviction, dispose, partial node construction, and stop/disconnect exceptions may race; cleanup must be idempotent.
- Multiple plays while one resume is pending must not create a blocked backlog or burst after unlock.
- Pointerdown/keydown recovery listeners must arm at most once, remove after success/dispose, and tolerate document/listener failures.
- Mute/zero volume must avoid context creation; volume must be finite and clamped before reaching gain values.
- Local storage may be absent, contain malformed JSON/fields, or throw on read/write.

### Acceptance criteria

- One manager owns playback.
- Repeated events cannot create unbounded overlapping audio.
- Browser autoplay restrictions fail silently and recover after user interaction.

### Tests to add

- Fake audio-driver manager tests for all named sounds, note grouping, volume, limits, priority, end cleanup, dispose, and unsupported/throwing paths.
- Fake interaction/resume tests for rejection, one armed listener, future-play recovery, and blocked-sound non-replay.
- Preference-store tests for malformed/non-finite values and read/write failure fallback.
- Retain Table SFX reconnect/routing, Result win/lose, Table controls, and full client regressions.

### Verification commands

- `pnpm --filter @tktw/client exec vitest run tests/sfx.test.ts tests/sfxStore.test.ts tests/useTableSfx.test.tsx tests/result.test.tsx tests/TableControls.test.tsx`.
- `pnpm --filter @tktw/client test -- --run`.
- `pnpm --filter @tktw/engine test -- --run`.
- `pnpm --filter @tktw/server test -- --run`.
- `pnpm typecheck`.
- `pnpm --filter @tktw/client build`.

### Completion report

- Replaced module-level Web Audio helpers with one `SfxManager` that owns lazy driver creation, preference gating, autoplay recovery, logical-effect limits, priority eviction, and idempotent cleanup.
- Retained all ten synthesized sound definitions and the stable `playSfx(name): void` caller seam; no audio assets, UI, gameplay, routing, or wire types changed.
- Blocked sounds are discarded rather than queued. One pointer/keyboard listener unlocks the context for future sounds and observes both synchronous and asynchronous resume failures.
- Added global/per-name logical-effect bounds. Multi-note sequences consume one slot, high-priority result/death sounds are protected from low-priority bursts, and ended/evicted effects release resources once.
- Hardened preference loading/writing for malformed JSON, unavailable/quota-limited storage, non-finite volume, and finite clamping while retaining the `tktw_sfx` schema.
- Added deterministic fake-driver coverage for 14 focused manager/store cases; the complete baseline is 70 files / 1,390 tests.
- Verification passed: focused SFX tests, full client/engine/server regressions, root typecheck, and client production build (206 modules). No screenshot was required because markup, CSS, and visible controls did not change.

---

## FX-001 — Card and equipment motion

Status: completed | Owner: Codex | Reviewer: Claude scenarios | Branch: main | Dependencies: PRES-002 | Estimate: 2 days | Risk: Medium

### Objective

Add draw, play, discard, steal, equip/loss, delayed-trick, and Wugu movement using the presentation queue.

### Current behavior

- Drawn cards only flip into the local hand via a Table snapshot diff; other players receive no directional draw cue.
- Combat presentation has bounded player-anchor retry, reconnect baselines, and reduced-motion meaning, but card movement has no typed event or lifecycle owner.
- Structured logs cover draw, discard, equip, delayed placement, Wugu, steal, and several equipment-loss cases unevenly. Ordinary basic/trick play has no durable log, and some public movement logs omit source/destination metadata.
- Board DOM exposes player anchors but not semantic hand/equipment/judgment/draw/discard/table/Wugu anchors.

### Expected behavior

- One deep card-motion presentation module consumes typed, match-scoped queue events and owns semantic-anchor lookup, bounded retry, reduced-motion fallback, overlap limits, reset, and cleanup.
- Draw, ordinary play, over-limit/forced discard, anonymous steal, equip/replacement/loss, delayed placement/forward, and Wugu reveal/pick communicate source and destination without blocking controls.
- Hidden hand movement uses an anonymous card back/count; exact card identity is rendered only when already public in the projected log/state.
- Missing anchors drop or degrade harmlessly after a bound; reconnect/rebuild baselines remain silent; reduced motion shows a short destination cue without travel.

### In scope / allowed files

- Client presentation event model/queue, a new card-motion hook and visual layer, their focused tests, Table overlay wiring, semantic `data-*` anchors in existing board/card modules, and narrowly scoped CSS.
- Narrow Engine structured-log metadata for ordinary card play and already-public movement source/destination/card fields, plus matching engine/client log tests and friendly history copy.
- `docs/hardening/TASKS.md`, `PROGRESS.md`, and `DECISIONS.md`.

### Out of scope / forbidden files

- Gameplay legality/effects/order, legal actions, decisions, network timing, room/store/socket lifecycle, Database/User/Score, new assets, sound design, combat/skill sequence redesign, or `packages/client/src/App.tsx`.
- Revealing hidden hand card IDs/types, deriving movement from private client snapshots for other players, awaiting animation before answers, or unbounded animation queues/retries.
- Replacing the presentation queue, merging combat/SFX into a universal timeline, redesigning Table layout, or changing existing controls/modal interaction.

### Type or protocol changes

- Extend the client-only `PresentationEvent` discriminated union with semantic card-motion events and typed source/destination zone references.
- Keep wire schemas backward-compatible: Engine log `eventType` remains string and optional movement metadata uses existing optional scalar/card/target fields.
- Add no new answer/action/store protocol and no gameplay-domain enum; unknown/malformed logs continue to map to no event.

### Implementation steps

1. Add mapper red tests for every supported movement category, stable IDs/order, anonymous hidden movement, malformed logs, and multiple events from one authoritative entry where needed.
2. Add hook red tests for initial/reconnect silence through the existing queue, semantic anchor resolution, bounded retry, missing-anchor fallback, overlap cap, reset/unmount cleanup, and reduced motion.
3. Add layer red tests for public art vs anonymous back, count/labels, pointer transparency, reduced cue, and fragment/portal behavior.
4. Add only the missing public structured-log metadata and semantic DOM anchors; preserve gameplay mutations and hidden-information projection.
5. Wire the hook/layer through typed Table overlays, add responsive CSS, and capture changed desktop/mobile UI states.
6. Run focused/full client/engine/server tests, root typecheck, production build, diff review, documentation, commit, and exact-range push approval.

### Edge cases

- Initial mount, match change, reconnect stale snapshot, first fresh snapshot, replay rollback, duplicate log IDs, and projected private-log gaps must remain silent/deduplicated as defined by PRES-001/002.
- A source or destination anchor may mount late, be detached/zero-size, or exist twice in compact mode; retain first usable semantic anchor and fall back to the existing player anchor where safe.
- Wugu/modal anchors may disappear before a queued pick, a player can die while effects are active, and multiple movements may arrive in one snapshot.
- Discard/steal may be intentionally anonymous; public equipment/delayed/Wugu cards may show known art, while failed art loads fall back to a glyph/card back.
- Reduced motion must preserve meaning at the destination without translating across the viewport.
- Motion layers must be `pointer-events:none`, bounded in active count, timer-safe after unmount, and unable to cover or delay hand/action controls.

### Acceptance criteria

- Motions communicate source and destination.
- Hand/action controls remain usable.
- Missing anchors and reduced motion have safe fallbacks.

### Tests to add

- Event/component tests for every motion category, compact layout, failed anchor, reduced motion, and queue overlap.

### Verification commands

- Focused client presentation/motion/Table overlay suites and narrow Engine movement-log contracts.
- `pnpm --filter @tktw/client test`, `pnpm --filter @tktw/engine test`, and `pnpm --filter @tktw/server test`.
- `pnpm typecheck` and `pnpm --filter @tktw/client build`.
- Desktop 1440×900 and mobile landscape 932×430 screenshots for draw/play/equip plus DOM anchor/count assertions.

### Completion report

- Added typed, match-scoped movement events for draw, play, discard, anonymous steal, equip/replacement/loss, delayed tricks, and Wugu reveal/pick.
- Added one deep reconnect-safe motion controller with bounded semantic-anchor retry, destination fallback, reduced-motion meaning, active-effect cap, and timer cleanup.
- Added a pointer-transparent portal layer with public card art and anonymous card backs, plus semantic anchors across draw/discard/table/Wugu and player hand/equipment/judgment zones.
- Hardened Engine public logs only where presentation metadata was missing. Hidden stolen-hand identities are no longer published by Shunshou or Tuxi logs.
- Verified Client 29/227, Engine 40/1,114, Server 3/58, root typecheck, production build (208 modules), and git diff --check.
- Desktop/mobile screenshot capture was attempted but the in-app browser runtime rejected its own browser service before page connection. Responsive Table tests at 932×430, 844×390, and 740×360, layer DOM/class tests, and pointer-transparency assertions passed; no screenshot artifact was fabricated.

---

## FX-002 — Combat and skill sequences

Status: completed | Owner: Codex | Reviewer: Claude rules audit | Branch: main | Dependencies: FX-001, SFX-001 | Estimate: 2.5 days | Risk: High

### Objective

Present attack, response, hit, dodge, heal, skill, death, and multi-target actions as readable timelines.

### Current behavior

- Structured combat events already map to attack travel, hit, dodge, heal, skill, and death cues with approved general pose art and bounded anchor retry.
- The shared presentation queue dispatches every semantic event at a generic 90ms cadence. A Fangtian or other burst can start several attack poses before prior hits land.
- Pose priority suppresses some duplicate art, but sequence pacing, active-effect bounds, source/target labels, and sound timing are not one explicit contract.
- Reduced motion preserves outcomes, reconnect/rebuild snapshots are silent, and missing art/anchors already fail harmlessly.

### Expected behavior

- One combat timeline policy converts semantic events into bounded ordered phases: skill/attack, response, outcome, and death.
- Multi-target actions preserve received log order while completing quickly enough for live play; only one body pose per player is visible at a time.
- Directional cues and accessible labels make source/target unambiguous on desktop and compact layouts.
- Combat sounds fire with their visible phase rather than as an unrelated snapshot burst.
- Reduced motion removes travel while keeping ordered hit/dodge/heal/skill/death meaning and a shorter bounded cadence.

### In scope / allowed files

- Client combat presentation hook/layer, a narrow typed timeline policy if it earns depth, typed presentation/SFX adapters, Table wiring, focused CSS, and their tests.
- Narrow structured-log metadata only if a sequence cannot be identified from existing public fields.
- Hardening task/progress/decision documentation.

### Out of scope / forbidden files

- Gameplay order, damage/rule calculations, legal actions, server timing, decisions, socket/store lifecycle, room settings, new artwork/audio assets, judgment/Wuxie/turn/timer work reserved for FX-003, and `packages/client/src/App.tsx`.
- Awaiting animation/audio before game actions, replaying historical logs, revealing private hands/roles, or an unbounded universal animation timeline.
- Redesigning Table seats/controls, changing approved general art, or merging card motion and combat into one shallow event renderer.

### Type or protocol changes

- Prefer client-only discriminated timeline phases derived from existing `PresentationEvent`; no answer/action wire change.
- Existing `GameLogView` fields remain authoritative and received array order remains the ordering source.
- Public combat effect models may gain source/target labels and sequence metadata; malformed/unsupported events remain no-op.

### Implementation steps

1. Red→Green: multi-target damage order, bounded cadence, and one-pose invariant.
2. Red→Green: attack→dodge, skill→outcome, heal, death, and accessible source/target presentation.
3. Red→Green: phase-aligned sound routing without duplicate/replayed SFX.
4. Red→Green: reduced-motion cadence, missing art/anchor fallback, reset/reconnect, overlap cap, and cleanup.
5. Refactor only after Green, then run focused/full verification and changed-state visual QA.

### Edge cases

- Multiple appended logs in one snapshot, Fangtian three targets, repeated target, skill immediately followed by damage, and death following the final hit.
- Source/target anchor missing or duplicated on mobile; image failure; player list changing while phases remain active.
- Disconnect, first fresh snapshot, match change, rollback, StrictMode replay, unmount with pending phases, and SFX failure.
- Reduced motion must retain order and meaning without viewport travel; presentation must never delay gameplay/networking.

### Acceptance criteria

- Source/target are unambiguous.
- Pose priority prevents three-body/duplicate-pose artifacts.
- Multi-target actions remain ordered and fast enough for live play.

### Tests and verification

- Sequence/priority/multi-target tests, missing artwork fallback, mobile placement, reduced motion, and current combat regressions.
- Full client/engine/server suites, root typecheck, production build, diff check, and desktop/mobile changed-state screenshots when browser runtime is available.

### Completion report

- Reused the deep combat presentation hook as the timeline owner and added a regular 310ms / reduced-motion 90ms semantic-event cadence.
- Multi-target events retain received order, active combat nodes are capped at 10, and pose arbitration guarantees at most one visible pose per player while preserving attacker/target poses.
- Added visible and accessible source→target route labels with mobile-safe truncation and existing first-usable-anchor/fallback behavior.
- Moved combat/skill SFX ownership from snapshot arrival to visible outcome phases, eliminating duplicate burst audio while preserving draw/discard/turn snapshot cues.
- Added sequence, burst, phase-aligned sound, route-label, skill→damage→death, and duplicate-sound regressions; retained missing-art, mobile-placement, reconnect, reduced-motion, and Table coverage.
- Verified Client 29/232, Engine 40/1,114, Server 3/58, root typecheck, production build (208 modules), and git diff --check.
- Browser screenshot capture remains unavailable because the in-app browser plugin rejects its own service before local-page connection; responsive Table and component DOM/CSS tests passed and no screenshot was fabricated.

---

## FX-003 — Judgment, Wuxie, turn, and timer feedback

Status: complete | Owner: Codex | Reviewer: Claude scenario review | Branch: main | Dependencies: FX-002 | Estimate: 2 days | Risk: Medium

### Objective

Give judgment replacement, nested Wuxie, turn start, phase change, and urgent timer states distinct feedback.

### Current behavior

- The TurnPanel continuously shows turn/phase and changes the ring to red at five seconds, but turn/phase transitions have no bounded cue and urgency has no explicit class/live text contract.
- Judgment logs record only the final outcome; the initial revealed card and Sima Yi replacement are not durable public events, so presentation cannot distinguish them.
- Each Wuxie use is logged without nesting depth, and the outer chain has no explicit final effective/cancelled event.
- Combat/card presentation already provides silent baselines, bounded timers, reconnect safety, reduced motion, and pointer-transparent portal layers.

### Expected behavior

- Initial judgment reveal, replacement, and final result are distinct ordered cues using only public card information.
- Nested Wuxie shows increasing depth and one final effective/cancelled state for the original trick.
- Turn start and later phase changes show short non-modal cues once per actual snapshot transition; initial/reconnect/rebuild snapshots remain silent.
- The final five seconds expose a visible/accessible urgent state without blocking controls or restarting on rerender.

### In scope / allowed files

- Narrow Engine public structured-log metadata for judgment reveal/replacement and Wuxie depth/final result, with engine contract tests.
- Client typed presentation events, one deep table-feedback lifecycle hook, one pointer-transparent layer, TurnPanel urgency semantics, Table overlay wiring, focused CSS/tests, and hardening docs.

### Out of scope / forbidden files

- Judgment/Wuxie rules, trigger order, timeout duration/default answers, legal actions, server decision scheduling, room settings, gameplay sound vocabulary/assets, Table seat/control redesign, tutorial/assistance, and `packages/client/src/App.tsx`.
- Blocking decisions behind feedback, exposing private hands/roles, replaying history after reconnect, or adding a generic universal animation bus.

### Type or protocol changes

- Add client-only discriminated judgment/Wuxie presentation events and table feedback cues.
- Reuse optional scalar fields in the existing structured-log schema; no answer/action protocol change.
- Snapshot turn/phase feedback derives from authoritative `GameView`; received log array order remains authoritative.

### Implementation steps

1. Red→Green: log/map/render judgment reveal, then replacement, then final result.
2. Red→Green: add Wuxie depth and one outer final-result event for odd/even chains.
3. Red→Green: add reconnect-safe turn/phase transient cues with bounded timers and overlap.
4. Red→Green: expose urgent timer class/live copy with fake-clock tests and reduced-motion behavior.
5. Refactor only after Green, then run focused/full verification and changed-state visual QA.

### Edge cases

- Judgment without replacement, replacement declined, replacement artwork missing, repeated judgments, and result arriving after replacement.
- Zero/one/many Wuxie counters, odd/even final parity, converted Wuxie, nested recursion, and no-counter chains (no final banner).
- Initial mount, match change, rollback, reconnect stale/fresh view, simultaneous turn+prepare transition, rapid phase snapshots, unmount timers, and StrictMode.
- Missing/duplicate compact anchors are irrelevant to the central portal; all feedback remains pointer-transparent and bounded.
- Timer deadline absent/changed/expired, server clock skew, rerender at the same second, and reduced motion.

### Acceptance criteria

- Judgment replacement is visually distinguishable from the original reveal.
- Nested Wuxie resolves to a clear final state.
- Phase feedback does not repeatedly block interaction.

### Tests and verification

- Judgment/Wuxie depth tests, timer fake-clock tests, reduced-motion and mobile layering tests.
- Full client/engine/server suites, root typecheck, production build, diff check, and changed-state screenshots when browser runtime is available.

### Completion report

- Engine now emits public structured events for the revealed judgment card, Sima Yi replacement, each nested Wuxie depth, and one outer effective/cancelled result without changing trigger or parity rules.
- Client presentation maps those logs to typed events and one reconnect-safe lifecycle owner. Initial/rebuilt/reconnected history remains silent; active cues are timer-bounded, capped, pointer-transparent, and reduced-motion aware.
- The central table layer distinguishes reveal, replacement, result, Wuxie depth/final state, new turn, and later phase changes. A simultaneous new-turn/prepare snapshot produces only the turn cue.
- TurnPanel exposes `.is-urgent`, a visible assertive `ด่วน` label, and the existing red countdown at five seconds without replacing or restarting the authoritative deadline.
- Follow-up polish gives a successful Shandian judgment a dedicated target-anchored sky flash, bolt, impact ring, and sparks; misses stay banner-only and reduced-motion keeps a short static strike.
- Verification passed: client 31 files / 236 tests (including the 67-case Table integration suite), engine 40 / 1,116, server 3 / 58, root typecheck, client production build (210 modules), and diff check.
- Changed-state screenshot capture was attempted, but the in-app browser plugin rejected its own trusted service before connecting to the local page; no screenshot was fabricated. Component, mobile Table, portal, pointer-event, reduced-motion, and fake-clock tests passed.

---

## ROOM-001 — Typed room settings and presets

Status: completed | Owner: Codex | Reviewer: Claude server tests | Estimate: 1.5 days | Risk: Medium

### Objective

Define server-authoritative beginner, standard, fast, and bounded custom pacing settings.

### Current behavior

- Create/quickstart accepts only an optional 15–180 second decision timeout; the lobby currently hard-codes 30/60/90 second buttons.
- Grace (45s), role reveal (8s), and bot response delay (600ms) are server constants or server-wide test overrides, not one room-level contract.
- Only decision timeout is retained on `GameRoom`; there is no typed named preset or single resolved settings object for later lobby display.

### Expected behavior

- One strict shared discriminated union accepts `beginner`, `standard`, `fast`, or fully bounded `custom` pacing.
- Named presets resolve to complete immutable values for decision timeout, reconnect grace, role reveal, and bot response delay; Standard is byte-for-byte equivalent to current production pacing.
- A room stores one complete resolved selection for its whole lifetime. Explicit host selection wins over server defaults; absent selection continues to respect server test/deployment overrides.
- The legacy `decisionTimeoutSec` request remains accepted during ROOM-001 so the existing client keeps working until ROOM-002 migrates the UI.

### In scope / allowed files

- Shared room-setting types/Zod schemas/exports, server room settings storage/resolution, create/quickstart boundary wiring, timing lifecycle adapters, focused shared/server tests, and hardening docs.

### Out of scope / forbidden files

- Lobby/create UI, broadcasting settings to room members, changing settings after room creation, gameplay rules, engine timers, database/persistence, scoring/users, tutorial/assistance, CSS/assets/audio, and `packages/client/src/App.tsx`.

### Type or protocol changes

- Add `RoomPacingPreset`, strict `RoomSettingsSelection`, and resolved room pacing values.
- Add optional `settings` to create/quickstart input while retaining optional legacy `decisionTimeoutSec`; sending both is rejected.
- No game answer/action schema or Engine state change.

### Implementation steps

1. Red→Green strict preset/custom schema boundaries and canonical values.
2. Red→Green room storage/default/legacy resolution and rematch preservation.
3. Red→Green effective decision/reveal/grace/bot timing with explicit-room precedence and server-override fallback.
4. Run focused/full verification, document compatibility, commit, and push.

### Edge cases

- Unknown preset, missing/extra custom fields, NaN/fractional/out-of-range values, both new and legacy fields, and prototype-like unknown keys.
- Default room under server test overrides, explicit Standard under the same overrides, legacy decision-only override, quickstart, reconnect grace, reveal transition, and rematch.
- Exact optional-property typing, in-memory room lifecycle, invalid socket input before room mutation, and no client/UI migration in this task.

### Acceptance criteria

- Zod validates all settings.
- Presets do not alter core game rules.
- Defaults preserve current standard behavior.

### Tests and verification

- Schema boundary tests, create/quickstart invalid-input tests, timeout/bot/grace preset tests, server typecheck.

### Completion report

- Added one strict shared pacing contract with `beginner`, `standard`, `fast`, and complete bounded `custom` selections. Named presets resolve to immutable decision, reconnect-grace, reveal, and bot-delay values; Standard preserves the prior 30s/45s/8s/600ms production behavior.
- Create and quickstart now accept the typed `settings` envelope, reject ambiguous new-plus-legacy input before room mutation, and continue accepting legacy `decisionTimeoutSec` until ROOM-002 migrates the client.
- Every room stores a complete resolved pacing object plus whether the host selected it explicitly. The object survives return-to-lobby/rematch, and explicit selections override server-wide test/deployment timing while implicit Standard still permits those overrides.
- One server adapter converts seconds to milliseconds and supplies the same effective values to decision timeouts, reconnect forfeits, reveal timing, bot answers, and explicit leave continuation.
- Added schema boundary, room lifecycle, precedence, invalid socket mutation, legacy compatibility, quickstart, and Fast reveal E2E coverage. No client UI, gameplay rule, engine state, database, CSS, asset, or audio code changed.
- Verification passed: focused ROOM tests 3 files / 33 tests, server E2E 34 tests, full engine 40 files / 1,116 tests, server 4 / 67, client 32 / 241, root typecheck, production client build (211 modules), and diff check.
- No screenshot was required because ROOM-001 changes protocol/server behavior only and does not change rendered UI. Implementation commit: `f8c0c08` (`ROOM-001-add-typed-room-pacing`).

---

## ROOM-002 — Create/lobby UI and lifecycle preservation

Status: completed | Owner: Codex | Reviewer: Claude copy | Estimate: 1.5 days | Risk: Medium

### Objective

Expose presets in room creation and show the selected pacing to every lobby member while preserving it through rejoin/rematch.

### Current behavior

- Create/quickstart still sends the temporary legacy `decisionTimeoutSec` field from three 30/60/90 buttons, so the UI cannot select the complete ROOM-001 pacing contract.
- The create dialog does not distinguish beginner/standard/fast intent and has no bounded advanced editor for reconnect, reveal, or bot timing.
- `room:state` does not include the server-resolved selection, so joined/rejoined players cannot review the host's rules and the waiting room cannot prove rematch preservation.

### Expected behavior

- Create and quickstart send one typed `RoomSettingsSelection`; Standard is selected by default and matches current production timing.
- Beginner, Standard, and Fast are always visible with concise beginner-friendly timing summaries. A fully bounded Custom editor exists behind an explicitly collapsed advanced-settings disclosure.
- Every `room:state` contains the complete server-resolved settings. The waiting room shows the preset and key timings to hosts, joiners, and rejoined players before start and after return-to-lobby.
- Room settings remain immutable after creation in this phase; the server broadcast, not local form state, is the display authority.

### In scope / allowed files

- Shared room-state payload, server room-state assembly, client store create/quickstart signatures, Lobby create/waiting UI, a focused pacing presentation component/data helper if it earns reuse, narrow CSS, shared/server/client tests, and hardening docs.

### Out of scope / forbidden files

- Mid-lobby settings editing, host transfer policy, gameplay/engine rules, database/persistence, score/users, tutorial/onboarding flow, table/gameplay UI, sounds/effects/assets, package dependencies, and the unrelated `packages/client/src/App.tsx` worktree diff.

### Type or protocol changes

- Add required resolved `settings: ResolvedRoomSettings` to `RoomStatePayload`.
- Change client `createRoom` and `quickstartWithBots` commands from legacy decision seconds to optional typed `RoomSettingsSelection`; production UI always supplies a selection.
- Keep server legacy request parsing during this task for compatibility with older deployed clients, but remove legacy emission from the current client.

### Implementation steps

1. Red→Green room-state contract/broadcast tests for host, join, rejoin, and return-to-lobby/rematch preservation.
2. Red→Green store payload tests proving create and quickstart emit the typed envelope and never the legacy field.
3. Build named preset selector plus collapsed bounded custom controls with semantic labels and compact-safe layout.
4. Render one server-authoritative waiting-room summary for every member, then run focused responsive and full verification.

### Edge cases

- Default Standard, all named presets, custom min/max values, numeric empty/NaN/fraction input, switching named↔custom, repeated submissions while busy, and advanced disclosure toggling without silently changing selection.
- Joiner never saw the create form, rejoin during lobby, rejoin during reveal/play, return-to-lobby after result, host transfer after a finished match, and legacy-created rooms resolving to a complete Custom display.
- 360px-class compact dialog height/scrolling, long Thai labels, keyboard/accessible disclosure semantics, exact optional-property typing, stale local state, and no room mutation after invalid input.

### Acceptance criteria

- Advanced settings stay collapsed until requested.
- Rejoin and rematch retain room settings.
- Players can see the current preset before start.

### Tests and verification

- Shared/server type contract tests, room-state broadcast/rejoin/rematch E2E, client store/Lobby integration tests for preset/custom/quickstart/disclosure/waiting summary, compact viewport assertions, root typecheck, all package tests, production client build, diff check, and changed-state screenshots when browser runtime is available.

### Completion report

- Migrated current create and bot-quickstart commands from the temporary decision-only field to the typed ROOM-001 `settings` envelope. Standard is the production default; Beginner and Fast use the same shared canonical data as the server.
- Added an accessible preset selector with concise Thai intent copy. Fully bounded four-field Custom timing remains behind a collapsed `aria-expanded` advanced disclosure; incomplete/out-of-range drafts disable both create and quickstart rather than emitting partial settings.
- Added required resolved settings to every server `room:state`. The waiting room renders one server-authoritative summary for host/joiners, and E2E proves the same values survive explicit Fast rejoin plus three Standard return-to-lobby/rematch cycles.
- Added compact 740×360 coverage proving the expanded create dialog remains scrollable with all preset/custom controls, plus default payload, custom payload, invalid draft, quickstart, waiting-summary, join, rejoin, and rematch tests.
- Verification passed: focused Lobby 5 tests, server E2E 34, engine 40 files / 1,116 tests, server 4 / 67, client 32 / 244, root typecheck, production client build (212 modules), and diff check. One combined parallel `pnpm test` run starved the existing bot quickstart E2E past its 20s observation window; the complete server suite immediately passed alone with that case at 1.2s, and the complete client suite passed alone.
- Changed-state screenshot capture was attempted because UI changed, but the browser plugin again rejected its trusted service before connecting to the local page; no screenshot was fabricated. Semantic dialog/disclosure, compact scroll, resolved-summary, and full Lobby regressions passed.
- No settings editing after room creation, gameplay rule, engine, database, table UI, CSS, sound, effect, or asset behavior changed. `packages/client/src/App.tsx` remains outside task staging. Implementation commit: `89164b7` (`ROOM-002-add-lobby-pacing-ui`).

---

## ASSIST-001 — Preferences and first-time onboarding

Status: completed | Owner: Codex | Reviewer: Claude accessibility | Estimate: 2 days | Risk: Medium

### Objective

Add per-player assistance levels and a skippable first-table walkthrough stored locally.

### Current behavior

- Sound has resilient local preferences, but assistance has no typed level, storage owner, or settings entry point.
- First-time players enter a live table without an orientation to the action area, opponents, hand/self area, or persistent rules/settings controls.
- Rules can be opened manually, but there is no durable first-run/repeat-run distinction, pause/resume state, or immediate opt-out for experienced players.

### Expected behavior

- One resilient local preference owner exposes `off | basic | detailed` and durable walkthrough progress/status. Malformed, blocked, or quota-limited storage never breaks rendering.
- Assistance settings are reachable before play in Lobby and during play from the existing utility rail. Experienced players can choose Off immediately; Beginner rooms visibly recommend Detailed without changing a player's preference automatically.
- The first live Table opens a short informational orientation when assistance is enabled. Steps highlight stable semantic table regions, preserve keyboard focus, support touch, pause/resume, skip permanently, replay, compact landscape, and reduced motion.
- This task explains where controls live only. It does not explain current legality/reasons, reveal hidden information, recommend strategy, submit actions, or create tutorial-only engine branches.

### In scope / allowed files

- New client assistance store, preference modal/button, first-table walkthrough component/hook, narrow integration in Lobby/Table/TableControls, focused CSS if required, client tests, and hardening docs.

### Out of scope / forbidden files

- Engine/shared/server/protocol/gameStore changes, action/target legality or copy, hidden-information inference, automated choices, tutorial scenarios/bots/progress, database/accounts/cloud sync, new audio/effects/assets, package dependencies, and unrelated `App.tsx` content/line endings.

### Type or protocol changes

- Add client-only `AssistanceLevel = "off" | "basic" | "detailed"` and a discriminated walkthrough status (`new | active | paused | completed | skipped`) behind one persisted Zustand store.
- No network, GameView, legal-action, room-setting, or engine type changes.

### Implementation steps

1. Red→Green safe preference load/save, invalid storage, level changes, step progress, pause/resume, skip, complete, and replay transitions.
2. Add one accessible preferences modal/button reused in Lobby and the Table utility rail, including Beginner-room recommendation and immediate Off.
3. Red→Green first-Table auto-start, semantic-region highlight, next/back, pause, skip, completion, replay, focus, Escape, compact, resize, and reduced-motion behavior.
4. Run full verification, attempt changed-state screenshots, document the ASSIST-002/TUT boundary, commit, and request explicit push approval.

### Edge cases

- Missing/malformed/null/old-version/non-finite storage, get/set/quota exceptions, module reload, Off while walkthrough is open, switching back on, completed/skipped replay, paused browser refresh, and repeated StrictMode effects.
- Target selector absent/detached/zero-size, resize/orientation change, compact duplicate regions, walkthrough mounted during another gameplay modal, disconnect/reconnect, Table remount, and match/rematch changes.
- Keyboard focus entry/step advance/return, Escape pause rather than permanent skip, touch-sized controls, reduced-motion without animated travel, and no mutation/submission of gameplay state.

### Acceptance criteria

- Off/basic/detailed choices persist.
- Walkthrough focus and controls are keyboard/touch accessible.
- Experienced players can disable it immediately.

### Tests and verification

- Assistance-store tests; preference modal level/recommendation/replay tests; first-run/repeat-run/pause/resume/skip/complete/focus/Escape/target-missing/resize/compact/reduced-motion tests; Lobby/TableControls/Table regressions; root typecheck; all package suites; production build; diff check; and changed-state screenshots when browser runtime is available.

### Completion report

- Added one typed, resilient local Zustand owner for `off | basic | detailed` and durable `new | active | paused | completed | skipped` walkthrough progress. Valid versioned data restores; malformed/old/blocked/quota-limited storage safely falls back or remains non-blocking.
- Added one reusable accessible assistance preference panel to Home, the waiting room, and the Table utility rail. Beginner rooms recommend Detailed without overriding the player's current level; Off is immediate; completed/skipped guidance can be replayed explicitly.
- Added a four-step first-Table orientation for the central action area, clockwise opponents, self/hand/equipment area, and utility controls. It supports next/back, focus entry, Escape pause, permanent skip, replay, missing anchors, mobile-first duplicate-anchor selection, resize/orientation updates, and reduced-motion transitions.
- The guide is an informational live region rather than a second modal dialog: its panel remains interactive while pointer events outside it reach the real table, so gameplay Decision/Death dialogs retain their unique semantics and existing tests.
- No engine/shared/server/protocol/gameStore, legality, hidden information, action submission, tutorial scenario, database, sound, effect, asset, dependency, or unrelated `App.tsx` behavior changed.
- Verification passed: focused ASSIST suite 5 files / 25 tests; Table + walkthrough 74 tests; full Client 35 files / 259 tests; Engine 40 / 1,116; Server 4 / 67; root typecheck; production client build (215 modules); and catalog check (256/256).
- Changed-state screenshot capture was attempted, but the browser plugin rejected its trusted service before connecting to the local page. No screenshot was fabricated; semantic UI, 740/844/932 compact Table regressions, resize, focus, reduced-motion, and full production gates passed.

---

## ASSIST-002 — Context help and unavailable-action reasons

Status: completed | Owner: Codex | Reviewer: Claude copy/security | Estimate: 3 days | Risk: High

### Objective

Explain the current decision and why visible actions/targets are unavailable without revealing hidden information or choosing strategy.

### Current behavior

- Reactive decisions already have typed Thai copy, but main-action guidance and unavailable reasons are scattered across controllers and components.
- The server-authoritative `legalActions` projection exposes stable card/skill reason codes, while the client translates only a subset with ad-hoc fallback notices.
- Assistance level is durable per player, but Basic/Detailed currently affects onboarding preference only and does not explain the live decision.

### Expected behavior

- One exhaustive client mapping translates every projected card/skill unavailable reason to friendly Thai without recomputing legality.
- A compact, non-modal contextual-help region explains the viewer's current action. Basic shows neutral orientation; Detailed may additionally list reasons for the viewer's own visible unavailable cards/skills.
- Off renders no contextual help. Help never submits, selects, targets, blocks table input, recommends a play, or derives facts from another player's hidden hand/role.

### In scope / allowed files

- Client-only typed context-help data/model, a focused presentational component, narrow Table/main-action integration, responsive CSS, client tests, and hardening docs.
- Reuse `DecisionRoute`, final decision copy, `legalActions`, card metadata, skill metadata, and `AssistanceLevel` only after those values are already safe for the viewer.

### Out of scope / forbidden files

- Engine/shared/server/protocol/gameStore legality changes; client legality mirrors; strategy/ranking/recommended targets; inference from opponents' hands, roles, draw-pile order, or private logs; automated actions; tutorial scenarios; assets/audio/effects; dependencies; and unrelated `App.tsx` content/line endings.

### Type or protocol changes

- Add client-only exhaustive reason types derived from the shared `LegalActionView` union and a discriminated `ContextHelpViewModel`.
- No network, protocol, engine, room, persistence, or gameplay-state change.

### Implementation steps

1. Red→Green exhaustive public Thai copy for all five card reasons and all three active-skill reasons; replace existing ad-hoc notice copy with the shared resolver.
2. Red→Green a narrow pure help-model builder for Off/Basic/Detailed and all decision routes. Its input excludes `GameView`, players, roles, logs, and hidden-hand objects by construction.
3. Add an accessible, compact, non-modal Table help region that remains pointer-safe, avoids duplicating the central announcement, and stays clear of the hand/action controls at supported mobile landscape sizes.
4. Add hidden-information invariance, mobile positioning, accessibility, and Table interaction regressions; run all gates, attempt changed-state screenshots, document, commit, and request explicit push approval.

### Edge cases

- No pending decision/recovery/finished state, waiting on another player, automatic pending decisions, draw/judgment pile actions, mandatory discard, main action with duplicate options/reasons, conversions and Zhangba, no visible unavailable items, and a new unmapped reason failing typecheck.
- Assistance switched Off while mounted, Basic↔Detailed changes, long Thai card/skill names, duplicate card copies, compact 740×360/844×390/932×430, safe-area edges, keyboard/screen-reader reading order, reduced motion, modal/inspection overlays, reconnect snapshots, and StrictMode rerenders.
- Two inputs that differ only in private opponent hand/role/log data must produce identical help; preferably private data is impossible to pass into the model at all.

### Acceptance criteria

- Stable reason codes map to friendly Thai copy.
- Explanations never disclose private hand/role information.
- Assistance can be disabled per player.
- Basic and Detailed remain neutral explanations, never recommended choices.
- Existing card/target/skill availability continues to come only from server-projected `legalActions`.

### Tests and verification

- Focused copy/model/component tests; every legal-action reason; hidden-information input/invariance checks; Off/Basic/Detailed; mobile positioning; accessibility; Table/main-action regressions; root typecheck; all package suites; production client build; catalog check; diff check; and changed-state screenshots when browser runtime is available.

### Completion report

- Added exhaustive, compiler-checked Thai copy for all five projected card reasons and all three active-skill reasons. Existing main-action and Zhangba notices now use the same resolver rather than local conditional copy.
- Added a pure `ContextHelpViewModel` builder whose public input accepts only assistance level, typed decision route, and the viewer's server-projected `legalActions`; it cannot accept players, roles, logs, or hand objects. Off returns nothing, Basic gives neutral orientation, and Detailed deduplicates visible unavailable card/skill reasons without IDs or strategy.
- Added one accessible non-modal help chip inside both desktop and compact battle arenas. It remains 28px high while closed, expands upward only on request, unmounts immediately at Off, resets closed if re-enabled, and never reserves hand/action-dock space or submits gameplay actions.
- Added exhaustive copy/model/privacy/type tests, component disclosure/accessibility tests, Table live-store/privacy/no-submit lifecycle coverage, and 932×430/844×390/740×360 plus desktop anchor regressions. Existing server-authoritative target/card/skill and second-Sha tests remain green.
- Real-browser QA passed at 932×430 with a three-player game: the collapsed chip measured 78×28px; the open Detailed panel measured 300×133px and remained entirely inside the 916×193px battle arena while showing only the safe `ท้อคืนชีพ — ไม่มีเป้าหมาย` reason.
- Verification passed: focused context/controller/component 3 files / 11 tests; Table 68 tests; full Client 37 files / 267 tests; Engine 40 / 1,116; Server 4 / 67; root typecheck; production client build (217 modules); catalog check (256/256); and diff check.
- No engine/shared/server/protocol/gameStore, legality, tutorial, database, sound, effect, asset, dependency, or unrelated `App.tsx` content changed.
- Implementation commit: `c65bc71` (`ASSIST-002-add-contextual-action-help`).

---

## TUT-001 — Tutorial scenario/controller foundation

Status: completed | Owner: Codex | Reviewer: Claude scenario audit | Estimate: 2 days | Risk: High

### Objective

Create typed tutorial scenarios, steps, completion conditions, highlights, and local progress without embedding tutorial branches in the engine.

### Current behavior

- The first-table walkthrough explains the existing layout, but there is no reusable playable-scenario contract.
- The client receives server-projected `LegalActionView[]` and sends real `PlayerAnswer` payloads; no tutorial layer consumes that authoritative boundary yet.
- Tutorial completion/reset state and scenario validation do not exist.

### Expected behavior

- A client-only, pure tutorial controller starts from a strictly validated typed scenario and exposes the active prompt, semantic highlight, progress, and completion state.
- Each observation combines the player's real submitted answer with the same server-projected legal actions that enabled it. The controller matches teaching intent without calculating game legality.
- Wrong actions are reported as retryable tutorial outcomes and never advance a step. A scenario whose expected action is unavailable in the supplied authoritative actions fails loudly.
- Serializable local progress can resume only a valid step boundary; reset always returns to the first step.

### Allowed files

- `packages/client/src/tutorial/**`
- `packages/client/tests/tutorial*.test.ts`
- `docs/hardening/TASKS.md`
- `docs/hardening/PROGRESS.md`

### Forbidden changes

- No tutorial branches, state, actions, bot policy, or rule exceptions in `packages/engine`, `packages/shared`, or `packages/server`.
- No protocol, `gameStore`, multiplayer Table flow, card/general rule, dependency, sound, effect, asset, or unrelated `App.tsx` changes.
- No lesson content, scripted bot, tutorial navigation UI, or advanced resume polish assigned to `TUT-002`/`TUT-003`.

### Type contracts

- Scenario, step, highlight, expected-action, progress, observation, transition, and public snapshot use discriminated unions or readonly typed records.
- Expected actions reference stable public vocabulary (`draw`, `playCard` type/source, `useSkill` skill ID, `response` decision kind, `discard`, `endPhase`) rather than private engine state.
- Persistence accepts unknown data through a strict decoder and never restores an out-of-range or completed scenario into a half-applied step.

### Implementation steps

1. Add strict scenario construction/validation and the smallest public controller snapshot.
2. Match real submitted answers against projected legal-action options and implement retry/advance/complete transitions.
3. Add strict reset/resume progress handling with scenario/version identity.
4. Prove import isolation from engine/server production sources and preserve the existing multiplayer path unchanged.

### Edge cases

- Empty scenarios, duplicate step IDs, duplicate/out-of-order positions, invalid highlights, and malformed persisted progress fail or reset deterministically.
- Expected card/skill/response actions absent from current `LegalActionView[]` throw an explicit scripted-step error.
- A valid but unexpected player action does not advance and carries no hidden card, role, or strategy data in the public snapshot.
- Observations received after completion are stable no-ops; reset is always available.

### Acceptance criteria

- Tutorial controller consumes real engine state/actions.
- Invalid scripted steps fail loudly in tests.
- Multiplayer production flow imports no tutorial-specific rule behavior.
- Completion/progress snapshots contain no players, roles, hands, draw-pile order, or engine-private state.

### Tests and verification

- RED→GREEN scenario schema, initial snapshot, expected transition, retry, unavailable scripted action, completion, reset/resume, strict persistence, privacy/type-boundary, and source-import isolation tests.
- Full Client, Engine, and Server suites; root typecheck; production client build; catalog check; scoped diff review.

### Completion evidence

- Added a strict client-only scenario decoder, exhaustive typed tutorial action vocabulary, semantic highlights, immutable controller snapshots/transitions, explicit retry/advanced/completed outcomes, and fail-fast `TutorialScriptError` handling when authored expectations disagree with authoritative projected actions.
- Added versioned serializable progress with strict resume validation, deterministic reset, and an injected local-storage adapter that degrades safely when storage is corrupt, blocked, or full.
- The controller accepts only an accepted real `PlayerAnswer` plus `LegalActionView[]`; public snapshots exclude players, roles, hands, draw-pile order, strategy, and engine-private state. Source-isolation tests prove engine/shared/server production sources import no tutorial behavior and the client tutorial boundary imports no engine/gameStore/GameState.
- Focused TUT-001 verification passed: 3 files / 12 tests. Full verification passed: Client 40 files / 279 tests; Engine 40 / 1,116; Server 4 / 67; total 84 files / 1,462 tests; root typecheck; production client build (217 modules); catalog check (256/256); and diff check.
- No UI was added in this foundation task, so there is no changed-state screenshot; playable lesson UI and scripted bot content remain scoped to `TUT-002`.
- No engine/shared/server/protocol/gameStore, multiplayer Table flow, rules, dependency, sound, effect, asset, or unrelated `App.tsx` content changed.
- Implementation commit: `b8d57ca` (`TUT-001-add-tutorial-controller-foundation`).

---

## TUT-002 — Basic lessons and scripted bot

Status: completed | Owner: Codex + Claude content | Reviewer: Codex | Estimate: 3 days | Risk: Medium

### Objective

Teach draw/attack/target/end turn and dodge/damage/heal through deterministic playable scenarios.

### Current behavior

- `TUT-001` supplies strict client scenario/controller and local-progress contracts, but there is no server-started tutorial room, deterministic lesson setup, scripted bot input, lesson picker, or in-table coach.
- Solo quickstart uses a random identity game and the generic bot policy, so it cannot guarantee the cards, targets, or teaching order required by a lesson.

### Expected behavior

- A validated `tutorial:start` request creates an isolated three-seat in-memory room backed by the existing engine session/respond/legal-action pipeline, skips role/general setup, and returns the human directly to the required lesson decision.
- Three deterministic basic lessons cover draw → attack/target → end phase, dodge, and pass → damage → draw → heal. Bot decisions come only from the selected scenario's scripted input policy.
- The home lesson picker and in-table coach expose progress, semantic highlights, retry feedback, skip/exit, replay, and next lesson without changing normal multiplayer behavior.

### Allowed files

- Dedicated tutorial contracts/adapters under `packages/shared/src/tutorial*`, `packages/engine/src/tutorial/**`, `packages/server/src/tutorial/**`, and `packages/client/src/tutorial/**`
- Narrow tutorial start/room metadata seams in shared protocol/events, `RoomManager`, socket/game flow, client game store, Lobby, and Table
- Tutorial-focused engine/server/client tests and responsive CSS
- `docs/hardening/TASKS.md`, `docs/hardening/PROGRESS.md`

### Forbidden changes

- No tutorial condition inside card, general, equipment, damage, turn-loop, legality, targeting, identity, or victory rule implementations.
- No duplicated client legality, private engine state in the browser, database, score/user system, unrelated assets/effects/audio, or unrelated `App.tsx` content.
- No advanced lesson content or half-applied resume/navigation behavior assigned to `TUT-003`.

### Type contracts

- Tutorial IDs are one strict shared vocabulary used by protocol, engine setup, server room metadata, and client catalog.
- Engine setup returns a normal `GameSession`, human player ID, and scenario-owned scripted bot input; no alternate rules engine is introduced.
- Accepted-action delivery is a generic client boundary containing the pre-answer projected legal actions, so tutorial coaching advances only after a real server acknowledgement.

### Implementation steps

1. Add shared tutorial ID/start contracts and deterministic engine basic scenario factory with golden runs.
2. Add tutorial room lifecycle and scenario-scripted bot resolution through existing socket/game flow.
3. Add accepted-action bridge, typed basic client catalog, lesson picker, and in-table coach.
4. Verify retry/skip/replay/next, semantic anchors, reduced motion, and 932×430/844×390/740×360 bounds.

### Edge cases

- Unknown scenario IDs are rejected before room creation; a failed start leaves no room/session token behind.
- Scripted bot input that cannot answer the current real decision fails loudly in tests and falls back safely at runtime without a busy loop.
- Duplicate taps advance the coach once because only acknowledged logical answers publish; a rejected answer never advances.
- Leaving/skipping clears the tutorial room but preserves completed local progress; replay resets only the selected lesson.

### Acceptance criteria

- Lessons are replayable, skippable, and complete in about 10–15 minutes together.
- Bot behavior is scripted only by tutorial controller inputs.
- Normal create/join/quickstart/rejoin/rematch flows remain tutorial-free.

### Tests and verification

- Golden scenario runs, wrong-action handling, bot progression, copy/anchor checks, mobile and reduced-motion tests.
- Full Client, Engine, and Server suites; root typecheck; production build; catalog check; scoped diff review.

### Completion evidence

- Added one strict tutorial-ID vocabulary across engine/shared/server/client, a validated `tutorial:start` event, isolated three-seat tutorial rooms, and normal `GameSession` setup through the existing respond/legal-action pipeline.
- Added deterministic real-rule lessons for first turn, dodge, and damage/recovery. Scenario-owned bot scripts answer main action, draw, response, and minimum discard decisions; unknown IDs are rejected before room creation.
- Added an accepted-action channel that publishes only after server acknowledgement and carries the pre-answer projected legal actions. The Coach advances from that boundary, handles wrong actions safely, persists progress, highlights semantic targets, and exposes exit/replay/next navigation.
- Added a compact accessible lesson picker and edge-mounted Coach. Real-browser QA at 740×360 measured the Coach at 480×50px with no page overflow; it stayed above the central action and the picker rendered all three lesson cards in one row. Reduced-motion disables highlight animation.
- Isolation tests confirm tutorial knowledge is limited to dedicated factories/lifecycle adapters and never enters engine card/general/equipment/core rule modules. Normal room and Table regressions remain green.
- Verification passed: Engine 41 files / 1,119 tests; Server 5 / 72; Client 43 / 286; total 89 files / 1,477 tests; root typecheck; production client build (301 modules); catalog 256/256; and diff checks.
- Implementation commit: `13ce21c` (`TUT-002-add-basic-playable-lessons`). No push was performed.

---

## TUT-003 — Advanced lessons, resume, and polish

Status: completed | Owner: Codex + Claude content | Reviewer: Codex | Estimate: 4 days | Risk: Medium

### Objective

Teach distance/equipment, tricks/judgment/Wuxie, roles/victory/skills, and finish tutorial navigation/progress.

### Current behavior

- TUT-002 exposes three basic deterministic rooms and persists step progress, but the catalog has no advanced content or completion state.
- Restarting a fresh scenario with active step progress could restore copy beyond the new engine state unless the launch boundary resets it deliberately.
- The three-seat basic fixture cannot demonstrate a genuinely out-of-range target.

### Expected behavior

- Add three deterministic real-engine lessons: equip a range weapon before attacking an out-of-range seat; answer a real trick with Wuxie while explaining trick/judgment timing; and use a real active skill inside an identity-role game.
- The picker shows all lessons, completed state, and explicit replay/reset. Reconnect into the same room resumes the accepted step boundary, while a fresh lesson launch resets incomplete progress before creating a new engine state.
- Next/replay/exit navigation never preserves a half-built card/target/skill selection and remains usable at every supported landscape viewport.

### In scope / allowed files

- Existing dedicated tutorial factories/contracts/catalog/Coach/picker, narrow dynamic tutorial-seat lifecycle seams, tutorial progress adapter, Table/Lobby integration, responsive CSS, tests, and hardening docs.

### Out of scope / forbidden files

- No tutorial branch inside card/general/equipment/damage/turn-loop/legality/targeting/identity/victory implementations; no fake client legality; no database/score/user system; no unrelated App/effects/audio/assets/dependencies.

### Type or protocol changes

- Extend the strict tutorial-scenario ID tuple with `advanced-distance`, `advanced-tricks`, and `advanced-roles`.
- Keep one exhaustive lesson catalog and scenario factory. Progress schema remains versioned and contains no private engine state.

### Implementation steps

1. RED→GREEN strict IDs and deterministic engine golden scenarios, including dynamic four-seat tutorial rooms for real distance.
2. RED→GREEN advanced authored steps and exhaustive combined catalog/navigation.
3. RED→GREEN completion badges, fresh-launch reset, reconnect resume, explicit reset/replay, and interaction cleanup.
4. Verify 932×430, 844×390, 740×360, reduced motion, full suites, build, catalog, visual QA, and scoped diff.

### Edge cases

- Invalid advanced ID; Wuxie responder order; no legal out-of-range target before equipment; bot draw/response/discard between learner steps; completed/version-mismatched/corrupt progress; fresh launch after an incomplete lesson; reconnect with the same room; last lesson navigation; StrictMode; storage failure; portrait gate and safe areas.

### Acceptance criteria

- Scenarios use real card/general rules.
- Resume never restores a half-applied UI selection.
- Completion state is local and resettable.

### Tests to add

- Engine golden tests for the three advanced starts and their real legal actions; dynamic room seat/mapping tests; strict protocol cases; catalog copy/order/progress tests; Coach reconnect/replay/last-next tests; Lobby completion/reset tests; supported viewport and reduced-motion regressions.

### Tests and verification

- Deterministic lesson tests, resume/reset, all supported viewport sizes, and full engine/client regressions.

### Completion report

- Extended the strict scenario vocabulary and exhaustive client catalog to six lessons. Missing protocol/catalog IDs now fail compile-time coverage.
- Added a four-seat distance fixture where p2 is genuinely outside Sha range before equipping `sword_qinggang` and becomes a legal target afterward; a real Guohe/Wuxie response fixture; and a real identity-mode role fixture with Sun Quan's legal `sunquan_zhiheng` action.
- Tutorial rooms derive their seat count and human mapping from each scenario, supporting three- and four-seat lessons without changing normal rooms. Golden tests assert real projected legal actions, not only pending-decision labels.
- The picker now shows all six lessons, local completion, replay, and explicit per-lesson reset. A fresh launch clears incomplete progress before creating a new engine state; reconnect into the same room resumes only the last acknowledged step boundary.
- Added semantic skill highlighting and exhaustive next-lesson navigation through the final lesson. Existing decision-key interaction reset prevents half-built card/target/skill selection from surviving an authoritative decision change.
- Real-browser QA at 740×360 showed all six compact cards in two complete rows after hiding summaries only at short landscape heights. The advanced distance table showed four seats, p2 fogged as out of range, and the Coach on the top edge without table overflow.
- Verification passed: Engine 41 files / 1,122 tests; Server 5 / 73; Client 44 / 290; total 90 files / 1,485 tests; root typecheck; production client build (303 modules); catalog 256/256; and diff checks.
- Implementation commit: `e554457` (`TUT-003-add-advanced-lessons-and-progress`). No push was performed.

---

## MOB-001 — Mobile layout-mode and Safari hardening

Status: completed | Owner: Codex | Reviewer: Claude accessibility | Estimate: 2 days | Risk: Medium

### Objective

Use one typed layout-mode policy and stabilize compact landscape under browser-toolbar and safe-area changes.

### Current behavior

- `useDeviceMode` independently derives `{ orientation, compact }` in every caller from `window.innerHeight <= 560`; it ignores `visualViewport`, pointer class, and previous mode.
- Repeated Safari toolbar resize events can make independently mounted consumers disagree or flip at the threshold. `Table` still uses inline `100vh` while the compact CSS mostly uses `100dvh`.
- Supported gate-size and circular-seat tests exist, but there is no hysteresis, visualViewport, desktop-short-window, or remount-consistency regression.

### Expected behavior

- One typed module-level layout snapshot exposes `portrait`, `compact-landscape`, or `desktop`, plus orientation/compact compatibility fields and effective viewport dimensions.
- It prefers `visualViewport` when available, applies bounded hysteresis, and publishes one consistent snapshot to every consumer. Toolbar-only height changes cannot oscillate compact mode near the entry threshold.
- Compact table height uses the effective dynamic viewport contract, safe-area offsets remain bounded, and desktop short windows are not mistaken for phones without a mobile-sized width or coarse pointer.

### In scope / allowed files

- Client device-mode policy/store/hook, narrow Table/CSS integration, focused unit/component/Table tests, hardening docs, and changed-state browser screenshots.

### Out of scope / forbidden files

- No seat-order redesign, gameplay/protocol/engine/server change, normal desktop visual redesign, tutorial/content change, dependency, assets/audio/effects, or unrelated `App.tsx` content/line endings.

### Type or protocol changes

- Add client-only `TableLayoutMode = "portrait" | "compact-landscape" | "desktop"` and typed viewport/pointer inputs. No network contract change.

### Implementation steps

1. RED→GREEN pure layout classification and hysteresis at supported gates, toolbar bands, portrait rotation, coarse/fine pointer, and short desktop windows.
2. RED→GREEN one shared external-store hook listening to window/visualViewport resize and orientation/media changes, including remount consistency and cleanup.
3. Route Table viewport height through the effective snapshot and tighten safe-area/touch-target CSS without changing the existing mobile design or seat geometry.
4. Verify 3/5/8/10 clockwise seats, 932×430/844×390/740×360, toolbar resize sequences, portrait, reduced motion, build/catalog/full suites, and real-browser screenshots.

### Edge cases

- `visualViewport` absent, zero/invalid transient viewport values, SSR, StrictMode duplicate subscriptions, toolbar height crossing 560 repeatedly, rotation while compact, desktop 1440×500, coarse tablet landscape, resize storms, late-mounted consumers, safe-area zero/large values, browser zoom, and a decision changing during resize.

### Acceptance criteria

- 3/5/8/10-player layouts preserve real clockwise order.
- Toolbar changes do not oscillate layout mode during a decision.
- Touch targets and overlays remain usable at supported heights.

### Tests and verification

- 932×430, 844×390, 740×360, orientation/resize, safe-area, coarse pointer, and real-device checklist.

### Completion report

- Commit: `515659d` (`MOB-001-harden-mobile-viewport-layout`).
- Added a pure typed `TableLayoutMode` classifier with separate 560px entry and 640px exit thresholds, coarse-pointer/mobile-width eligibility, portrait precedence, and safe invalid-dimension fallback.
- Replaced independent hook state with one `useSyncExternalStore` snapshot shared by every Table consumer. It prefers `visualViewport`, listens to Safari-compatible viewport/orientation/pointer changes, and preserves hysteresis across late mounts.
- Routed the Table root, screen shell, and board maximum height through the effective viewport CSS contract; the existing design, seat geometry, gameplay, protocol, engine, server, assets, and unrelated `App.tsx` were unchanged.
- RED was 4 expected policy failures; focused GREEN passed 2 files / 80 tests. Full verification passed Client 44 files / 295 tests, Engine 41 / 1,122, Server 5 / 73, root typecheck, production client build (303 modules), catalog 256/256, and diff checks.
- Browser QA passed at 932×430, 844×390, and 740×360 with exact Table/Shell heights, zero body overflow, no clipped buttons at the smallest gate, and no console warnings/errors. A live 550→590→555→650 sequence remained compact through toolbar jitter and exited at 650.

---

## REL-001 — Structured diagnostics and failure UX

Status: completed | Owner: Codex | Reviewer: Claude security | Estimate: 1.5 days | Risk: Medium

### Objective

Add structured decision/reconnect/timeout/forfeit diagnostics and clear in-memory-session-loss messaging without logging secrets.

### Current behavior

- Server lifecycle failures use ad-hoc `console.error` strings. Normal answer/rejoin/disconnect/timeout/forfeit transitions have no consistent correlation fields, and logger safety depends on each call site remembering not to pass raw payloads.
- Client debug lines are free-form strings. Rejoin failure discards the stored session and shows one generic expiry screen, so a server restart/room loss is indistinguishable from grace expiry or an invalid seat token.
- Promise failures around socket acknowledgement can reject without a normalized player-facing failure or diagnostic entry.

### Expected behavior

- One allowlisted structured diagnostic contract records event/outcome plus room, match, decision, client action, and seat correlation when known. Unknown/raw payload fields, session tokens, hands, roles, and private choices never enter the serialized record.
- Answer, reconnect, disconnect/grace, timeout/fallback, and forfeit paths emit bounded diagnostics. Failure records contain a normalized error name/reason, not stacks or engine/private state.
- Player-facing copy distinguishes a missing in-memory room/server restart from expired access, connectivity/ack timeout, and stale gameplay actions, with a clear next action.

### In scope / allowed files

- Server diagnostic utility and lifecycle call sites; client diagnostic/error model and copy; focused unit/E2E/component tests; hardening docs.

### Out of scope / forbidden files

- No persistent database/recovery, external telemetry vendor, protocol payload expansion, gameplay/engine behavior change, secrets in logs, visual redesign, dependency, or unrelated `App.tsx` line-ending/content change.

### Type or protocol changes

- Add server-only discriminated diagnostic event/outcome types and allowlisted correlation/error fields. Client failure categories remain local and do not change the socket wire contract.

### Implementation steps

1. RED→GREEN diagnostic record builder/serializer proving correlation fields survive and forbidden keys/values cannot leak.
2. Instrument rejoin, answer, disconnect/grace, timeout/fallback, and forfeit lifecycle transitions without passing raw socket/engine payloads.
3. RED→GREEN normalized client transport/rejoin failure categories and Thai recovery copy for restart, expiry, connectivity, and stale actions.
4. Verify focused logger/copy/E2E cases, full suites, typecheck, build, catalog, and diff scope; commit and push only after all gates pass.

### Edge cases

- Zod errors, non-Error throws, socket ack timeout/rejection, room deleted after restart, forged/expired token, duplicate action replay, stale match/decision, bot vs player timeout, safe fallback failing twice, reconnect before grace fires, explicit leave vs grace forfeit, abandoned match, unicode/very long reasons, and logger sink throwing.

### Acceptance criteria

- Logs carry room/match/decision/action correlation IDs where available.
- Session tokens, hidden hands, roles, and private choices are excluded.
- Unhandled async failures are visible and do not silently strand a room.

### Tests and verification

- Logger field/redaction tests, timeout/fallback/reconnect E2E, failure popup tests, health/build checks.

### Completion report

- Commit: `9e8fc9d` (`REL-001-add-structured-reliability-diagnostics`).
- Added an allowlisted `DiagnosticEvent`/`DiagnosticOutcome` record builder and failure-isolated reporter. Correlation fields are bounded and runtime construction drops unknown raw payload keys; reasons redact tokens, UUIDs, opaque values, stacks, and long text.
- Instrumented rejoin, answer/idempotent replay, disconnect/grace, timeout/fallback, and forfeit transitions with room/match/decision/action/seat correlation where available. Raw engine answers, hands, roles, choices, session tokens, and raw lifecycle errors are never passed to the sink.
- Replaced unbounded socket acknowledgement promises with a 10-second typed timeout while preserving the original callback transport contract. Recoverable transport failures keep the stored session for retry; room loss after an in-memory server restart and expired access take distinct paths.
- Added Thai restart/ack-timeout recovery copy and a pure rejoin failure classifier without changing popup markup/CSS or the unrelated `App.tsx` worktree diff.
- RED covered the missing diagnostic module and missing failure classifier. A first full-client attempt exposed the incompatible Socket.IO timeout wrapper; focused GeneralSelect/Table regressions reproduced it, the wrapper was corrected to retain `socket.emit`, and the focused rerun passed 74/74.
- Final verification passed Client 45 files / 300 tests, Server 6 / 76, Engine 41 / 1,122, total 92 / 1,498; root typecheck; production client build (305 modules); `/health` returned `{ "ok": true }`; catalog 256/256; and diff checks. No visual screenshot was needed because visible markup/CSS/layout did not change; the changed copy is covered by model and popup regressions.

---

## SFX-002 — Layered game-audio reset and event mix

Status: completed | Owner: Codex | Reviewer: User listening + Claude event audit | Estimate: 2.5 days | Risk: High

### Objective

Replace the thin ten-tone synthesizer with a bounded layered Web Audio sound bank whose cues land on the visible card, combat, judgment, Wuxie, Shandian, turn, and result phases.

### Current behavior

- Ten oscillator-only cues share a flat destination path and sound synthetic/thin.
- Draw/discard/turn routing is owned by a separate snapshot hook while card motion, combat, and table feedback have their own visible timelines.
- Card equipment, discard, attack travel, judgment, Wuxie, and Shandian have no distinct audio identity.

### Expected behavior

- One typed 16-cue bank composes deterministic tone and filtered-noise layers through one compressor-protected mix.
- Audio is emitted by the same presentation owner that makes the corresponding visual state visible; reconnect/history baselines stay silent.
- Cooldowns, per-cue polyphony, global limits, priority eviction, autoplay recovery, mute, volume, and failure isolation remain bounded.

### In scope / allowed files

- `packages/client/src/audio/sfxBank.ts`, `packages/client/src/lib/sfx.ts`, and audio tests.
- Narrow sound-routing edits in card-motion, combat, table-feedback, Table composition, and their tests.
- Removal of the superseded snapshot-only `useTableSfx` owner and its test after equivalent coverage moves to presentation owners.
- Hardening progress, task, handoff, baseline, and QA matrix records.

### Out of scope / forbidden files

- Engine/shared/server rules or protocol, gameplay timing, UI/CSS/layout, artwork, database/users/scores, voice chat, licensed/downloaded audio, background music, and unrelated `App.tsx` content or line endings.
- Awaiting sound before gameplay/presentation, replaying blocked or historical sounds, or unbounded buffers/voices.

### Type or protocol changes

- Client-only `SfxName` expands to 16 literal cues backed by exhaustive `Record<SfxName, SfxRecipe>` recipes and typed tone/noise layer unions. No wire change.

### Implementation steps

1. Define recipe/layer contracts and bounded cue bank; add invariant tests.
2. Replace the raw oscillator driver with tone/noise synthesis, deterministic noise, envelopes, master compressor, cooldown, and per-cue priority/polyphony.
3. Route card sounds from visible card motion, attack/hit sounds from combat phases, and judgment/Wuxie/lightning/turn sounds from table feedback.
4. Delete the duplicated snapshot sound hook, preserve Result and preference controls, then run focused and full verification.

### Edge cases

- Missing/throwing/closed/suspended AudioContext, Safari prefixed context, rejected or synchronous resume, rapid duplicate logs, multi-target bursts, same-frame skill→attack→damage→death, reduced motion, reconnect/log rollback/match reset, Shandian hit vs miss, muted/zero/invalid volume, storage failure, node creation/stop/disconnect/close failure, and component unmount.

### Acceptance criteria

- Every public cue has a bounded recipe and no cue can create unbounded overlapping voices.
- The same accepted event produces at most one sound in each intended visible phase and no historical reconnect burst.
- Shandian hit has a distinct highest-priority cue; miss remains judgment feedback without thunder impact.
- Gameplay, socket handling, presentation progression, and React rendering never await or throw because of audio.

### Tests and verification

- Sound-bank invariants; manager mute/volume/cooldown/polyphony/priority/autoplay/failure tests; card/combat/feedback timing; Result/preferences regressions; full client/engine/server suites; root typecheck; production build; catalog and diff checks.

### Completion report

- Replaced the oscillator-only ten-cue definitions with one exhaustive 16-cue layered bank using deterministic filtered noise, shaped tone envelopes, cue-specific output levels, cooldowns, priorities, and polyphony limits.
- Rebuilt the Web Audio output path around a shared mix and dynamics compressor. Lazy context creation, Safari-prefixed fallback, gesture recovery, mute/volume storage, failure isolation, global eviction, and idempotent cleanup remain intact.
- Moved sound ownership onto visible presentation phases: card draw/play/discard/equip from card motion; attack travel plus hit/dodge/heal/skill/death from combat; judgment/Wuxie/Shandian/turn from table feedback; win/lose remain on Result.
- Removed the superseded snapshot-only `useTableSfx` hook and its duplicate routing. Initial snapshots, reconnects, match resets, and log rollbacks remain silent through the existing presentation queue contract.
- Focused verification passed 8 files / 60 tests. Milestone verification passed in 221 seconds: Engine 41/1,122, Server 6/76, Client 45/302, total 92/1,500; root typecheck; production build with 305 modules; catalog 256/256; and diff checks.
- No screenshot was required because UI/DOM/CSS/layout did not change. Final perceived mix and loudness remain a listening acceptance item for the user in real Chrome/iPhone Safari; the build's existing main-chunk warning is now 551.95 kB minified.

---

## QA-001 — Milestone verification matrix

Status: completed | Owner: Codex | Reviewer: Claude | Estimate: 2 days distributed | Risk: High

### Objective

Maintain targeted and full verification at every milestone and prevent test-count regression.

### Acceptance criteria

- Each task completion report records commands and counts.
- Full suite and build gate every milestone.
- Manual checks have named viewport/player-count/browser coverage.

### Tests and verification

- The matrix itself references all engine/server/client/presentation/tutorial risk areas and current baseline.

### Completion report

- Commit: `94c1d8d` (`QA-001-add-milestone-verification-matrix`).
- Added `pnpm verify:milestone`, a fail-fast sequential gate for root typecheck, Engine/Server/Client suites, production client build, and catalog drift. Sequential execution avoids the documented server-timeout contention with engine fuzz tests.
- Added `QA_MATRIX.md` with the 92-file / 1,498-test baseline, count-regression policy, risk-to-evidence ownership, and named desktop/iPhone/player/network/match/accessibility cells.
- Made `pnpm catalog:check` read-only. A SHA-256 before/after assertion proved the catalog remained byte-identical while all 256 cases passed.
- Verification passed in 444 seconds: typecheck for all four packages; Engine 41/1,122; Server 6/76; Client 45/300; production build with 305 modules; catalog 256/256; and diff checks. No screenshot was required because this task changes verification tooling and documentation only.
- The production build still reports the existing 549.27 kB minified main-chunk warning; it is recorded for `QA-002` performance/release review and is not hidden by this gate.

---

## QA-002 — Full release and production smoke test

Status: backlog | Owner: Codex | Reviewer: User + Claude independent review | Estimate: 3 days | Risk: High

### Objective

Verify the entire release through automated suites, complete multiplayer games, supported mobile layouts, reconnect/timeout/rematch, assistance, tutorial, sound, and production build/deploy.

### Acceptance criteria

- Full games pass at 3/5/8/10 players.
- Reconnect, timeout, forfeit, and three rematches pass.
- Hidden-information inspection passes.
- iPhone Safari checklist passes.
- Production smoke test passes with known in-memory restart limitation documented.

### Tests and verification

- Root typecheck, all tests, production build, automated viewport matrix, manual multiplayer/device checklist, and post-deploy smoke test.
