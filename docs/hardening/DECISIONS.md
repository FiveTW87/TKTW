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
