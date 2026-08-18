# Hardening Roadmap

This roadmap is ordered by dependency. Calendar estimates assume one integration owner with bounded Claude assistance after contracts are stable.

| Phase | Deliverable | Estimate | Primary owner | Dependency |
|---|---|---:|---|---|
| 0 | Documentation, cleanup, and baseline | 1 day | Codex | — |
| 1 | TypeScript foundation | 1–2 days | Codex | Phase 0 |
| 2 | Typed legal actions | 4–6 days | Codex | Phase 1 |
| 3 | Table controller refactor | 2–3 days | Codex | Phase 2 contract |
| 4 | Typed asset manifest | 1–2 days | Codex | Phase 1 |
| 5 | Presentation architecture and audio manager | 2–3 days | Codex | Phases 2–4 |
| 6 | Card motion, combat, judgment, Wuxie, and sound | 6–9 days | Codex | Phase 5 |
| 7 | Lobby pacing presets | 2–3 days | Codex + Claude tests | Phase 2 |
| 8 | Beginner Assist | 5–8 days | Codex + Claude copy | Phases 2, 3, 7 |
| 9 | Interactive tutorial | 8–12 days | Codex + Claude scenarios | Phases 2, 5, 8 |
| 10 | Reliability, mobile, and accessibility | 2–4 days | Codex + Claude audit | Phases 5–9 |
| 11 | Full QA and release | 3–5 days | Codex | All phases |

## Suggested calendar

### Week 1

- Documentation and baseline.
- TypeScript foundation.
- Begin legal-action contract.
- Claude performs read-only engine/type/test audits.

### Week 2

- Complete legal-action derivation and projection.
- Begin client migration.
- Freeze the public legal-action contract.

### Week 3

- Finish client migration.
- Refactor Table controllers.
- Create typed asset manifest.
- Claude adds bounded legal-action contract tests.

### Week 4

- Presentation-event queue.
- Audio manager.
- Card draw/play/discard/equipment motion.

### Week 5

- Attack/response/hit/dodge/heal/skill/death sequences.
- Judgment and Wuxie presentation.
- Lobby preset implementation.

### Week 6

- Beginner Assist preferences and onboarding.
- Contextual decision help and unavailable-action reasons.

### Week 7

- Tutorial controller and lessons 1–2.
- Convert bot quickstart into a guided practice entry point.

### Week 8

- Tutorial lessons 3–5.
- Reliability, mobile, and accessibility hardening.

### Week 9

- Full QA, regression fixes, documentation reconciliation, production build, and smoke test.

## Release slices

1. Core-safe release: phases 0–4.
2. Game-feel release: phases 5–7.
3. Beginner release: phase 8 and tutorial lessons 1–2.
4. Complete onboarding release: remaining tutorial, hardening, and release QA.

## Scope-cut option

If time is constrained, ship phases 0–8 plus tutorial lessons 1–2. Defer advanced tutorial lessons, background music, haptics, and per-general cinematic effects. Do not cut type safety, legal-action migration, hidden-information tests, or release QA.
