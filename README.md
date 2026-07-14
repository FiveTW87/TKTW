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
| **P4** | Server (Node + Socket.IO) | ⬜ Not started |
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
lord-skill generals the lord passed on — queues at the front of the shared
pool for the next player, which both guarantees nobody gets a duplicate and
gives those 3 characters more chances to actually get played by someone,
lord or not.

87 tests passing, including three 1000-game headless fuzz suites (bots-only,
all-25-generals-round-robin, and identity-mode across every player count)
that play full games to completion with no hangs or crashes, and confirm
every identity-mode game ends with exactly one of the three valid winner
sets.

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
