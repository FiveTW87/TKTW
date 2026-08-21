# Hardening Decisions

## DEC-001 — Stabilize before adding persistence

Date: 2026-08-18
Decision: Database, accounts, scores, ratings, leaderboard, and C# services are excluded from this cycle.
Reason: The existing gameplay boundary, type safety, presentation, and onboarding should stabilize before adding a persistent product domain.

## DEC-002 — Codex is integration owner

Date: 2026-08-18
Decision: Codex owns shared contracts, cross-package integration, UI/presentation, final verification, and progress documents.
Reason: Typed legal actions cross engine, shared, server, and client boundaries and require one consistent owner.

## DEC-003 — Claude receives bounded work

Date: 2026-08-18
Decision: Claude begins with read-only audits and later receives test-only, scenario-content, server-test, accessibility, and independent-review tasks with explicit allowed/forbidden files.
Reason: Parallel work is useful only after contracts are stable and file ownership cannot collide.

## DEC-004 — Engine remains the legality authority

Date: 2026-08-18
Decision: The engine produces legal actions; client mirrors are removed when the replacement view is available. The server still revalidates answers.
Reason: Duplicate client/engine legality can drift and create false-enabled or false-disabled UI.

## DEC-005 — Presentation never controls gameplay

Date: 2026-08-18
Decision: Effects and audio consume state/log-derived presentation events and may be skipped, accelerated, or fail without delaying the game session.
Reason: Network play must not freeze because an animation, image, DOM anchor, or audio asset failed.

## DEC-006 — Presets change pacing, not rules

Date: 2026-08-18
Decision: Beginner/standard/fast/custom settings may tune bounded decision, bot, grace, assistance, and presentation pacing. They do not change HP, deck composition, roles, card rules, or skills.
Reason: Arbitrary rule variants multiply the test matrix and fragment player expectations.

## DEC-007 — Assistance is per player

Date: 2026-08-18
Decision: Hosts may choose a beginner-friendly room preset, but each player controls their own assistance level.
Reason: New players need help without forcing explanatory overlays on experienced players.

## DEC-008 — Tutorial uses the real engine

Date: 2026-08-18
Decision: Tutorial scenarios provide initial state, allowed UI actions, objectives, and scripted bot inputs around the existing engine.
Reason: A duplicated tutorial rule implementation would drift from multiplayer behavior.

## DEC-009 — Every task is test-gated

Date: 2026-08-18
Decision: A task cannot start without scope, acceptance criteria, edge cases, and a test plan; it cannot complete without recorded verification and a completion report.
Reason: The cycle spans multiple agents and long-lived context, so tests and durable records prevent silent scope loss.

## DEC-010 — Prefer derived unions and models over blanket enums

Date: 2026-08-21
Decision: Reused values are modeled with shared types/interfaces, catalog-derived string unions, `as const` maps, or discriminated unions. TypeScript enums are reserved for cases that genuinely need a runtime namespace.
Reason: JSON catalogs, Zod schemas, network payloads, and exhaustive action handling compose more directly with string unions while avoiding duplicated runtime values.

## DEC-011 — Brand IDs at validated seams, not throughout engine state

Date: 2026-08-21
Decision: Zod brands distinguish player, card, match, decision, and client-action IDs after external parsing. The engine's serializable state and wire values remain plain strings for now.
Reason: This prevents accidental ID interchange where packages meet while avoiding a high-risk rewrite of every internal engine function and saved deterministic fixture.

## DEC-012 — Legal actions are viewer capabilities, not decision copies

Date: 2026-08-21
Decision: `legalActions` is a viewer-owned discriminated union (`playCard`, `useSkill`, `response`, `draw`, `discard`, `endPhase`). The originating engine decision remains available separately as `decisionKind` only where a response needs context.
Reason: Consumers should route by what the viewer can do, while the server keeps decision ownership and hidden-information gating authoritative.

## DEC-013 — Capability discovery is separate from current legality

Date: 2026-08-21
Decision: Card-play options may report a conversion the player owns as currently unavailable with a stable reason, while command validation continues to evaluate the real turn/response context.
Reason: A beginner-facing UI must distinguish “this ability exists but cannot be used now” from “this card has no such conversion,” without weakening server-authoritative rules such as Hua Tuo's outside-own-turn restriction.

## DEC-014 — Target contracts model selection shape explicitly

Date: 2026-08-21
Decision: Card targets use a discriminated contract for no-selection, fixed automatic targets, independent selections, and dependent ordered selections. Jiedao publishes a public first-target list plus second targets keyed by the chosen armed player.
Reason: A single flat target list cannot represent ordered dependent choices safely, while enumerating every permutation would inflate GameView payloads and complicate touch interaction. The explicit shapes remain compact for 3–10 players and preserve server revalidation.

## DEC-015 — Active skills declare authoritative selection metadata

Date: 2026-08-21
Decision: Every player-initiated active skill declares its card-count and target-rule metadata beside the engine handler. The engine derives owner-only availability and validates the same contract atomically before the handler runs; clients only render the projected options.
Reason: A separate client skill-spec table duplicated usage limits and eligibility rules, could drift from handlers, and allowed invalid no-op submissions such as empty Zhiheng selections.

## DEC-016 — Table orchestration uses two deep controller modules

Date: 2026-08-21
Decision: Decision ownership/automatic-answer routing lives in `useDecisionController`, while authoritative card/skill/target interpretation lives in `mainActionController`. `Table.tsx` composes their typed interfaces and retains presentation state until the later Table tasks.
Reason: These two modules keep decision policy and target-contract interpretation local and independently testable. Splitting the same logic into many small pass-through helpers would increase interfaces without reducing the amount of gameplay orchestration a caller must understand.

## DEC-017 — Selection, transient UI, and table sound use distinct lifetimes

Date: 2026-08-21
Decision: `useInteraction` owns semantic selection transitions keyed to every authoritative decision; `useTableTransientUi` owns decision/table/timer/match UI lifetimes; `useTableSfx` owns snapshot-diff sound routing and reconnect baselines. The pure main-action module continues to interpret authoritative `legalActions`.
Reason: Combining these lifetimes under main action would couple discard/reactive selection and reconnect presentation to one route. Three deep modules keep transition ordering, modal lifetime policy, and sound replay prevention local behind small interfaces.

## DEC-018 — Table presentation uses concrete typed compositions

Date: 2026-08-21
Decision: Fixed table controls use one discriminated action view model, while overlays use one concrete ordered presentation model rendered as sibling fragments. Neither module reads the game store, and `Table.tsx` remains the composition owner.
Reason: A generic overlay array or many tiny wrapper components would move ordering and field knowledge back into the caller. Two concrete modules preserve fixed-position DOM contracts and modal semantics while making impossible action-state combinations unrepresentable.
