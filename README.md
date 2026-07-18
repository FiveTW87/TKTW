# TKTW — Three Kingdoms: Traitor Within

A Thai-language Sanguosha-style hidden-role card game engine (3–10 players).
Standard Edition rules, Identity Mode, built engine-first: a pure TypeScript
rules engine with no framework/network/DOM dependency, tested entirely
through Vitest and a headless CLI simulator — no UI needed to prove the
rules work.

## Status

| Phase | What it is | Status |
|---|---|---|
| **P0** | Engine core — RNG, event stack, decisions, turn loop, distance, judgment, HP/death, hidden-info filter | ✅ Done |
| **P1** | Full 104-card deck, all basic/instant/delayed tricks, all weapons/armor/horses | ✅ Done |
| **P2** | 25 generals with skills | ✅ Done — all 25 |
| **P3** | Identity Mode (role assignment, win conditions) | ✅ Done |
| **P4** | Server (Node + Socket.IO) | ✅ Done |
| **P5** | Client (React + Framer Motion) | ⬜ Not started |

All 25 generals across all three factions + Qun: โจโฉ, สุมาอี้ (both skills,
incl. the judgment-rewrite "อัจฉริยะปีศาจ"), แฮหัวตุ้น, เคาทู, เตียวเลี้ยว,
กุยแก, เตียวหุย, กวนอู, ขงเบ้ง, จูล่ง, ม้าเฉียว, หองหยิม, เล่าปี่, จิวยี่,
กำเหลง, ลิบอง, อุยกาย, ไต้เกี้ยว, ซุนซางเซียง, ลกซุน, ซุนกวน, เอียนสี, ฮัวโต๋,
ลิโป้, เตียวเสี้ยน.

Identity Mode (P3) is fully in: role proportions for every player count
3–10 (SPEC's table), lord always seat 0 with the rest shuffled, all four
win conditions including the traitor's narrower "sole survivor" case, and
the kill reward/penalty table (killing a rebel draws 3 regardless of who
did it; the lord killing a loyalist discards his own hand and gear).

General selection is a queue, one player at a time (lord first, then seat
order): the lord's 5 are always the 3 lord-skill generals (โจโฉ/เล่าปี่/
ซุนกวน — the only ones with a skill that needs `role === "lord"` to mean
anything) plus 2 random, everyone else is offered 3. A player can also send
no choice at all ("just randomize it for me") instead of waiting to
deliberate. Whatever's left unpicked each round — including any of the 3
lord-skill generals the lord passed on — goes back into the shared pool and
gets reshuffled, not queued in a fixed order, so the next player isn't
guaranteed to see specifically the previous player's leftovers, just a
random draw from everything still unclaimed. Nobody gets a duplicate
either way, and those 3 characters get more chances to actually be played
by someone, lord or not.

95 tests passing, including three 1000-game headless fuzz suites (bots-only,
all-25-generals-round-robin, and identity-mode across every player count)
that play full games to completion with no hangs or crashes, and confirm
every identity-mode game ends with exactly one of the three valid winner
sets.

Every function reachable from untrusted client input (P4's whole reason for
existing) was audited for validate-before-mutate ordering: a rejected/thrown
action must leave `state` byte-identical to before the call, so the future
server can safely re-prompt the same decision after an error instead of the
room ending up in a corrupted turn state. Real bugs this surfaced: a
usage-limit counter that could get bumped by a play later rejected on range,
and — the recurring one — several places that looped `discardFromHand` over
a player-submitted array of card ids one at a time, so a batch with one
valid id followed by one invalid/duplicate id would discard the valid card
before throwing on the rest. Fixed with a single reusable primitive,
`discardCardsFromHand` (`core/state.ts`), that validates every id is a
distinct card actually in hand before discarding any of them, now used at
every multi-card discard site (ทวนงูจั้งปา, ท้อ multi-card saves, 
กระบี่น้ำแข็ง/ขวานทะลุศิลา/ตัดเวรตัดกรรม's forced discards, the end-of-turn
hand-limit discard). `core/decisions.ts`'s `respond()` had the same class of
bug one layer up: it logged an answer to `decisionLog` *before* confirming
the engine accepted it, so a rejected answer got logged, and — since
`pendingDecision` isn't cleared on a throw — a later successful retry on the
same decision id logged a second entry under it, corrupting replay. Fixed by
only logging after the engine's `advance()` call succeeds. `tests/atomicity.test.ts`
covers both the primitive and several of these end-to-end through `respond()`.

## Architecture

