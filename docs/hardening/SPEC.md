# Core Hardening, Game Feel & Beginner Onboarding — Specification

Status: Approved for implementation planning
Created: 2026-08-18
Integration owner: Codex

## 1. Goal

Improve the existing game without adding a new product domain. The release must make the current rules safer to maintain, reduce duplicated legality logic, improve game feel, and help a first-time player finish a real match.

## 2. In scope

- Stronger TypeScript boundaries and exhaustive decision handling.
- Engine-authored, viewer-safe legal actions.
- Removal of duplicated legality rules from the client.
- Refactoring the table screen into typed controllers and presentational components.
- A typed and verified artwork manifest.
- Non-blocking presentation events, card motion, combat effects, and sound.
- Beginner, standard, fast, and custom lobby pacing presets.
- Per-player Beginner Assist stored locally.
- An interactive tutorial built on the real engine rules.
- Mobile-landscape hardening, diagnostics, accessibility, and release QA.

## 3. Explicitly out of scope

- Database, persistent user accounts, scores, ratings, leaderboards, or match history.
- A C# service or additional deployable backend.
- Recovery of active matches after a server-process restart.
- New generals, cards, role ratios, deck variants, or configurable core rules.
- Replacing Socket.IO, Zustand, React, or the deterministic generator engine.

## 4. Non-negotiable architecture rules

1. The engine is the sole authority for game legality.
2. The server derives player identity; the client never supplies an authoritative player ID.
3. Hidden information is removed before data reaches another viewer. CSS hiding is forbidden.
4. Untrusted input is validated before mutation. A rejected answer must remain retry-safe.
5. Gameplay never waits for animation or audio.
6. Presentation failure must not alter game state or block the next decision.
7. Tutorial logic wraps the real engine; tutorial-specific rules must not spread through the engine.
8. Room presets may change pacing and assistance defaults, but not core game rules.
9. Beginner Assist explains and highlights; it does not choose strategy or play for a human.
10. Every implementation task requires a written test plan and completion report.

## 5. Type-safety policy

- Keep `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` enabled.
- Prefer discriminated unions over string kind plus `Record<string, unknown>` payloads.
- Important switches must be exhaustive and end in an `assertNever` guard.
- IDs crossing package boundaries should use distinct types where practical.
- Runtime inputs and network boundaries remain Zod-validated.
- Database-shaped or internal engine types must not be exposed as public views.
- `any` is forbidden in new core-path code. A necessary assertion must be local and documented.

## 6. Legal-action target state

The engine should eventually expose enough viewer-safe information for the client to render an action without reproducing the rule. The exact union is finalized in `LEGAL-001`, but must cover:

- playable card IDs and conversion types;
- card and target minimum/maximum counts;
- eligible card and target IDs;
- usable active skills and per-turn availability;
- stable reason codes for actions that are visible but unavailable;
- decision ownership and hidden-information filtering.

The server must still revalidate every submitted answer. Legal actions improve UX; they are not authorization by themselves.

## 7. Presentation requirements

- Presentation events have stable IDs and deterministic ordering within a received view.
- New events are queued; initial mount and reconnect do not replay the entire match history.
- Missing DOM anchors are retried for a bounded period and then fail harmlessly.
- Reduced-motion mode preserves meaning without travel or particle-heavy animation.
- Sound has master/SFX controls, concurrency limits, preload/fallback behavior, and no autoplay dependency for critical feedback.
- Desktop and mobile consume the same presentation-event model.

## 8. Lobby and assistance requirements

Room presets:

- Beginner: slower decisions and bot pacing; recommend detailed assistance.
- Standard: current default pacing.
- Fast: shorter decisions and faster presentation.
- Custom: bounded pacing options only.

Player assistance:

- Off, basic, and detailed levels.
- First-table guided overlay that can be skipped.
- Contextual explanation of the current decision.
- Human-readable reasons for unavailable targets/actions.
- Preference stored in local storage until a future account system exists.

## 9. Tutorial requirements

The tutorial is scenario-driven and uses the real engine. It must cover:

1. Draw, attack, target, and end turn.
2. Dodge, damage, and heal.
3. Distance and equipment.
4. Tricks, judgment, and Wuxie.
5. Roles, victory conditions, and general skills.

The basic path should take about 10–15 minutes, be skippable, replayable, and resumable locally.

## 10. Definition of done

A milestone is complete only when:

- its acceptance criteria are met;
- required tests are added and passing;
- targeted typecheck/tests pass;
- milestone integration test, full test suite, and production build pass;
- hidden-information implications are reviewed;
- `TASKS.md`, `PROGRESS.md`, and `HANDOFF.md` are updated;
- the implementation is committed with its task ID;
- known limitations and follow-ups are recorded.

The release is complete when full games at 3, 5, 8, and 10 players, reconnect, timeout, leave/forfeit, three consecutive rematches, mobile-landscape, sound controls, reduced motion, Beginner Assist, and the tutorial have all passed their release checks.
