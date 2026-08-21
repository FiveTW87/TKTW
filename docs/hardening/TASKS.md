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
| LEGAL-002 | Card play and conversion legality | backlog | Codex | 1.5d | LEGAL-001 |
| LEGAL-003 | Targets, range, and multi-step legality | backlog | Codex | 1.5d | LEGAL-002 |
| LEGAL-004 | Skills, projection, and client migration | backlog | Codex | 2d | LEGAL-003 |
| TABLE-001 | Decision and main-action controllers | backlog | Codex | 1d | LEGAL-004 |
| TABLE-002 | Selection, dialogs, and sound controllers | backlog | Codex | 1d | TABLE-001 |
| TABLE-003 | Presentational extraction and cleanup | backlog | Codex | 1d | TABLE-002 |
| ASSET-001 | Typed general-art manifest | backlog | Codex | 1.5d | TS-002 |
| PRES-001 | Presentation-event model and queue | backlog | Codex | 1.5d | LEGAL-004, ASSET-001 |
| PRES-002 | Anchor retry, reconnect, and reduced motion | backlog | Codex | 1d | PRES-001 |
| SFX-001 | Audio manager and preferences | backlog | Codex | 1.5d | PRES-001 |
| FX-001 | Card and equipment motion | backlog | Codex | 2d | PRES-002 |
| FX-002 | Combat and skill sequences | backlog | Codex | 2.5d | FX-001, SFX-001 |
| FX-003 | Judgment, Wuxie, turn, and timer feedback | backlog | Codex | 2d | FX-002 |
| ROOM-001 | Typed room settings and presets | backlog | Codex | 1.5d | LEGAL-001 |
| ROOM-002 | Create/lobby UI and lifecycle preservation | backlog | Codex | 1.5d | ROOM-001 |
| ASSIST-001 | Preferences and first-time onboarding | backlog | Codex | 2d | TABLE-003, ROOM-002 |
| ASSIST-002 | Context help and unavailable-action reasons | backlog | Codex | 3d | LEGAL-004, ASSIST-001 |
| TUT-001 | Tutorial scenario/controller foundation | backlog | Codex | 2d | ASSIST-002, PRES-002 |
| TUT-002 | Basic lessons and scripted bot | backlog | Codex + Claude content | 3d | TUT-001 |
| TUT-003 | Advanced lessons, resume, and polish | backlog | Codex + Claude content | 4d | TUT-002 |
| MOB-001 | Mobile layout-mode and Safari hardening | backlog | Codex | 2d | FX-003, ASSIST-002 |
| REL-001 | Structured diagnostics and failure UX | backlog | Codex | 1.5d | ROOM-002 |
| QA-001 | Milestone verification matrix | backlog | Codex + Claude review | 2d | Each milestone |
| QA-002 | Full release and production smoke test | backlog | Codex | 3d | All tasks |

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

Status: backlog | Owner: Codex | Reviewer: Claude | Estimate: 1.5 days | Risk: High

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

---

## LEGAL-003 — Targets, range, and multi-step legality

Status: backlog | Owner: Codex | Reviewer: Claude | Estimate: 1.5 days | Risk: High

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

---

## LEGAL-004 — Skills, projection, and client migration

Status: backlog | Owner: Codex | Reviewer: Claude | Estimate: 2 days | Risk: High

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

---

## TABLE-001 — Decision and main-action controllers

Status: backlog | Owner: Codex | Reviewer: Claude | Estimate: 1 day | Risk: Medium

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

---

## TABLE-002 — Selection, dialogs, and sound controllers

Status: backlog | Owner: Codex | Reviewer: Claude | Estimate: 1 day | Risk: Medium

### Objective

Extract target/card selection, notices/dialog state, and snapshot-diff sound routing into focused hooks.

### Acceptance criteria

- Selection caps and multi-step ordering are preserved.
- No stale dialog or selection survives a new decision.
- Sound routing has one owner.

### Tests and verification

- Reducer/hook tests, Jiedao/Lijian/Zhangba regressions, modal and SFX tests.
- Client suite, typecheck, and build.

---

## TABLE-003 — Presentational extraction and cleanup

Status: backlog | Owner: Codex | Reviewer: Claude | Estimate: 1 day | Risk: Medium

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

---

## ASSET-001 — Typed general-art manifest

Status: backlog | Owner: Codex | Reviewer: Claude inventory | Estimate: 1.5 days | Risk: Medium

### Objective

Replace scattered filename/layout mappings with a complete typed manifest for all 25 generals.

### Acceptance criteria

- Every general has portrait, full-body, attack, hit, and skill resolution with documented fallback.
- Canonical paths exist on disk.
- Superseded or unmapped assets are reported, not silently selected.

