# Hardening Progress

Last updated: 2026-08-24
Current milestone: Phase 5 — Room setup and beginner assistance
Overall status: `ROOM-001` completed; `ROOM-002` create/lobby UI migration is next

## Next task

- `ROOM-002` — Create/lobby UI and lifecycle preservation
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
| Engine | 40 | 1,116 | Passed |
| Server | 4 | 67 | Passed |
| Client | 32 | 241 | Passed |
| Total | 76 | 1,424 | Passed |

## Next actions

1. Start `ROOM-002` by migrating create/quickstart UI from the legacy decision-only value to the typed room settings envelope.
2. Broadcast the resolved host selection so lobby members can review the same server-authoritative rules across reconnect/rematch.
3. Keep settings immutable after room creation in this phase, continue one RED→GREEN behavior at a time, and keep the unrelated `App.tsx` worktree diff outside task staging.

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

## Known workspace notes

- `packages/client/src/App.tsx` is reported modified because its worktree line endings are mixed; content diff is empty. It is not part of `DOC-001` and must not be staged.
- Local cache/config and verified superseded untracked artwork are cleaned during `DOC-001` and listed in its completion report.
- Rooms remain in memory and are lost on a server restart; persistence is deliberately outside this cycle.

## Blockers

- No code or verification blocker for `ROOM-002`.
- FX-001 screenshot capture was unavailable because the in-app browser runtime rejected its own service before connecting to the local page; automated responsive and DOM verification passed.
- FX-003 changed-state capture hit the same browser-plugin trusted-service failure; focused visual-contract and full Table tests passed, and no screenshot was fabricated.
