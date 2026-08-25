# Hardening Progress

Last updated: 2026-08-25
Current milestone: Phase 10 — Mobile/Safari hardening completed
Overall status: `MOB-001` verified; `REL-001` is next

## Next task

- `REL-001` — Structured diagnostics and failure UX
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
- `TABLE-001` — Typed decision routing and authoritative main-action controllers extracted from `Table.tsx`.
- `TABLE-002` — Semantic selection transitions, transient UI lifetimes, and reconnect-safe sound routing extracted from `Table.tsx`.
- `TABLE-003` — Typed controls/action states, ordered overlays, SFX preferences, and recovery presentation extracted from `Table.tsx`.
- `ASSET-001` — Explicit typed artwork manifest for 25 generals, 125 selected files, and four known unmapped inventory files.
- `PRES-001` — Typed presentation-event model, silent-baseline queue, combat adapter migration, and failure isolation.
- `PRES-002` — Reconnect-safe presentation baseline, bounded target/source anchor retry, and reduced-motion outcome verification.
- `SFX-001` — Centralized synthesized playback, autoplay recovery, bounded logical-effect concurrency, and resilient preferences.
- `FX-001` — Typed card/equipment movement, semantic anchors, anonymous hidden-card cues, reduced motion, and bounded lifecycle.
- `FX-002` — Ordered combat/skill timelines, per-player pose arbitration, route labels, burst bounds, and phase-aligned SFX.
- `FX-003` — Public judgment/Wuxie sequencing, reconnect-safe turn/phase cues, and explicit urgent timer semantics.
- `FX-003` follow-up — Target-anchored Shandian lightning impact with miss/reduced-motion guards.
- `ROOM-001` — Strict named/custom pacing contracts, complete room-lifetime settings, legacy compatibility, and server-authoritative decision/grace/reveal/bot timing.
- `ROOM-002` — Typed create/quickstart preset UI, collapsed bounded Custom editor, and server-resolved lobby settings preserved through join/rejoin/rematch.
- `ASSIST-001` — Resilient per-player Off/Basic/Detailed preferences, reusable Lobby/Table settings, Beginner recommendation, and a skippable/replayable first-table orientation with semantic highlights.
- `ASSIST-002` — Exhaustive safe reason copy, narrow context-help model, and compact Basic/Detailed Table help with hidden-information and responsive verification.
- `TUT-001` — Strict client-only tutorial scenario/controller contracts, real accepted-action matching, fail-fast script validation, safe local progress, and production import isolation.
- `TUT-002` — Three deterministic playable basic lessons, isolated tutorial rooms, scenario-scripted bots, lesson picker, and acknowledged-action Table coach.
- `TUT-003` — Real distance/equipment, trick/Wuxie, and identity-role/skill lessons with exhaustive catalog, reconnect-safe progress, reset, and compact navigation polish.
- `MOB-001` — Shared typed layout snapshot, Safari-toolbar hysteresis, `visualViewport` table sizing, pointer-aware desktop protection, and responsive viewport verification.
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
| Engine | 41 | 1,122 | Passed |
| Server | 5 | 73 | Passed |
| Client | 44 | 295 | Passed |
| Total | 90 | 1,490 | Passed |

## Next actions

1. Start `REL-001` with structured diagnostics and player-facing recovery copy.
2. Follow with milestone/release QA.
3. Keep unrelated `App.tsx` line-ending changes out of every commit.

## Checkpoints

- `DOC-001`: `8dfb57e` (`DOC-001-hardening-execution-plan`).
- `TS-001`: `e75d6d3` (`TS-001-add-root-typecheck-gate`).
- `TS-002`: `98410dc` (`TS-002-add-typed-protocol-seams`).
- `LEGAL-001`: `950699e` (`LEGAL-001-add-action-union-schemas`).
- `LEGAL-002`: `5404729` (`LEGAL-002-add-card-play-options`).
- `LEGAL-003`: `0b0f6f0` (`LEGAL-003-add-authoritative-card-targets`).
- `LEGAL-004`: `c6f8f61` (`LEGAL-004-migrate-client-to-authoritative-skills`).
- `TABLE-001`: `04af1ae` (`TABLE-001-extract-table-controllers`).
- `TABLE-002`: `c0accf6` (`TABLE-002-deepen-table-lifecycles`).
- `TABLE-003`: `d737611` (`TABLE-003-extract-table-presentation`).
- `ASSET-001`: `da0f7ad` (`ASSET-001-add-typed-general-art-manifest`).
- `PRES-001`: `5259d14` (`PRES-001-add-presentation-event-queue`).
- `PRES-002`: `e3f0525` (`PRES-002-harden-presentation-lifecycle`).
- `SFX-001`: `50f7f9e` (`SFX-001-centralize-audio-lifecycle`).
- `FX-001`: `cbf5007` (`FX-001-add-card-equipment-motion`).
- `FX-002`: `a911816` (`FX-002-sequence-combat-feedback`).
- `FX-003`: `1e742d8` (`FX-003-add-table-state-feedback`).
- `ROOM-001`: `f8c0c08` (`ROOM-001-add-typed-room-pacing`).
- `ROOM-002`: `89164b7` (`ROOM-002-add-lobby-pacing-ui`).
- `ASSIST-001`: `9027eba` (`ASSIST-001-add-player-onboarding`).
- `ASSIST-002`: `c65bc71` (`ASSIST-002-add-contextual-action-help`).
- `ASSIST-002` completion record: `0a3dae2` (`ASSIST-002-record-completion`), pushed to `origin/main`.
- `TUT-001`: `b8d57ca` (`TUT-001-add-tutorial-controller-foundation`).
- `TUT-002`: `13ce21c` (`TUT-002-add-basic-playable-lessons`).
- `TUT-002` completion record: `995b7ee` (`TUT-002-record-completion`).
- `TUT-003`: `e554457` (`TUT-003-add-advanced-lessons-and-progress`).
- `TUT-003` completion record: `4feec64` (`TUT-003-record-completion`), pushed to `origin/main`.

## Known workspace notes

- `packages/client/src/App.tsx` is reported modified because its worktree line endings are mixed; content diff is empty. It is not part of `DOC-001` and must not be staged.
- Local cache/config and verified superseded untracked artwork are cleaned during `DOC-001` and listed in its completion report.
- Rooms remain in memory and are lost on a server restart; persistence is deliberately outside this cycle.

## Blockers

- No code or verification blocker; tutorial commits remain local until push is requested.
- ASSIST-001 changed-state screenshot capture hit the existing browser-plugin trusted-service failure before connecting; focused compact/resize/reduced-motion/accessibility tests and the complete Table/client suites passed, and no screenshot was fabricated.
- ROOM-002 screenshot capture hit the existing browser-plugin trusted-service failure; compact/accessibility and complete Lobby tests passed, and no screenshot was fabricated.
- FX-001 screenshot capture was unavailable because the in-app browser runtime rejected its own service before connecting to the local page; automated responsive and DOM verification passed.
- FX-003 changed-state capture hit the same browser-plugin trusted-service failure; focused visual-contract and full Table tests passed, and no screenshot was fabricated.