### Tests and verification

- Manifest completeness and filesystem existence tests.
- Fallback and Lu Bu normalization tests.
- Client suite and build.

---

## PRES-001 — Presentation-event model and queue

Status: backlog | Owner: Codex | Reviewer: Claude event audit | Estimate: 1.5 days | Risk: High

### Objective

Translate structured game logs into typed, ordered, deduplicated presentation events managed by a non-blocking queue.

### Acceptance criteria

- Stable event IDs and ordering.
- Multiple logs in one snapshot queue correctly.
- Initial mount does not replay prior history.
- Queue errors do not affect gameplay.

### Tests and verification

- Event mapping, ordering, dedupe, initial mount, and error-isolation tests.
- Existing combat presentation tests, client suite, typecheck, and build.

---

## PRES-002 — Anchor retry, reconnect, and reduced motion

Status: backlog | Owner: Codex | Reviewer: Claude | Estimate: 1 day | Risk: Medium

### Objective

Make presentation reliable across layout mounts, reconnects, compact/desktop anchors, and reduced motion.

### Acceptance criteria

- Bounded anchor retries.
- Reconnect resumes from the new baseline.
- Reduced motion preserves labels/numbers without travel particles.

### Tests and verification

- Fake-timer anchor tests, reconnect truncation tests, reduced-motion tests, desktop/mobile anchor tests.

---

## SFX-001 — Audio manager and preferences

Status: backlog | Owner: Codex | Reviewer: Claude event inventory | Estimate: 1.5 days | Risk: Medium

### Objective

Centralize sound categories, preload/fallback, volume, mute, and concurrency limiting.

### Acceptance criteria

- One manager owns playback.
- Repeated events cannot create unbounded overlapping audio.
- Browser autoplay restrictions fail silently and recover after user interaction.

### Tests and verification

- Mock AudioContext/playback tests, preference persistence, concurrency, preload failure, mute/volume tests.

---

## FX-001 — Card and equipment motion

Status: backlog | Owner: Codex | Reviewer: Claude scenarios | Estimate: 2 days | Risk: Medium

### Objective

Add draw, play, discard, steal, equip/loss, delayed-trick, and Wugu movement using the presentation queue.

### Acceptance criteria

- Motions communicate source and destination.
- Hand/action controls remain usable.
- Missing anchors and reduced motion have safe fallbacks.

### Tests and verification

- Event/component tests for every motion category, compact layout, failed anchor, reduced motion, and queue overlap.

---

## FX-002 — Combat and skill sequences

Status: backlog | Owner: Codex | Reviewer: Claude rules audit | Estimate: 2.5 days | Risk: High

### Objective

Present attack, response, hit, dodge, heal, skill, death, and multi-target actions as readable timelines.

### Acceptance criteria

- Source/target are unambiguous.
- Pose priority prevents three-body/duplicate-pose artifacts.
- Multi-target actions remain ordered and fast enough for live play.

### Tests and verification

- Sequence/priority/multi-target tests, missing artwork fallback, mobile placement, reduced motion, and current combat regressions.

---

## FX-003 — Judgment, Wuxie, turn, and timer feedback

Status: backlog | Owner: Codex | Reviewer: Claude scenario review | Estimate: 2 days | Risk: Medium

### Objective

Give judgment replacement, nested Wuxie, turn start, phase change, and urgent timer states distinct feedback.

### Acceptance criteria

- Judgment replacement is visually distinguishable from the original reveal.
- Nested Wuxie resolves to a clear final state.
- Phase feedback does not repeatedly block interaction.

### Tests and verification

- Judgment/Wuxie depth tests, timer fake-clock tests, reduced-motion and mobile layering tests.

---

## ROOM-001 — Typed room settings and presets

Status: backlog | Owner: Codex | Reviewer: Claude server tests | Estimate: 1.5 days | Risk: Medium

### Objective

Define server-authoritative beginner, standard, fast, and bounded custom pacing settings.

### Acceptance criteria

- Zod validates all settings.
- Presets do not alter core game rules.
- Defaults preserve current standard behavior.

### Tests and verification

- Schema boundary tests, create/quickstart invalid-input tests, timeout/bot/grace preset tests, server typecheck.

---

## ROOM-002 — Create/lobby UI and lifecycle preservation

Status: backlog | Owner: Codex | Reviewer: Claude copy | Estimate: 1.5 days | Risk: Medium

### Objective

Expose presets in room creation and show the selected pacing to every lobby member while preserving it through rejoin/rematch.

### Acceptance criteria

- Advanced settings stay collapsed until requested.
- Rejoin and rematch retain room settings.
- Players can see the current preset before start.

### Tests and verification

- Lobby component tests, server rejoin/rematch E2E, mobile layout, typecheck, and build.