```
packages/
  engine/            <- the whole rules engine (pure TS, zero deps beyond Vitest)
    src/
      core/          <- turn loop, event stack, triggers, decisions, distance,
                        judgment, damage, view (hidden-info filter)
      cards/         <- one file per card type's play/judge effect
      equipment/     <- weapon/armor hooks that aren't simple stats
      generals/      <- one file per general's skills
      modes/         <- identity.ts: roles, general selection, win conditions
      data/           <- cards.json (104-card deck, balance-verified)
      bots/          <- a deliberately dumb bot used for fuzz testing
      sim/           <- CLI entry point
    tests/
  server/            <- P4: Node + Socket.IO multiplayer server
    src/
      rooms/         <- RoomManager (room/session lifecycle, no socket.io)
                        and gameFlow (broadcast + decision-timeout wiring)
      protocol/      <- Zod schemas for every client->server event
      timeouts.ts    <- the 30s default-answer policy
      socketHandlers.ts, server.ts, index.ts
    tests/           <- socket.io-client end-to-end tests
```

Three kinds of hooks a general/equipment skill can register:

- **Trigger** (`TriggerPoint`) — reacts to something that already happened
  (`OnDamaged`, `OnDying`, `BeforeJudgeEffect`, …). Async, generator-based,
  can ask the owner a yes/no question before running.
- **Query** (`QueryHookName`) — a synchronous rule consulted while resolving
  something else (`canConvertCard`, `distanceModifier`, `shaUsageLimit`, …).
  Not an event — just a fact the engine asks for.
- **Active skill** — a player-initiated choice offered alongside "play a
  card" / "end phase" during the play phase (e.g. Zhou Yu's "กลไส้ศึก").

Every "who can see what" concern goes through a single function,
`projectFor(state, viewerId)`, that lives in the engine itself — not in a
server layer — so the same fuzz-testing bots that fake-play thousands of
games can never accidentally cheat by reading hidden state, which is what
makes the fuzz runs a meaningful integrity check rather than a happy-path
smoke test.

Decisions the engine is waiting on (dodge a สังหาร, respond to wuxie, judge
a card, etc.) are driven through plain JS generators for ergonomics, with
an event-sourced decision log alongside so a session can be reconstructed
after a crash/restart by replaying the recorded answers against a fresh
generator from the same seed — nothing about "what's currently paused" has
to be serialized directly.

## Running it

```bash
pnpm install
pnpm test          # full Vitest suite
pnpm sim --players 8 --seed 12345              # bare-mode headless game
pnpm sim --players 8 --seed 12345 --identity   # identity-mode: roles, generals, win condition
```

`pnpm sim` options: `--players 3-10`, `--seed <n>`, `--games <n>`, `--quiet`, `--identity`.

Identity mode's win condition and kill-reward rules are pluggable — they're
not in `engine/core/` at all, just two optional slots on `GameConfig`
(`checkGameEnd`, `onDeath`) that `modes/identity.ts` fills in. Bare mode
(P0-P2) uses the trivial default (`lastAliveWins`, no `onDeath`); `createGame`
gives you that, `createIdentityGame` gives you the real ruleset.

Getting all 25 generals in was also the real test of the three-hook design
(trigger / query / active skill from `core/activeSkill.ts`) — several gaps
in it only showed up once actual content needed them: card conversion
wasn't reachable from a player's own main-action play (only reactive
responses), `dodgeRequirement`/`duelShaRequirement` didn't say who was
attacking (needed for Lu Bu), สังหาร resolution had no way to redirect its
target mid-flight (needed for Dai Qiao), and a few trigger points existed
in name only with nothing ever firing them (`OnEquipmentLost`,
`OnHandEmpty`, `OnUseTrick`). Each was fixed in `engine/core/` *before*
writing the general that needed it, never worked around inside a general's
own file — by general #25 the hook surface is wide enough that it's a
reasonable bet the shape is basically done.

## Server (P4)

`packages/server` is a bare `http.createServer()` + Socket.IO — no Express,
no database, rooms live purely in memory (`Map<roomCode, GameRoom>`). That's
a deliberate spec constraint, not a shortcut: a room only needs to survive a
client's tab close/reopen while the process stays up, not a full server
restart. (`GameSession`'s event-sourced `decisionLog`/`recoverGame` machinery
already solves the harder crash-recovery problem and still exists in the
engine, just not wired in here as the primary reconnect path.)

- **Reconnect identity**: a room-scoped session token
  (`crypto.randomUUID()`), handed to the client once at `room:create`/
  `room:join` and presented again via `room:rejoin` — not `socket.id` (a new
  socket every reconnect) or IP/name matching (spoofable, ambiguous with
  duplicate names).
- **Protocol validation**: every client→server event payload is a Zod schema
  in `protocol/schema.ts`, checked before anything touches a room or the
  engine. Player identity is never trusted from the payload — the server
  always derives `playerId` from the session-token-authenticated seat, never
  from a client-supplied field.
