# Milestone Verification Matrix

Last updated: 2026-08-25
Owner: Codex | Independent review: pending (Claude)

This is the repeatable verification contract for every hardening milestone. A task is not complete because its focused tests pass; the applicable row below and its evidence must also be recorded in `TASKS.md`.

## Automated gates

Run `pnpm verify:milestone` from the repository root. It deliberately runs package suites sequentially so the server timing tests do not compete with the engine fuzz suite.

| Gate | Command | Current baseline | Regression policy |
|---|---|---:|---|
| Type boundaries | `pnpm typecheck` | Engine, Shared, Server, Client pass | No source/test exclusions; any new error blocks completion |
| Engine authority | `pnpm --filter @tktw/engine test` | 41 files / 1,122 tests | Count may only decrease with a named removal and replacement rationale |
| Server/protocol | `pnpm --filter @tktw/server test` | 6 files / 76 tests | Reconnect, timeout, hidden view, idempotency, and diagnostics stay covered |
| Client/presentation | `pnpm --filter @tktw/client test` | 45 files / 300 tests | Table, mobile, effects, sound, assist, tutorial, and recovery stay covered |
| Production bundle | `pnpm build:client` | 305 modules transformed | Typecheck and Vite build must both pass |
| Physical catalog | `pnpm catalog:check` | 256 pass / 0 fail / 0 waived / 0 pending | Check is read-only; drift or missing implementation blocks completion |
| Diff hygiene | `git diff --check` | Clean | Whitespace errors block commit |

Current automated total: 92 test files / 1,498 tests. Shared has no runtime suite; its schemas and types are exercised by engine, server, and client contract tests and by root typecheck.

## Risk-to-evidence map

| Risk area | Minimum automated evidence | Manual evidence when visible behavior changes |
|---|---|---|
| Legality and hidden information | Engine legal-action/target/skill, retry-safety, identity, and server projection/E2E suites | Two viewers must not receive each other's hand, role, token, or private choice |
| Room and reliability | Server room manager, pacing, E2E, diagnostics; client ack/error/store tests | Disconnect/reconnect, ack timeout, grace forfeit, explicit leave, rematch |
| Table and presentation | Client Table/controller/transient/presentation/effect/sound suites | Changed state captured at desktop and compact landscape; reduced motion retains meaning |
| Mobile Safari | Device-mode, seat-layout, Table compact and overlay assertions | Safari landscape at 932×430, 844×390, and 740×360; rotate once at each size |
| Beginner Assist | Assistance store/preferences, context help, walkthrough, Table regressions | Off/basic/detailed; first visit, skip, resume, missing target, keyboard/Escape |
| Tutorial | Engine scenarios, server tutorial flow, client lesson/controller/progress/Coach suites | Fresh start, resume, replay, reset, finish every lesson without stale selection |
| Assets and audio | Art manifest/player art, SFX store/lifecycle, presentation fallback suites | Missing art/audio fallback, mute, volume, browser autoplay recovery |

## Named manual matrix

Manual cells are required only when the task touches that surface. Record `pass`, `fail`, or `not affected` with a reason; never leave an applicable cell blank.

| Surface | Required coverage |
|---|---|
| Desktop browsers | Current Chrome and Edge at 1440×900; Firefox smoke when Table/presentation changes |
| iPhone landscape | Safari-equivalent 932×430, 844×390, 740×360; real iPhone Safari before release |
| Player geometry | 3, 5, 8, and 10 seats; verify clockwise left/right order and self exclusion from illegal targets |
| Network lifecycle | Reconnect before grace, reconnect after room loss, action ack timeout, explicit leave/forfeit |
| Match lifecycle | Start, finish, and three consecutive rematches; no stale action/presentation/tutorial state |
| Accessibility | Keyboard path, visible focus, readable Thai recovery copy, mute, reduced motion |

## Completion evidence template

```md
Automated:
- `pnpm verify:milestone`: pass — Engine __/__, Server __/__, Client __/__, total __/__
- `git diff --check`: pass

Manual:
- Desktop Chrome/Edge 1440×900: pass | not affected — reason
- Compact Safari 932×430, 844×390, 740×360: pass | not affected — reason
- Players 3/5/8/10: pass | not affected — reason
- Network/match/accessibility cells: pass | not affected — reason

Known limitations:
- ...
```
