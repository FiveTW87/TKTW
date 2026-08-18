# Claude Work Packages

Codex is the integration owner. Claude must read `SPEC.md`, `TASKS.md`, `DECISIONS.md`, and `HANDOFF.md` before accepting implementation work.

## Work available immediately — read-only audit

Copy this prompt to Claude:

```text
Repository: C:\Users\thanwalo\Desktop\TKTW

This is a READ-ONLY AUDIT. Do not edit, format, delete, install, commit, push,
or change dependencies. Codex is the integration owner.

Read:
- docs/hardening/SPEC.md
- docs/hardening/ROADMAP.md
- docs/hardening/TASKS.md
- docs/hardening/DECISIONS.md
- docs/hardening/HANDOFF.md

Deliver one Markdown report with:

1. Engine/client legality duplication matrix
   - client file:line
   - engine authority file:line
   - duplicated rule
   - drift risk P0/P1/P2
   - proposed LEGAL task

2. TypeScript risk audit
   - any, broad assertions, Record<string, unknown>, non-exhaustive switches,
     interchangeable string IDs, exact-optional risks
   - file:line, evidence, and suggested task ID

3. Engine test-gap audit
   - all cards/equipment, 25 generals, conversions, riders, hidden info,
     atomicity, replay, forfeit, rematch boundary
   - distinguish missing coverage from coverage that already exists

4. Tutorial scenario draft
   - draw/attack; dodge/heal; distance/equipment;
     tricks/judgment/Wuxie; roles/skills
   - initial state, objective, allowed actions, bot inputs,
     completion condition, Thai beginner copy

5. Accessibility/new-player audit
   - keyboard/focus, contrast, reduced motion, touch target size,
     dialogs, error explanations, unfamiliar terminology

Constraints:
- No Database/User/Score/C# recommendations.
- Do not propose replacing the generator engine without concrete evidence.
- Do not claim a bug without a reproducible path or code evidence.
- End with suggested bounded Claude tasks, including allowed and forbidden files
  and exact tests for each.
```

Expected destination after Codex review: `docs/hardening/reports/claude/initial-audit.md`.

## Work available after LEGAL-001 contract freeze

Claude may receive test-only tasks for:

- legal-action schemas and hidden projection;
- all-card and conversion coverage;
- all-general active-skill coverage;
- Jiedao, Fangtian, Zhangba, horse/range edge cases;
- rejected-answer atomicity.

Each task must name exact allowed test files. Shared schemas and production engine files remain forbidden unless Codex explicitly transfers ownership.

## Work available after ROOM-001 schema freeze

Claude may implement or extend server tests for:

- preset validation;
- default compatibility;
- create/quickstart settings;
- rejoin/rematch preservation;
- invalid bounds.

Claude must not change the schema shape or client UI in these tasks.

## Work available during Beginner Assist

Claude may draft/review:

- contextual Thai explanations;
- stable reason-code copy;
- first-time walkthrough copy;
- terminology glossary;
- accessibility checklist;
- hidden-information safety review.

Copy changes remain on a separate branch and move to `review`; Codex integrates them.

## Work available during Tutorial

Claude may own bounded scenario content and expected-state tests after `TUT-001` freezes the scenario schema. Claude must not add tutorial branches to the engine or change multiplayer rules.

## Work available before release

Claude performs an independent read-only review covering:

- SPEC conformance;
- hidden-information boundary;
- missing regression tests;
- accessibility and beginner journey;
- test-count and skipped-test audit;
- production risk checklist.

Findings require severity, evidence, reproduction, and a bounded suggested task. Codex decides integration status.