- **Answer rejection is safe by construction**: `game:answer` calls the
  engine's `respond()` inside a `try/catch` and just reports the error back
  on failure. This only works because of the atomicity audit above — a
  thrown `respond()` is guaranteed to leave `state` and `pendingDecision`
  untouched, so the client can retry the exact same decision with no
  room-level recovery logic needed.
- **Decision timeout** (`timeouts.ts`, 30s default): reuses `simpleBotAnswer`
  for every decision kind except `mainAction` (play a card / use a skill),
  which times out to `endPhase` instead — auto-declining an AFK player's
  dodge/wuxie/discard is a reasonable default, auto-spending their cards and
  attacks on their behalf is not.
- **Room GC**: a room is deleted once every seat has been disconnected for
  longer than a grace period (default 30 minutes) — tracked as a single
  `emptySince` timestamp on the room, so a room with anyone still connected
  is never touched regardless of age.
- **Host**: the room creator; auto-transfers to the next connected seat if
  the host disconnects during the lobby. Minimum 3 players to start.

`RoomManager` (room/session lifecycle) and `gameFlow` (broadcast + timeout
scheduling) are both plain TypeScript with no socket.io dependency —
`socketHandlers.ts` is the only file that touches the transport, which is
what makes `tests/e2e.test.ts` possible over a real `socket.io-client`
connection without mocking anything.

```bash
pnpm --filter @tktw/server dev     # tsx watch, PORT env var (default 3001)
pnpm --filter @tktw/server start
pnpm --filter @tktw/server test    # socket.io-client end-to-end tests
```

Deploy target is a long-running host (Fly.io, Railway, a plain VM) — the
in-memory `GameSession`s and open WebSocket connections rule out serverless
platforms like Vercel/Netlify. `GET /health` returns `{"ok":true}` for
whatever health check the host wants.

## Design notes / known simplifications

- Card-conversion and passive query hooks are always consulted correctly
  scoped to their owner (`ctx.ownerId === payload.playerId`) — this was a
  real bug caught before it shipped: an early version let Guan Yu's "red
  card counts as สังหาร" apply to *every* player, not just him.
- A few Tier-B skills apply slightly more broadly than the literal spec
  wording for simplicity (e.g. Cao Ren's damage bonus applies to all damage
  he deals that turn, not just สังหาร/ดวล specifically) — flagged inline
  with `// simplification` comments at each site.
- The bundled bot is intentionally simple (no strategy, declines every
  optional/active skill by default) — it exists to prove the engine doesn't
  hang or crash across thousands of games, not to play well. A handful of
  the trickier interactions (bagua's judge-based dodge, zhangba's 2-card
  substitute sha, Zhou Yu's active skill) have dedicated focused tests
  instead, since the bot never triggers them on its own.

## Spec

Standard Edition, Identity Mode, 3–10 players. Card/general data was
redesigned from scratch (not copied from any existing implementation) so
the 104-card deck's probabilities land on clean numbers and there's no
GPL entanglement — see `tests/balance.test.ts` for the verified structure.

## Deploy (single service — put it online for people to try)

The whole game runs as **one service**: the Node/Socket.IO server also serves
the built client, so there's a single URL, no CORS, and **no reverse proxy
needed** (the platform terminates TLS and routes to your app's port).

**Constraints to know first:**
- Game state is **in-memory (no DB)** → run **exactly one instance** (no
  autoscaling / multiple replicas), and **a restart or redeploy drops every
  in-progress game** (players just start a new room). Fine for a "try it" demo.
- The server needs a host that keeps a **long-lived process + WebSockets** —
  **Railway / Render / Fly.io / a VPS**. Serverless (Vercel/Netlify functions)
  will *not* work for the server.

### Deploy to Railway or Render (Dockerfile)
1. Push this repo to GitHub.
2. Create a new service from the repo; pick **Docker / Dockerfile** as the build.
3. No env vars are required. (Optional: set `CLIENT_ORIGIN` to lock CORS to your
   domain. `PORT` is injected by the platform automatically.)
4. Deploy → you get a URL like `https://tktw-xxxx.up.railway.app`. Share it.

### Test the single-service build locally
```bash
pnpm --filter @tktw/client build          # → packages/client/dist
CLIENT_DIST=packages/client/dist PORT=3001 pnpm --filter @tktw/server start
# open http://localhost:3001 — the page AND the socket both come from :3001
```

### Split hosting (alternative)
Client on a static host (Cloudflare Pages / Netlify / Vercel) + server on
Railway/Render:
- Build the client with `VITE_SERVER_URL=https://your-server pnpm --filter @tktw/client build`.
- Run the server with `CLIENT_ORIGIN=https://your-client-domain` (CORS).
