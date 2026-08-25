# Test and Verification Baseline

Baseline date: 2026-08-25
Canonical command: `pnpm verify:milestone`

## Typecheck and build result

- `pnpm typecheck` checks engine, shared, server, and client with their existing TypeScript include lists.
- All four packages pass `tsc --noEmit`.
- The production client build passes with 305 modules transformed.
- Engine contract tests remain inside typechecking; no test or source directory was excluded to make the gate pass.
- `pnpm catalog:check` reports 256 pass, 0 fail, 0 waived, and 0 pending.

## Automated test result

| Package | Test files | Tests | Status |
|---|---:|---:|---|
| `@tktw/engine` | 41 | 1,122 | Passed |
| `@tktw/server` | 6 | 76 | Passed |
| `@tktw/client` | 45 | 300 | Passed |
| Total | 92 | 1,498 | Passed |

The canonical milestone command runs package suites sequentially because earlier parallel runs could starve timing-sensitive server E2E while engine fuzz suites were competing for resources. `pnpm catalog:check` is read-only and passed a byte-for-byte SHA-256 before/after check.

The engine baseline includes deterministic replay, atomicity/retry safety, 3–10-player identity games, 1,000-game fuzz suites, all card/equipment contracts, all registered generals, death/forfeit, hidden information, and physical-deck integrity.

The server baseline includes room lifecycle, authorization, reconnect, timeout, chat, grace/forfeit/abandon, result/rematch, GameView schema, hidden projection paths, and client-action idempotency.

The client baseline includes semantic selection transitions, transient UI lifetime/timer rules, reconnect-safe table sound routing, direct decision/main-action controller coverage, table actions, skills, card conversion, authoritative target contracts, mobile landscape, effects, artwork, errors, sound preferences, lobby, role/general selection, result, rules UI, and stuck-state guards.

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
