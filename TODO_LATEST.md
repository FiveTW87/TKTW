# TKTW — Ordered Master TODO

> ใช้คู่กับ `SPEC_v1.3_ALL_REQUIREMENTS.md`  
> ห้ามเริ่ม Final UI ก่อน Gate ของ Engine, Room, Hidden Information และ Match Lifecycle ผ่าน

Legend:

- `[ ]` ยังไม่เริ่ม
- `[-]` กำลังทำ
- `[x]` เสร็จ
- `[!]` Blocked
- `DECISION CONFIRMED` หมายถึง Requirement ตัดสินแล้ว แต่ยังไม่ใช่ Implementation Done
- ใช้ `[x]` เฉพาะเมื่อโค้ดถูกแก้, Test ผ่าน และ Review ผ่านแล้วเท่านั้น

---

## Phase 0 — Baseline / Decisions

- [x] รันและบันทึก Test baseline (engine 193 · server 13 · client 50 · typecheck สะอาด)
- [x] แยก existing failures (ไม่มี failure เดิม)
- [x] ~~ตั้ง stabilization branch~~ — ตัดสินใจทำบน `main` (ต่อ deploy เดิม)
### Decisions confirmed — ยังไม่ใช่งานที่แก้โค้ดเสร็จ

- **DECISION CONFIRMED:** “ส่งไปส่อง” ทำงานถูกต้อง ไม่ต้องแก้ Logic
- **DECISION CONFIRMED:** Draw interaction — กดจั่วเอง และ timeout จั่วอัตโนมัติ
- **DECISION CONFIRMED:** Draw skill policy — Optional prompt ก่อนจั่ว, Mandatory modifier ทำพร้อมการจั่วและแจ้งสกิล
- **DECISION CONFIRMED:** Role timing — เปิด Role ของตนก่อนเลือก General
- **DECISION CONFIRMED:** General reveal — เจ้าเมืองเปิดทันที, คนอื่นเปิดพร้อมกันเมื่อเลือกครบ
- **DECISION CONFIRMED:** Grace expiry — ถือว่าเสียชีวิต; เจ้าเมืองออกแล้วจบแบบไม่มีผู้ชนะ
- **DECISION CONFIRMED:** Match Seat — สุ่มทุก Match รวม Match แรก
- **DECISION CONFIRMED:** โจโฉ reproduction — Trigger ผิดเมื่อพันธมิตรก๊กเดียวกันได้รับ Damage
- **DECISION CONFIRMED:** Result role reveal — เปิดทุก Role พร้อม Winner และสถิติ

> หมายเหตุ: รายการด้านบนหมายถึง Requirement ถูกตัดสินแล้วเท่านั้น งาน Implementation และ Test ที่เกี่ยวข้องยังต้องใช้ `[ ]` จนกว่าจะลงโค้ดและผ่าน Review จริง

## Phase 1 — Engine ✅ เสร็จ (บน `main`, commit ทีละ ENG)

- [x] ENG-001 Reproduce bugs (tests-first ต่อทุก ENG)
- [x] ENG-002 Discard min/max/exact + selectableCardIds — `839779c`
- [x] ENG-004 Implement Draw flow — `d13e20e`
  - [x] ปุ่มกดจั่ว
  - [x] Timeout จั่วอัตโนมัติ
  - [x] Optional DrawPhase skill prompt (เตียวเลี้ยว/เคาทู)
  - [x] Mandatory Draw modifier + skill notification (จิวยี่ +banner)
  - [x] ป้องกัน double draw/retry (decision resolve ครั้งเดียว)
- [x] ENG-005 อสนีบาตเวียนค่าย (เป้าตาย/ส่งต่อข้ามคนตาย) — `a8e7708`
- [x] ENG-006 Fix โจโฉ owner-only `OnDamaged` trigger — `f722a33`
  - [x] เพิ่ม failing test กรณีพันธมิตรก๊กเดียวกันโดน Damage
  - [x] แก้ Trigger scope (OWNER_FILTER_FIELD: OnDamaged/OnHPLost → targetId)
  - [x] Test โจโฉโดนเองแล้วเก็บการ์ดได้
  - [x] Test คนอื่นโดนแล้วไม่ Trigger (+ โจโฉตายไม่ trigger)
