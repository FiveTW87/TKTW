# Test and Verification Baseline

Baseline date: 2026-08-21
Commands executed through `TABLE-001`: targeted Vitest, `pnpm typecheck`, full package Vitest, `pnpm build:client`, `pnpm catalog:check`

## Typecheck and build result

- `pnpm typecheck` checks engine, shared, server, and client with their existing TypeScript include lists.
- All four packages pass `tsc --noEmit`.
- The production client build passes with 200 modules transformed.
- Engine contract tests remain inside typechecking; no test or source directory was excluded to make the gate pass.
- `pnpm catalog:check` reports 256 pass, 0 fail, 0 waived, and 0 pending.

## Automated test result

| Package | Test files | Tests | Status |
|---|---:|---:|---|
| `@tktw/engine` | 40 | 1,114 | Passed |
| `@tktw/server` | 3 | 58 | Passed |
| `@tktw/client` | 21 | 172 | Passed |
| Total | 64 | 1,344 | Passed |

The root parallel suite produced one 20-second quickstart-bot timeout while the client suite and engine fuzz suites were competing for resources. The same quickstart group then passed alone in 4.3 seconds, and the complete server suite passed separately with all 58 tests; no functional failure remained.

The engine baseline includes deterministic replay, atomicity/retry safety, 3–10-player identity games, 1,000-game fuzz suites, all card/equipment contracts, all registered generals, death/forfeit, hidden information, and physical-deck integrity.

The server baseline includes room lifecycle, authorization, reconnect, timeout, chat, grace/forfeit/abandon, result/rematch, GameView schema, hidden projection paths, and client-action idempotency.

The client baseline includes direct decision/main-action controller coverage, table actions, decisions, skills, card conversion, authoritative target contracts, distance, mobile landscape at target viewport sizes, real seat ordering, effects, artwork, errors, sound preferences, lobby, role/general selection, result, tutorial-independent rules UI, and stuck-state guards.

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