---

## ASSIST-001 — Preferences and first-time onboarding

Status: backlog | Owner: Codex | Reviewer: Claude accessibility | Estimate: 2 days | Risk: Medium

### Objective

Add per-player assistance levels and a skippable first-table walkthrough stored locally.

### Acceptance criteria

- Off/basic/detailed choices persist.
- Walkthrough focus and controls are keyboard/touch accessible.
- Experienced players can disable it immediately.

### Tests and verification

- Preference storage, first-run/repeat-run, skip/resume, keyboard focus, compact viewport, reduced-motion tests.

---

## ASSIST-002 — Context help and unavailable-action reasons

Status: backlog | Owner: Codex | Reviewer: Claude copy/security | Estimate: 3 days | Risk: High

### Objective

Explain the current decision and why visible actions/targets are unavailable without revealing hidden information or choosing strategy.

### Acceptance criteria

- Stable reason codes map to friendly Thai copy.
- Explanations never disclose private hand/role information.
- Assistance can be disabled per player.

### Tests and verification

- Copy mapping tests, every legal-action reason, hidden-information snapshots, mobile positioning, and Table interaction regressions.

---

## TUT-001 — Tutorial scenario/controller foundation

Status: backlog | Owner: Codex | Reviewer: Claude scenario audit | Estimate: 2 days | Risk: High

### Objective

Create typed tutorial scenarios, steps, completion conditions, highlights, and local progress without embedding tutorial branches in the engine.

### Acceptance criteria

- Tutorial controller consumes real engine state/actions.
- Invalid scripted steps fail loudly in tests.
- Multiplayer production flow imports no tutorial-specific rule behavior.

### Tests and verification

- Scenario schema, step transition, invalid action, reset/resume, and isolation tests.

---

## TUT-002 — Basic lessons and scripted bot

Status: backlog | Owner: Codex + Claude content | Reviewer: Codex | Estimate: 3 days | Risk: Medium

### Objective

Teach draw/attack/target/end turn and dodge/damage/heal through deterministic playable scenarios.

### Acceptance criteria

- Lessons are replayable, skippable, and complete in about 10–15 minutes together.
- Bot behavior is scripted only by tutorial controller inputs.

### Tests and verification

- Golden scenario runs, wrong-action handling, bot progression, copy/anchor checks, mobile and reduced-motion tests.

---

## TUT-003 — Advanced lessons, resume, and polish

Status: backlog | Owner: Codex + Claude content | Reviewer: Codex | Estimate: 4 days | Risk: Medium

### Objective

Teach distance/equipment, tricks/judgment/Wuxie, roles/victory/skills, and finish tutorial navigation/progress.

### Acceptance criteria

- Scenarios use real card/general rules.
- Resume never restores a half-applied UI selection.
- Completion state is local and resettable.

### Tests and verification

- Deterministic lesson tests, resume/reset, all supported viewport sizes, and full engine/client regressions.

---

## MOB-001 — Mobile layout-mode and Safari hardening

Status: backlog | Owner: Codex | Reviewer: Claude accessibility | Estimate: 2 days | Risk: Medium

### Objective

Use one typed layout-mode policy and stabilize compact landscape under browser-toolbar and safe-area changes.

### Acceptance criteria

- 3/5/8/10-player layouts preserve real clockwise order.
- Toolbar changes do not oscillate layout mode during a decision.
- Touch targets and overlays remain usable at supported heights.

### Tests and verification

- 932×430, 844×390, 740×360, orientation/resize, safe-area, coarse pointer, and real-device checklist.

---

## REL-001 — Structured diagnostics and failure UX

Status: backlog | Owner: Codex | Reviewer: Claude security | Estimate: 1.5 days | Risk: Medium

### Objective

Add structured decision/reconnect/timeout/forfeit diagnostics and clear in-memory-session-loss messaging without logging secrets.

### Acceptance criteria

- Logs carry room/match/decision/action correlation IDs where available.
- Session tokens, hidden hands, roles, and private choices are excluded.
- Unhandled async failures are visible and do not silently strand a room.

### Tests and verification

- Logger field/redaction tests, timeout/fallback/reconnect E2E, failure popup tests, health/build checks.

---

## QA-001 — Milestone verification matrix

Status: backlog | Owner: Codex | Reviewer: Claude | Estimate: 2 days distributed | Risk: High

### Objective

Maintain targeted and full verification at every milestone and prevent test-count regression.

### Acceptance criteria

- Each task completion report records commands and counts.
- Full suite and build gate every milestone.
- Manual checks have named viewport/player-count/browser coverage.

### Tests and verification

- The matrix itself references all engine/server/client/presentation/tutorial risk areas and current baseline.

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