- [x] ENG-007 ขงเบ้งเรียงการ์ด (validate + ซ่อน card ids จากคนอื่น) — `c2f2ca6`
- [x] ENG-008 Death flow (ตายครั้งเดียว + audit) — `c7123db`
- [x] ENG-009 Structured game logs (61 จุด → eventType+ids + client resolver) — `855eb7f`
- [x] Audit validate-before-mutate (`atomicity.test.ts`)
- [x] Audit duplicate/retry (`retrySafety.test.ts` + rebuild)
- [x] Run 3-player simulation (`fullGame.test.ts`)
- [x] Run 10-player simulation (`fullGame.test.ts` + `tenPlayerSoak.ts` — 0 crash/hang)
- [x] GPT/ultra Engine Review — `/code-review` รันแล้ว, findings 5 ข้อแก้ครบ (`c1a9b1c`)

> เพิ่มเติมที่แก้ระหว่างทาง: freeze-on-reject, ลิโป้ต้องลงหลบ/สังหาร 2 ใบพร้อมกัน,
> hujia ยิงเฉพาะตอนโดนตี, สายฟ้า targetRule "self" (วางที่ตัวเอง)

## Phase 2 — Identity / Room / Rejoin — โค้ดเสร็จ (รอ Room Review)

> แบ่ง 2 ก้อน: **Part A (6.1–6.4)** `e3c2c76` · **Part B (6.5–6.6)** `b232569`
> Gate ผ่าน: engine 222/222 · server e2e 20/20 · client 50/50 · tsc สะอาดทุก package

### Part A — Identity · Leave (lobby) · Auto-rejoin · Connection status — `e3c2c76`

- [x] Stable playerId/sessionToken (server-derived `p{seat}`, spoof ไม่ได้)
- [x] Remove displayName/socket identity (token คือ identity)
- [x] Prevent name takeover (reject ชื่อซ้ำ case-insensitive)
- [x] Explicit leave-room (lobby: ลบ seat + revoke + re-index; mid-match ดู Part B)
- [x] Fix stale name (RoomState broadcast per-socket + `yourSeatIndex`)
- [x] Host transfer (leaveLobby/disconnect reassign host ใน lobby)
- [x] Remove manual Rejoin
- [x] Automatic Rejoin (initial load + live reconnect ผ่าน token)
- [x] Restore Seat/Turn/Phase/Decision/Deadline (matchId + decisionExpiresAt + projected view; deadline แบบ lightweight)
- [x] Reset stale local selection (DecisionModal reset ตาม pending.id — ยืนยันแล้ว)

### Part B — Grace-expiry death · Leave-mid-match · Abandoned — `b232569`

- [x] Configurable Grace Period default 45s (env `GRACE_PERIOD_MS` + opts)
- [x] Revoke expired token (revokeSeatToken ตอน grace หมด/ออกกลางเกม — คง seat ตาม 6.7)
- [x] Implement Grace-expiry death policy (replay-safe forfeit ใน decisionLog)
  - [x] เปิด Role
  - [x] ล้าง Hand/Equipment/Delayed Tricks
  - [x] ไม่มี Killer/Reward (ไม่ยิง OnDeath, ไม่เรียก onDeath)
  - [x] ตรวจ Victory Condition (non-lord → identityCheckGameEnd)
  - [x] เจ้าเมืองออกแล้วจบแบบ no_winner (แยก path จาก killPlayer)
- [x] Leave-mid-match = forfeit ทันที (ไม่รอ grace)
- [x] All-other-players-gone flow (RoomPhase `abandoned` เมื่อไม่มี human connected)
- [x] Rejoin E2E matrix (dup-name · leave+revoke · forged-token · reconnecting · grace→gone · leave-mid-match · abandoned)
- [ ] GPT Room Review (`/code-review` — ผู้ใช้สั่งเอง)

## Phase 3 — Hidden Information / Selection

