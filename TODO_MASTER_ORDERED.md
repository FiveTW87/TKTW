# TKTW — Ordered Master TODO

> ใช้คู่กับ `SPEC_MASTER_ORDERED.md`  
> ห้ามเริ่ม Final UI ก่อน Gate ของ Engine, Room, Hidden Information และ Match Lifecycle ผ่าน

Legend:

- `[ ]` ยังไม่เริ่ม
- `[-]` กำลังทำ
- `[x]` เสร็จ
- `[!]` Blocked

---

## Phase 0 — Baseline / Decisions

- [ ] รันและบันทึก Test baseline
- [ ] แยก existing failures
- [ ] ตั้ง stabilization branch
- [!] ระบุ “ส่งไปส่อง”
- [!] ยืนยัน Draw interaction
- [!] ยืนยัน Role timing
- [!] ยืนยัน Grace expiry policy
- [!] ยืนยัน Rematch seat
- [!] ส่ง reproduction สกิลโจโฉ/เล่าปี่
- [!] ยืนยัน Result role reveal

## Phase 1 — Engine

- [ ] ENG-001 Reproduce bugs
- [ ] ENG-002 Discard min/max/exact
- [ ] ENG-003 ส่งไปส่อง
- [ ] ENG-004 Draw flow
- [ ] ENG-005 อสนีบาตเวียนค่าย
- [ ] ENG-006 โจโฉ/เล่าปี่
- [ ] ENG-007 ขงเบ้งเรียงการ์ด
- [ ] ENG-008 Death flow
- [ ] ENG-009 Structured game logs
- [ ] Audit validate-before-mutate
- [ ] Audit duplicate/retry
- [ ] Run 3-player simulation
- [ ] Run 10-player simulation
- [ ] GPT Engine Review

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
- [!] Implement chosen expiry policy
- [ ] All-other-players-gone flow
- [ ] Rejoin E2E matrix
- [ ] GPT Room Review

## Phase 3 — Hidden Information / Selection

- [ ] Audit Role projection
- [ ] Audit hand projection
- [ ] Audit General choices
- [ ] Audit private Skill decisions
- [ ] Audit reconnect payload
- [ ] General selection timer
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
- [ ] Result screen data
- [ ] Return to same Lobby
- [ ] Reuse Socket
- [ ] Fresh Match state
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
