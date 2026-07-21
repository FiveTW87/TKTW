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

## Phase 2 — Identity / Room / Rejoin

- [ ] Stable playerId/sessionToken
- [ ] Remove displayName/socket identity
- [ ] Prevent name takeover
- [ ] Explicit leave-room
- [ ] Fix stale name
- [ ] Host transfer
- [ ] Configurable Grace Period default 45s
- [ ] Remove manual Rejoin
- [ ] Automatic Rejoin
- [ ] Restore Seat/Turn/Phase/Decision/Deadline
- [ ] Reset stale local selection
- [ ] Revoke expired token
- [ ] Implement Grace-expiry death policy
  - [ ] เปิด Role
  - [ ] ล้าง Hand/Equipment/Delayed Tricks
  - [ ] ไม่มี Killer/Reward
  - [ ] ตรวจ Victory Condition
  - [ ] เจ้าเมืองออกแล้วจบแบบ no_winner
- [ ] All-other-players-gone flow
- [ ] Rejoin E2E matrix
- [ ] GPT Room Review

## Phase 3 — Hidden Information / Selection

- [ ] Audit Role projection
- [ ] Audit hand projection
- [ ] Audit General choices
- [ ] Audit private Skill decisions
- [ ] Audit reconnect payload
- [ ] Implement Role reveal screen before General selection
  - [ ] แสดงเฉพาะ Role ของตน
  - [ ] ใช้ Deadline เดิมเมื่อ Rejoin
  - [ ] เจ้าเมืองเป็น Public ตามกฎ
- [ ] Randomize Match Seat and Role independently
  - [ ] Match แรก
  - [ ] Rematch
  - [ ] เจ้าเมืองไม่ผูก Seat 1
  - [ ] เจ้าเมืองเริ่มเทิร์นแรกจาก Seat ที่สุ่มได้
- [ ] General selection timer
- [ ] Implement General selection reveal flow
  - [ ] เจ้าเมืองเลือกก่อน
  - [ ] เปิดนายพลเจ้าเมืองทันที
  - [ ] ผู้เล่นอื่นเลือกแบบส่วนตัวตามลำดับ
  - [ ] เปิดนายพลคนอื่นพร้อมกันเมื่อเลือกครบ
- [ ] Non-lords select privately in seat order and reveal together
- [ ] Own choices only
- [ ] Random/Confirm/Waiting
- [ ] View public skills
- [ ] Network payload inspection
- [ ] GPT Security Review

## Phase 4 — Match End / Rematch

- [ ] Separate Room/Match
- [ ] Unique Match ID
- [ ] Command envelope + clientActionId
- [ ] Reject old Match action
- [ ] Finish/abandon statuses
- [ ] Cancel timers/decisions on finish
- [ ] Implement Result screen
  - [ ] เปิด Role ทุกคน
  - [ ] แสดง Winner/No Winner
  - [ ] แสดงสาเหตุจบเกม
- [ ] Implement post-game statistics
  - [ ] Most kills
  - [ ] Most damage taken
  - [ ] ไม่นับ Skill HP cost เป็น Damage
  - [ ] Disconnect death ไม่มี Killer
- [ ] Handle tied stat leaders
- [ ] No-winner result when Lord leaves/expires
- [ ] Return to same Lobby
- [ ] Reuse Socket
- [ ] Fresh Match state
- [ ] Randomize Seat every Match including first/rematch
- [ ] Ready/minimum players
- [ ] Host transfer post-game
- [ ] Rematch x3 E2E
- [ ] GPT Lifecycle Review

## Phase 5 — Projected View / Protocol

- [ ] GameView
- [ ] PlayerView
- [ ] DecisionView
- [ ] LegalActionView
- [ ] GameLogView
- [ ] MatchResultView
- [ ] serverNow/expiresAt
- [ ] Equipment/Delayed Tricks
- [ ] Latest vs resolving card
- [ ] Zod validation
- [ ] Projection snapshots
- [ ] GPT Protocol Review

## Phase 6 — Thai Naming

- [ ] Apply 15 card names
- [ ] Apply 17 equipment names
- [ ] Apply 40 skill names
- [ ] Keep all IDs
- [ ] Update localization summaries
- [ ] Update all UI surfaces
- [ ] Search remaining old names
- [ ] Run tests/typecheck/lint
- [ ] GPT Naming Diff Review

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