> **Closed.** Reconciled against Phase 4 (the seat-reshuffle item) and filled the last two small
> gaps: role/hand projection now have dedicated regression tests (`identity.test.ts`), and the
> inspect panel shows public skills (`InspectModal.tsx` + `table.test.tsx`). engine 239 · client 54,
> typecheck clean. Only two items are left, and both are intentionally left to the user: DevTools
> network inspection (manual pass) and GPT Security Review (user-triggered).

- [x] Audit Role projection (`identity.test.ts`: alive non-lord hidden, lord/self/dead visible)
- [x] Audit hand projection (`identity.test.ts`: opponent hand is `{count}`, own hand is the real array)
- [x] Audit General choices (`identity.test.ts`: pickGeneral candidates never reach a non-responder)
- [x] Audit private Skill decisions (`guandou.test.ts`: peeked card ids owner-only)
- [x] Audit reconnect payload (rejoin's `sendViewTo` → `projectFor`, same per-viewer filter; e2e-tested)
- [x] Implement Role reveal screen before General selection
  - [x] แสดงเฉพาะ Role ของตน
  - [x] ใช้ Deadline เดิมเมื่อ Rejoin
  - [x] เจ้าเมืองเป็น Public ตามกฎ
- [x] Randomize Match Seat and Role independently
  - [x] Match แรก (role→seat)
  - [x] Rematch (player→seat reshuffle — done in Phase 4, `RoomManager.startGame` `seatAssignment`)
  - [x] เจ้าเมืองไม่ผูก Seat 1
  - [x] เจ้าเมืองเริ่มเทิร์นแรกจาก Seat ที่สุ่มได้
- [x] General selection timer
- [x] Implement General selection reveal flow
  - [x] เจ้าเมืองเลือกก่อน
  - [x] เปิดนายพลเจ้าเมืองทันที
  - [x] ผู้เล่นอื่นเลือกแบบส่วนตัวตามลำดับ
  - [x] เปิดนายพลคนอื่นพร้อมกันเมื่อเลือกครบ
- [x] Non-lords select privately in seat order and reveal together
- [x] Own choices only
- [x] Random/Confirm/Waiting
- [x] View public skills (`InspectModal.tsx` now lists `generalSkills()` — name/description, 主公/技 badges)
- [ ] Network payload inspection (manual DevTools pass — user-triggered)
- [ ] GPT Security Review (user-triggered)

## Phase 4 — Match End / Rematch

> Code-complete for the scope agreed via `/grill-me`: pragmatic extension of the flat `GameRoom`
> (no literal Room/Match object split — SPEC §8.1's split is illustrative, not a gate requirement),
> true player→seat permutation every match, engine-pure `summarizeMatch()` + `game:result` event,
> minimal `matchId` guard (full `MatchCommandEnvelope`/`clientActionId` idempotency stays Phase 5),
> host-driven rematch with no ready-flags. engine 236 · server 35 · client 53, typecheck clean on
> all 4 packages. GPT Lifecycle Review skipped this phase per user (same as Phase 3's security review).

- [x] Separate Room/Match (pragmatic: `result`/`matchStartedAt`/`seatAssignment` on `GameRoom`, not a literal split)
- [x] Unique Match ID (fresh matchId + fresh seed every `startGame`, including rematch — fixes a latent identical-replay bug)
- [ ] Command envelope + clientActionId (deferred to Phase 5, §9.1)
- [x] Reject old Match action (`game:answer` stamped + checked against `room.matchId`)
- [x] Finish/abandon statuses
- [x] Cancel timers/decisions on finish
- [x] Implement Result screen
  - [x] เปิด Role ทุกคน
  - [x] แสดง Winner/No Winner
  - [x] แสดงสาเหตุจบเกม
- [x] Implement post-game statistics
  - [x] Most kills
  - [x] Most damage taken
  - [x] ไม่นับ Skill HP cost เป็น Damage
  - [x] Disconnect death ไม่มี Killer
- [x] Handle tied stat leaders
- [x] No-winner result when Lord leaves/expires
- [x] Return to same Lobby
- [x] Reuse Socket
- [x] Fresh Match state
- [x] Randomize Seat every Match including first/rematch (true player→seat permutation, §8.2)
- [ ] Ready/minimum players — MIN_PLAYERS check reused as-is; per-player "ready" flags explicitly NOT added (decision: host-driven restart, no ready gate)
- [x] Host transfer post-game
- [x] Rematch x3 E2E
- [ ] GPT Lifecycle Review

## Phase 5 — Projected View / Protocol

> Code-complete for the scope locked via `/grill-me`: one unified server-assembled `GameView`
> (`@tktw/shared/protocol/views.ts`, Zod schemas + `z.infer` types — one source of truth), decision-scoped
> `legalActions` (`engine/core/legalActions.ts`'s `legalActionsFor`, viewer-gated so only the actual
> decision-owner ever gets a non-empty list), and a `clientActionId` idempotency envelope on
> `game:answer` only (per-match `answeredActionIds` cache replays the original success ack on a
> lost-ack retry instead of misreporting "stale"). Engine's projection type renamed to
> `ProjectedGameState`/`ProjectedPlayer` to free up `GameView` for the shared package. Client consumes
> the unified view exclusively (`gameStore.ts`), never engine internals (§9.5 gate already held).
> Full migration of every `gameView.*` field reference across Table.tsx/DecisionModal.tsx/
> GeneralSelect.tsx/Result.tsx/PlayerTile.tsx (including fixing a real latent bug — Phase 4's
> `connectionStatus` cross-referenced from `roomState.seats[...]` by parsing the player id, now read
> directly off each `PlayerView`). engine 246 · server 38 · client 54, typecheck clean across all 4
> packages. Only GPT Protocol Review is left, and it's user-triggered.

- [x] GameView (`shared/protocol/views.ts` `gameViewSchema`; assembled server-side in `gameFlow.ts`'s `assembleGameView`)
- [x] PlayerView (adds server-injected `connectionStatus` via `seatAssignment`, not a client-side cross-ref)
- [x] DecisionView (`startedAt`/`expiresAt` timer fields, §9.4)
- [x] LegalActionView (decision-scoped, from `engine/core/legalActions.ts`'s `legalActionsFor`; viewer-gated hidden-info test in `legalActions.test.ts`)
- [x] GameLogView
- [x] MatchResultView (wraps Phase 4's `MatchResult` — one Zod-derived definition, no duplicate)
- [x] serverNow/expiresAt (`assembleGameView` stamps `serverNow: Date.now()`; timers carried alongside)
- [x] Equipment/Delayed Tricks (`judgmentZone` on `PlayerView`, unchanged from Phase 3 shape)
- [x] Latest vs resolving card (`engine/core/legalActions.ts`'s `deriveLatestAndResolvingCard`, from the wuxie-window `eventStack`)
- [x] Zod validation (schemas are the single source; `z.infer` types, validated at assemble/test boundary per locked scope — not client hot-path)
- [x] Projection snapshots (`legalActions.test.ts` + server `e2e.test.ts`'s "SPEC 9" block: full shape assertion + `gameViewSchema.safeParse`)
- [ ] GPT Protocol Review (user-triggered)

## Phase 6 — Thai Naming

> Code-complete for the scope locked via `/grill-me`: values swapped in place in the 4 existing
> client dictionaries (no flat i18n keyspace refactor — that stays Phase 7+), every inline name
> literal that bypassed the dictionaries (`logResolver.ts`, `decisionCopy.ts`, `RulesModal.tsx`,
> `Table.tsx`) now routes through `cardDisplay()`/`skillById()`, and catalog summaries/descriptions
> were adopted as canonical (not names-only). Engine's one Thai-log exception (`machao.ts`'s
> `tieqi` judgment, which stored a full Thai sentence as `eventType`) was fixed in a separate
> commit to structured `log(eventType, params)` + a new `logResolver.ts` case — engine is now
> fully ID-based. engine 246 · client 54 (unchanged counts, copy-only diff), typecheck clean on
> all 4 packages; server 38 unaffected (confirms isolation). Full repo sweep of every changed
> catalog name found no missed player-visible surface — remaining hits are dev comments/test
> titles, `throw new Error()` messages, or generic Thai verb usage ("สังหาร"/"ดวล" as ordinary
> words, e.g. Result.tsx's "สังหารมากที่สุด" kill-count label — not the renamed card entity).

- [x] Apply 15 card names (`cardNames.ts` `CARD_DISPLAY`)
- [x] Apply 17 equipment names (`cardNames.ts` `CARD_DISPLAY`)
- [x] Apply 40 skill names (`generalSkills.ts` `GENERAL_SKILLS`, matched to `skillId` by general+position where a repo name diverged from the catalog's literal old name)
- [x] Keep all IDs (`git diff` shows no `id:`/`typeKey`/`skillId`/`generalId` changes — only string display values)
- [x] Update localization summaries (adopted catalog `summaryTh`/skill mechanic text as canonical `CARD_INFO`/`description`)
- [x] Update all UI surfaces (hand/hover, discard/draw pile, equipment slots, player detail, general select, skill toast, game log, decision dialogs, rules modal)
- [x] Search remaining old names (repo-wide sweep; classified every hit — none are missed player-visible surfaces)
- [x] Run tests/typecheck/lint (engine 246 · client 54 · server 38, typecheck clean on all 4 packages)
- [ ] GPT Naming Diff Review (user-triggered `/code-review` on the two Phase 6 commits)

## Phase 7 — Functional UI

- [ ] UI state architecture
- [ ] Lobby
- [ ] Character Selection
- [ ] Circular board
- [ ] Relative seats
- [ ] Self bottom center
- [ ] 3–5 mode
- [ ] 6–8 compact mode
- [ ] 9–10 portrait mode
- [ ] Turn/Phase/Timer
- [ ] Central card zone
- [ ] Delayed Tricks on target
- [ ] Player compact panel
- [ ] Player Detail
- [ ] Hand selection
- [ ] Equipment
- [ ] Game History
- [ ] Death/Reconnect/Leave/Result dialogs
- [ ] Full functional game with placeholders

### Additional UI requirements from original bug/UX list

- [ ] Fix latest-used card hover/tap preview
- [ ] Ensure preview overlays do not block pointer events
- [ ] Player Detail shows public skills and current equipment
- [ ] Player Detail does not clear card/target selection
- [ ] Turn/Phase/Responder/Timer remains visible over dialogs
- [ ] Attach Delayed Tricks to target Player panels
- [ ] Show real Player/Card/Skill names in Game History
- [ ] Highlight current turn and legal/selected targets
- [ ] Add Death Dialog with spectate/leave actions
- [ ] Verify Local Player always renders bottom center
- [ ] Verify 3/5/8/10-player layouts
- [ ] Compact equipment icons for other players
- [ ] Character Selection dialog appears only for current selector
- [ ] Reveal Lord General immediately and non-Lord Generals together
- [ ] Result screen shows all Roles, Winner/No Winner and statistics

## Phase 8 — Mobile Landscape

- [ ] Portrait rotate overlay
- [ ] Optional fullscreen/orientation lock
- [ ] PWA landscape preference
- [ ] 320–500px height
- [ ] Safe Area
- [ ] Compact portrait ring
- [ ] Horizontal hand
- [ ] Full-screen details
- [ ] Timer always visible
- [ ] 10-player mobile test

## Phase 9 — Theme / Assets

- [ ] Design tokens
- [ ] War-table theme
- [ ] Asset resolver
- [ ] Card full/thumbnail/back
- [ ] General full/portrait/head
- [ ] Fallback crop
- [ ] Missing asset tests
- [ ] Apply final artwork
- [ ] Desktop/mobile visual QA

## Phase 10 — Polish / QA / Deploy

- [ ] Meaningful animations
- [ ] Reduced motion readiness
- [ ] Accessibility
- [ ] Viewport matrix
- [ ] 3/5/8/10-player full games
- [ ] Multiple disconnect tests
- [ ] Latency/double-click tests
- [ ] Production build
- [ ] Single-instance WebSocket deploy
- [ ] Session-lost message
- [ ] Production smoke test
