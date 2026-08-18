# Test and Verification Baseline

Baseline date: 2026-08-18
Command executed during repository review: `pnpm test`

## Automated test result

| Package | Test files | Tests | Status |
|---|---:|---:|---|
| `@tktw/engine` | 37 | 1,087 | Passed |
| `@tktw/server` | 2 | 41 | Passed |
| `@tktw/client` | 19 | 162 | Passed |
| Total | 58 | 1,290 | Passed |

The engine baseline includes deterministic replay, atomicity/retry safety, 3–10-player identity games, 1,000-game fuzz suites, all card/equipment contracts, all registered generals, death/forfeit, hidden information, and physical-deck integrity.

The server baseline includes room lifecycle, authorization, reconnect, timeout, chat, grace/forfeit/abandon, result/rematch, GameView schema, hidden projection paths, and client-action idempotency.

The client baseline includes table actions, decisions, skills, card conversion, distance, mobile landscape at target viewport sizes, real seat ordering, effects, artwork, errors, sound preferences, lobby, role/general selection, result, tutorial-independent rules UI, and stuck-state guards.

## Required verification layers

### Per task

- Targeted unit/component/contract tests named in the task.
- Affected package typecheck.
- Affected package build when the task changes bundling/assets.
- `git diff --check`.

### Per milestone

- Root typecheck command created by `TS-001`.
- `pnpm test`.
- Production client/server build.
- Test counts compared with the previous milestone; decreases require an explicit reason.

### Release

- Full automated matrix.
- Complete games with 3, 5, 8, and 10 players.
- Two-browser multiplayer smoke test.
- Disconnect/reconnect, timeout, explicit leave/forfeit, and three rematches.
- Hidden-information inspection.
- 932×430, 844×390, and 740×360 automated viewport checks.
- Real iPhone Safari landscape check.
- Sound mute/volume, reduced motion, failed asset/audio fallback.
- Beginner/standard/fast rooms.
- Beginner Assist off/basic/detailed.
- Tutorial replay, skip, resume, and completion.
- Production deploy and `/health` smoke test.

## Completion report format

```md
Completed at:
Commit:
Status: review | completed

Changed:
Files changed:
Tests added or updated:
Targeted verification and counts:
Full verification and counts:
Typecheck:
Build:
Known limitations:
Follow-up tasks:
```
