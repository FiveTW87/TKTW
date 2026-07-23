# TKTW — Master Implementation Specification

> **ชื่อโปรเจกต์:** TKTW — Three Kingdoms: Traitor Within  
> **สถานะ:** Consolidated Draft v1.0  
> **วันที่จัดระเบียบ:** 2026-07-21  
> **ขอบเขต:** Standard Edition, Identity Mode, 3–10 คน  
> **Stack:** TypeScript monorepo — Engine / Shared / Server / Client  
> **เป้าหมายของเอกสาร:** เป็น Source of Truth ไฟล์เดียวสำหรับลำดับพัฒนา กฎเกม ระบบ Multiplayer และ UI/UX  
> **หลักสำคัญ:** Engine และ Server ต้องนิ่งก่อนเริ่มรื้อ UI ครั้งใหญ่

---

## 0. วิธีใช้เอกสารนี้

เอกสารแบ่งเป็นสองส่วน:

1. **ส่วน Implementation Plan** — อ่านและทำตามลำดับตั้งแต่ Section 1–18
2. **ภาคผนวก** — กฎเกม สำรับ นายพล สกิล Test และ Naming Catalog

เมื่อข้อความขัดกัน ให้ใช้ลำดับความสำคัญต่อไปนี้:

1. Requirement ที่มีสถานะ **Agreed**
2. กฎเกมในภาคผนวก A
3. Acceptance Criteria ของ Issue ที่กำลังทำ
4. Implementation ปัจจุบันใน Repository

ห้ามถือว่าโค้ดปัจจุบันถูกต้องเพียงเพราะระบบรันได้ หากขัดกับ Spec ต้องแก้โค้ดหรือเปิด Open Decision

### 0.1 Source of Truth แยกตามเรื่อง

| เรื่อง | Source of Truth |
|---|---|
| กฎการ์ด นายพล สกิล สำรับ | ภาคผนวก A |
| ลำดับการพัฒนา | Section 2 |
| Engine authority และ validation | Section 3–5 |
| Player identity / Room / Rejoin | Section 6 |
| Hidden information | Section 7 |
| Game end / Rematch | Section 8 |
| View Model และ Protocol | Section 9 |
| UI/UX ใหม่ | Section 11–14 |
| ชื่อภาษาไทย | ภาคผนวก E |
| สถานะงาน | `TODO_MASTER_ORDERED.md` |

---

## 1. เป้าหมายและขอบเขต

### 1.1 เป้าหมายหลัก

- เกมเล่นได้ครบตั้งแต่สร้างห้องจนจบเกม
- Engine ตัดสินกฎอย่างถูกต้องและ deterministic
- Server เป็น authoritative source ของ Room, Match, Player, Seat, Timer และ Session
- Rejoin อัตโนมัติภายใน Grace Period
- ข้อมูลลับไม่ถูกส่งให้ผู้เล่นที่ไม่มีสิทธิ์เห็น
- จบเกมแล้วกลับ Lobby เดิมเพื่อเล่นรอบใหม่ได้โดยใช้ Socket เดิม
- ผู้เล่นทุกคนเห็นตัวเองอยู่ล่างกลางของโต๊ะเสมอ
- Turn, Phase, Pending Action และ Timer มองเห็นชัด
- รองรับ Desktop และ Mobile Landscape
- รองรับ 3–10 คน
- เตรียมระบบภาพการ์ด นายพลเต็มตัว Portrait และภาพหัว โดยยังใช้ Placeholder ได้

### 1.2 ยังไม่รวมในรอบนี้

- Account และ Login
- Database persistence
- Ranking
- Matchmaking อัตโนมัติ
- Shop / Mail / Mission
- Chat / Voice Chat
- Sound system
- AI Bot เชิงกลยุทธ์เต็มรูปแบบ
- Guozhan หรือภาคเสริม
- Replay UI เต็มรูปแบบ
- Final artwork ในช่วง Engine stabilization

---

## 2. ลำดับการพัฒนาที่ต้องทำ

ห้ามข้าม Gate โดยไม่มีเหตุผลและบันทึกการตัดสินใจ

```text
Phase 0  Baseline + Open Decisions
   ↓
Phase 1  Engine Correctness
   ↓
Phase 2  Player Identity / Room / Rejoin
   ↓
Phase 3  Hidden Information / General Selection
   ↓
Phase 4  Match End / Post-game / Rematch
   ↓
Phase 5  Shared Protocol + Projected Game View
   ↓
Phase 6  Thai Naming Migration
   ↓
Phase 7  Functional UI Rewrite
   ↓
Phase 8  Mobile Landscape
   ↓
Phase 9  Three Kingdoms Theme + Asset Infrastructure
   ↓
Phase 10 Animation / Accessibility / QA / Deploy
```

### 2.1 เหตุผลที่ UI อยู่หลัง Engine

UI ใหม่ต้องอาศัยข้อมูลต่อไปนี้จาก Engine/Server:

- Player ID และ Seat ที่คงที่
- Current Turn และ Phase
- Pending Decision และผู้ที่ต้องตอบ
- Deadline จาก Server
- Legal cards/targets
- Equipment และ Delayed Tricks
- Public/Private Skill state
- Structured game history
- Match result
- Connection state

หากข้อมูลเหล่านี้ยังเปลี่ยน รูปแบบ Component และ State ของ Client จะต้องถูกรื้อซ้ำ

### 2.2 Naming Migration อยู่ตรงไหน

Thai Naming Catalog ทำเสร็จแล้วในระดับเอกสาร แต่การนำไปใช้จริงควรเกิดหลัง:

- Card ID / Skill ID / General ID ถูกยืนยันว่าคงที่
- Engine ไม่ใช้ข้อความไทยเป็นเงื่อนไข
- Localization layer พร้อม

งาน Naming ไม่ต้องรอ Final UI แต่ห้ามทำพร้อมกับการเปลี่ยนกลไกใน Commit เดียวกัน

---

## 3. กฎสถาปัตยกรรมที่ห้ามละเมิด

### 3.1 Authority

**Engine เป็นผู้ตัดสิน:**

- กฎการ์ด
- กฎสกิล
- Phase
- ระยะ
- Target
- จำนวนการ์ดที่เลือก
- Damage / Heal
- Dying / Death
- Judgment
- Victory condition

**Server เป็นผู้ตัดสิน:**

- Player identity
- Room membership
- Seat
- Match ID
- Session Token
- Socket binding
- Timeout
- Rejoin eligibility
- Duplicate/replayed command

**Client ทำได้เพียง:**

- แสดง projected state
- แสดงสิ่งที่เลือกได้
- ส่ง intent
- ทำ local selection ที่ยังไม่ใช่ authoritative state

### 3.2 ห้ามใช้สิ่งต่อไปนี้เป็น Permanent Identity

- `socket.id`
- `displayName`
- array index
- ตำแหน่ง Component
- LocalStorage อย่างเดียว

ต้องมี:

```ts
interface PlayerIdentity {
  playerId: string;
  sessionToken: string;
  displayName: string;
  seatIndex: number;
  currentSocketId?: string;
}
```

### 3.3 Validate before mutate

Command ที่ผิดต้องไม่เปลี่ยน Game State แม้บางส่วน

Server/Engine ต้อง reject:

- Card ID ที่ไม่อยู่ในมือ
- Card ID ซ้ำ
- Target ID ซ้ำ
- Target ที่ผิดกฎ
- เลือกเกิน/ต่ำกว่าจำนวน
- Decision ID เก่า
- Match ID เก่า
- Action จาก Player ที่ออกจากห้อง
- Retry ที่เคย resolve แล้ว

### 3.4 Determinism

- ห้ามใช้ `Math.random()` โดยตรง
- ใช้ Seeded RNG
- Seed เดียวกัน + คำตอบเดียวกัน = ผลเดียวกัน
- Server timer ไม่ควรเข้าไปอยู่ใน Engine
- Engine test ต้องรันได้โดยไม่เปิด Browser หรือ Socket

---

## 4. Phase 0 — Baseline และ Open Decisions

### 4.1 Baseline

ก่อนแก้โค้ด:

- ติดตั้ง dependency
- รัน Engine tests
- รัน Server tests
- รัน Client tests
- รัน Typecheck และ Lint
- บันทึก failure เดิม
- แยก failure เดิมออกจาก regression ใหม่
- สร้าง Branch สำหรับ stabilization

### 4.2 Open Decisions ที่ยังต้องตอบ

| ID | เรื่อง | สถานะ/ค่าเริ่มต้น |
|---|---|---|
| OD-001 | “ส่งไปส่อง” คือการ์ดหรือสกิลใด และผลที่ถูกต้องคืออะไร | **Blocked** จนมีชื่อและสถานการณ์ |
| OD-002 | เฟสจั่วให้กดเองหรือจั่วอัตโนมัติ | เสนอ: กดเอง และ timeout จั่วอัตโนมัติ |
| OD-003 | ผู้เล่นเห็น Role ของตนก่อนหรือหลังเลือก General | **Blocked** |
| OD-004 | หมด Grace Period กลาง Match แล้วตัวละครเดิมเป็นอย่างไร | **Blocked** |
| OD-005 | Rematch ใช้ Seat เดิมหรือสุ่มใหม่ | เสนอ: คง Lobby seat แต่สุ่มลำดับ Match ใหม่ |
| OD-006 | สถานการณ์ผิดของสกิลโจโฉ/เล่าปี่กรณีก๊กเดียวกัน | ต้องมี reproduction |
| OD-007 | เมื่อจบเกมเปิด Role ทุกคนหรือเปิดตามกฎใด | ต้องยืนยัน |
| OD-008 | Grace Period ที่ใช้จริง | **Agreed range 30–60 วิ; default 45 วิ** |

งานที่ไม่เกี่ยวข้องกับ Open Decision สามารถเริ่มก่อนได้

---

## 5. Phase 1 — Engine Correctness

### 5.1 เป้าหมาย

- กฎเกมถูกต้อง
- ทุก Action เป็น atomic
- Pending Decision รองรับการขัดจังหวะ
- Tests ครอบคลุม happy path, invalid input และ reconnect-related state

### 5.2 ลำดับ Bug ที่ต้องแก้

#### ENG-001 — Reproduce Bug ทุกข้อก่อนแก้

สร้าง Test หรือ Simulation สำหรับ:

- เอฟเฟกต์ “ส่งไปส่อง”
- การจั่ว
- การ์ดอสนีบาตเวียนค่าย
- เลือกการ์ดทิ้งเกินจำนวน
- สกิลโจโฉ/เล่าปี่
- ขงเบ้งเรียงการ์ด
- Death flow
- Game log

#### ENG-002 — จำกัดจำนวนการ์ดทิ้ง

Engine Decision ต้องระบุ:

```ts
{
  minCards?: number;
  maxCards?: number;
  exactCards?: number;
  selectableCardIds: string[];
}
```

Acceptance:

- เลือกเกินไม่ได้ใน UI
- Server reject ถ้าส่งเกิน
- Engine reject ถ้าส่งเกิน
- Card ID ทุกใบต้องอยู่ในมือ
- ไม่มี Card ID ซ้ำ
- Mutation เป็น atomic
- Reconnect ไม่ restore selection เก่า

#### ENG-003 — เอฟเฟกต์ “ส่งไปส่อง”

ต้องตรวจ:

- Trigger
- Legal target
- Decision
- Effect resolution
- Hidden information
- Public log
- Reconnect ระหว่างรอคำตอบ

ห้ามปิด Issue จนระบุการ์ด/สกิลและ Expected Behavior ได้ชัด

#### ENG-004 — การจั่ว

- ป้องกัน double click
- ป้องกัน retry ทำให้จั่วซ้ำ
- Skill ที่เพิ่ม/ลดจำนวนจั่วต้องทำงาน
- Timeout ใช้ Default Action
- Rejoin ก่อน/หลังการจั่วต้องได้ state ล่าสุด

#### ENG-005 — อสนีบาตเวียนค่าย

ตามกฎภาคผนวก A:

- เป็น Delayed Trick
- ติดกับ Player
- Judgment โพดำ 2–9
- เสีย 3 พลังชีวิตเมื่อเข้าเงื่อนไข
- ถ้าไม่เข้าเงื่อนไขส่งต่อ
- ห้าม duplicate
- จัดการกรณีเป้าหมายตาย
- รองรับ Skill เปลี่ยน Judgment
- มี Test ระหว่าง reconnect

#### ENG-006 — สกิลโจโฉ / เล่าปี่ / ก๊กเดียวกัน

- ตรวจ Owner scope
- ตรวจ Faction
- ตรวจ Lord Skill
- ตรวจว่า Player คนใดมีสิทธิ์ตอบ
- ห้ามคนผิดก๊กตอบแทน
- ห้าม Skill ทำงานหลัง Owner ตาย
- เพิ่ม Test matrix

#### ENG-007 — ขงเบ้ง “อ่านดาววางกล”

- เปิดเฉพาะการ์ดที่เจ้าของ Skill มีสิทธิ์เห็น
- ส่ง Card IDs ไปยังผู้ตอบเพียงคนเดียว
- สามารถเรียงบน/ใต้กอง
- Validate ว่าการ์ดครบ ไม่มีซ้ำ ไม่มีใบเพิ่ม
- Timeout มี Default Ordering
- Reconnect กลับมาตอบต่อได้หาก Decision ยังไม่หมดอายุ

#### ENG-008 — Death Flow

- Dying/save flow ทำงานครบ
- Death event เกิดครั้งเดียว
- Seat ไม่ถูกย้าย
- ทิ้งไพ่/อุปกรณ์/Delayed Tricks ตามกฎ
- Kill reward/penalty ถูกต้อง
- Victory condition ตรวจทันที
- ผู้ตายดูเกมต่อได้

#### ENG-009 — Structured Game Log

Log ต้องเก็บ IDs และ parameters ไม่เก็บข้อความไทยเป็น identity

```ts
interface GameLogEntry {
  id: string;
  matchId: string;
  turnNumber: number;
  eventType: string;
  actorId?: string;
  targetIds?: string[];
  cardId?: string;
  skillId?: string;
  visibility: "public" | "private";
  createdAt: number;
}
```

Client ค่อย resolve เป็น:

```text
Thanwa ใช้ จู่โจม ใส่ Nont
Nont ใช้ หลบคม
```

### 5.3 Engine Completion Gate

ห้ามไป Phase 2 จน:

- Focused tests ผ่าน
- Full Engine suite ผ่าน
- Simulation 3 คนผ่าน
- Simulation 10 คนผ่าน
- ไม่มี Critical/Major issue จาก GPT Review
- กฎที่เปลี่ยนถูกอัปเดตใน Spec

---

## 6. Phase 2 — Player Identity, Room และ Automatic Rejoin

### 6.1 Stable identity

ต้องมีข้อมูลแยกชัด:

- `playerId`
- `sessionToken`
- `displayName`
- `seatIndex`
- `socketId`
- `connectionStatus`

กฎ:

- Reconnect เปลี่ยน Socket ได้ แต่ Player ID และ Seat ห้ามเปลี่ยน
- ชื่อใช้แสดงผลเท่านั้น
- ห้ามใช้ชื่อยึด Seat เดิม
- Server derive Player จาก Session
- Client ส่ง Player ID มาอ้างเองไม่ได้

### 6.2 Join / Leave

#### ROOM-001 — เข้าสลับชื่อ

- Token ผูกกับ Player เดิม
- ชื่อใหม่ห้าม takeover Seat
- ชื่อซ้ำใน Room ควรถูก reject เพื่อ UX ที่ชัด
- มี Test spoof Player ID และ spoof name

#### ROOM-002 — ออกแล้วชื่อไม่หาย

แยก:

```text
disconnect  = หลุดชั่วคราว
leave-room  = ออกโดยตั้งใจ
```

- Disconnect: Seat อยู่ระหว่าง Grace Period
- Leave Lobby: ลบ Player ทันที
- Leave Active Match: ใช้ policy ที่กำหนด
- Leave Post-game: ออกจาก Room และกลับหน้าแรก

#### ROOM-003 — ปุ่มออกจากห้อง

- Lobby มี Confirmation
- Active Match ต้องแจ้งผลกระทบชัด
- Client รอ Server ยืนยันก่อน clear state
- Session Token ถูก revoke เมื่อออกจริง

### 6.3 Automatic Rejoin — Agreed

- ไม่มี Manual Rejoin button
- Client พยายาม recover อัตโนมัติ
- Grace Period 30–60 วินาที
- Default configuration: 45 วินาที
- Server เป็นผู้ตัดสินสิทธิ์
- Server timers เดินต่อ
- Reconnect ด้วย Session Token
- Rebind Socket ใหม่เข้ากับ Player เดิม

ต้อง restore:

- Player ID
- Seat
- Match ID
- General
- Own Role
- HP
- Hand
- Equipment
- Delayed Tricks
- Turn
- Phase
- Pending Decision
- Responder
- Deadline
- Legal Actions

ห้าม restore:

- Selected Card จาก Client
- Selected Target จาก Client
- Dialog เก่า
- Decision ที่หมดอายุ
- Optimistic state

### 6.4 Rejoin UI State

ระหว่าง reconnect:

```text
กำลังเชื่อมต่อกลับเข้าสู่ห้อง...
```

เมื่อ Session หมดอายุ:

```text
ไม่สามารถกลับเข้าสู่เกมเดิมได้
กำลังนำคุณกลับไปยังหน้าหลัก
```

### 6.5 Rejoin หลังหมด Grace Period

สิ่งที่ตกลงแล้ว:

- Token เก่าถูก revoke
- ผู้เล่นกลับหน้า Lobby หลัก
- ห้าม recovery ผ่าน Session เก่า
- ถ้าห้องเดิมกลับเป็น Lobby และยังรับคน ผู้เล่นอาจ Join ใหม่ตาม Flow ปกติได้

สิ่งที่ยังต้องตัดสิน:

- ตัวละครเดิมใน Active Match จะตาย, surrender, auto-pass, bot takeover หรือทำให้ Match ถูกยกเลิก

### 6.6 ทุกคนอื่นออกหมด

- ห้ามเด้งทันทีเมื่อ Socket หลุด
- แสดงว่ากำลังรอ Reconnect
- รอ Grace Period
- ถ้าไม่มีจำนวนคนพอ:
  - Match -> `abandoned`
  - ยกเลิก Timer
  - แจ้งผู้เล่นที่เหลือ
  - กลับหน้าแรก
  - Clean Room/Match

### 6.7 Seat consistency

- Server กำหนด Seat
- Seat คงเดิมตลอด Match
- ผู้เล่นตายยังอยู่ Seat เดิม
- Relative Seat เป็นเรื่อง Client display เท่านั้น
- Reconnect ห้ามทำให้ลำดับ Player เปลี่ยน

### 6.8 Room Completion Gate

- ไม่มี Duplicate Player
- เข้าสลับชื่อไม่ได้
- Leave แล้วชื่อหาย
- Seat คงเดิม
- Rejoin test matrix ผ่าน
- Token spoof/reuse ถูก reject
- GPT Review ไม่มี Critical/Major issue

---

## 7. Phase 3 — Hidden Information และ General Selection

### 7.1 ห้ามซ่อนด้วย CSS

Server ต้องส่ง state เฉพาะ Viewer

ห้าม Client ของคนอื่นได้รับ:

- Role ที่ยังไม่เปิด
- ไพ่ในมือจริง
- General choices ของคนอื่น
- Private Skill decisions
- ไพ่ที่ขงเบ้งกำลังดู
- Debug state เต็ม

### 7.2 Role timing

ต้องยืนยัน OD-003:

- เห็น Role ของตนก่อนเลือก General หรือ
- เห็นหลังเลือก General

ไม่ว่าเลือกแบบใด:

- คนอื่นห้ามเห็น Role
- Network payload ต้องไม่มี field นั้น
- ในช่วงเลือก General คนอื่นเห็นเพียง:
  - กำลังเลือก
  - เลือกแล้ว
  - หลุดการเชื่อมต่อ

### 7.3 Character Selection

หน้าจอต้องมี:

- ใครกำลังเลือก
- Timer
- ตัวเลือกของตนเท่านั้น
- ชื่อ General
- Faction
- HP
- Skill names/descriptions
- Placeholder artwork
- Random
- Confirm
- Waiting state
- Connection state

Server ต้อง:

- Validate choice
- ป้องกัน General ซ้ำ
- ล้าง Private Options หลังเลือก
- Restore state ที่ถูกต้องเมื่อ Rejoin

### 7.4 ดู Skill คนอื่น

ระหว่าง Match:

- กด Player Panel เพื่อดู General Detail
- แสดงเฉพาะ Skill ที่ public
- แสดง Skill state
- เปิด Detail แล้ว Selection เดิมไม่หาย
- Timer ยังมองเห็น

### 7.5 Hidden Information Gate

- Automated viewer-specific tests ผ่าน
- ตรวจ Network payload ด้วย DevTools แล้วไม่มีข้อมูลลับ
- Rejoin payload ไม่มีข้อมูลเกินสิทธิ์
- Public game log ไม่รั่วข้อมูล
- GPT Security Review ผ่าน

---

## 8. Phase 4 — Match Lifecycle, Game End และ Rematch

### 8.1 Room และ Match ต้องแยกกัน

```ts
interface Room {
  roomCode: string;
  status: "lobby" | "selecting" | "playing" | "post_game";
  hostPlayerId: string;
  players: RoomPlayer[];
  currentMatchId?: string;
}

interface Match {
  matchId: string;
  roomCode: string;
  status: "active" | "finished" | "abandoned";
  gameState: GameState;
  result?: MatchResult;
}
```

### 8.2 เมื่อจบเกม

- Engine ตรวจ Winner
- Match -> `finished`
- Server หยุดรับ Gameplay Action
- Timer และ Pending Decision ถูก cancel/invalidate
- Broadcast authoritative result
- Match เก่าเป็น read-only
- Event ของ Match เก่าถูก reject

### 8.3 Result Screen

แสดง:

- ฝ่ายชนะ
- ผู้เล่นที่ชนะ
- General
- Role ตามกฎเปิดเผย
- สาเหตุจบเกม
- จำนวน Turn
- ระยะเวลา
- ลำดับการตายหากมี
- History ช่วงท้าย

ปุ่มขั้นต่ำ:

- `กลับห้องเพื่อเล่นต่อ`
- `ออกจากห้อง`

### 8.4 เล่นต่อ

ไม่ต้อง disconnect Socket

Flow:

```text
Match finished
  -> Result Screen
  -> กลับห้องเพื่อเล่นต่อ
  -> Room Lobby เดิม
  -> Ready ใหม่
  -> Host เริ่ม
  -> สร้าง Match ID ใหม่
  -> สร้าง Game State ใหม่
```

ข้อมูลที่เก็บ:

- Room code
- Player ID
- Display name
- Socket
- Host
- Room settings

ข้อมูลที่ Reset:

- Role
- General
- HP
- Hand
- Equipment
- Delayed Tricks
- Deck
- Discard
- Turn
- Phase
- Skill flags
- Pending Decisions
- Timers
- Death state
- Result
- Match log
- Client selection

### 8.5 Host transfer

- Host ออกจาก Lobby/Post-game ให้ย้าย Host
- Match ที่กำลังเล่นไม่ควรหยุดเพราะ Host disconnect
- ห้ามมี Host สองคน

### 8.6 Match Lifecycle Gate

- New Match ID ทุกครั้ง
- Socket เดิมใช้ได้
- Old action ถูก reject
- State เก่าไม่รั่วเข้าสู่เกมใหม่
- ผู้เล่นบางคนออกแล้วผู้เล่นที่เหลือกลับ Lobby ได้
- Host transfer ผ่าน
- Rematch loop อย่างน้อย 3 รอบผ่าน

---

## 9. Phase 5 — Shared Protocol และ Projected Game View

### 9.1 Command envelope

```ts
interface MatchCommandEnvelope<T> {
  roomCode: string;
  matchId: string;
  decisionId?: string;
  clientActionId: string;
  payload: T;
}
```

- `clientActionId` ใช้ idempotency
- Match ID เก่าถูก reject
- Decision ที่ตอบแล้วตอบซ้ำไม่ได้

### 9.2 Game View

```ts
interface GameView {
  roomCode: string;
  matchId: string;
  matchStatus: "active" | "finished" | "abandoned";

  viewerPlayerId: string;
  viewerSeatIndex: number;
  players: PlayerView[];

  turnNumber: number;
  currentTurnPlayerId?: string;
  currentPhase?: GamePhase;

  pendingDecision?: DecisionView;
  legalActions: LegalActionView[];

  drawPileCount: number;
  discardPileCount: number;
  discardPileTop?: CardView;
  latestPlayedCard?: PlayedCardView;
  resolvingCard?: PlayedCardView;

  gameLogs: GameLogView[];
  result?: MatchResultView;

  serverNow: number;
}
```

### 9.3 Player View

ต้องมี:

- Player ID
- Seat
- Display name
- Connection state
- Alive/dead
- General
- Role เฉพาะที่มีสิทธิ์เห็น
- HP
- Hand count
- Visible hand cards เฉพาะที่ได้รับอนุญาต
- Equipment slots
- Delayed Tricks
- Public Skill states

### 9.4 Timer

Server ส่ง:

```ts
{
  startedAt: number;
  expiresAt: number;
  serverNow: number;
}
```

Client:

- คำนวณเวลาแสดงผล
- ห้ามเริ่ม Timer ใหม่จาก render
- Rejoin ใช้ deadline เดิม
- ต่ำกว่า 5 วินาทีแสดง Warning

### 9.5 View Model Gate

- Client render เกมได้จาก projected state เท่านั้น
- Client ไม่ import private Game State
- Hidden information tests ผ่าน
- Reconnect payload เพียงพอ
- Protocol schema validation ผ่าน
- GPT Protocol Review ผ่าน

---

## 10. Phase 6 — Thai Naming Migration

ใช้ภาคผนวก E เป็น Source of Truth

### 10.1 กฎ

- เปลี่ยนเฉพาะ Player-visible text
- Internal ID ห้ามเปลี่ยน
- ห้ามเปลี่ยน Mechanic ให้เข้ากับชื่อ
- Engine events/logs เก็บ ID
- Client resolve ชื่อจาก Localization
- Artwork ไม่เป็นแหล่งข้อมูลของชื่อ

### 10.2 ลำดับ

1. Audit ชื่อทั้งหมดใน Repository
2. Map stable IDs
3. เพิ่ม `name`, `summary`, `description`
4. เปลี่ยน UI text
5. เปลี่ยน Game history rendering
6. Search ชื่อเก่าทั้ง Repository
7. รัน tests/typecheck/lint
8. GPT ตรวจ Diff

### 10.3 Naming Gate

- 15 การ์ดครบ
- 17 อุปกรณ์ครบ
- 40 สกิลครบ
- ไม่มี ID เปลี่ยน
- ไม่มี Mechanic เปลี่ยน
- Missing artwork ยังแสดงชื่อได้

---

## 11. Phase 7 — Functional UI Rewrite

> ช่วงนี้ใช้ Placeholder และกล่องเรียบก่อน ยังไม่ใส่ Final Theme

### 11.1 UI architecture

แยก:

- Server state
- Local interaction state
- Dialog/view state
- Animation state

Interaction mode:

```ts
type InteractionMode =
  | "idle"
  | "selectingCard"
  | "selectingTargets"
  | "selectingDiscard"
  | "orderingCards"
  | "responding"
  | "viewingDetails";
```

Authoritative update ต้องล้าง stale interaction เมื่อจำเป็น

### 11.2 Lobby

- Room code
- Host
- Player/Seat list
- Ready
- Connected/Reconnecting
- Leave button
- Host start button
- Minimum player validation
- ตำแหน่ง Player ไม่สลับเมื่อเข้า Character Selection

Theme จริงทำภายหลัง แต่ Layout ต้องเตรียมให้เข้ากับโต๊ะเกมใหม่

### 11.3 Game Board — โต๊ะกลม

หลัก:

- Local Player อยู่ล่างกลางเสมอ
- ผู้เล่นอื่นเรียงตาม Relative Seat
- ลำดับ Seat จริงคงเดิม
- กลางบนสงวนให้ Turn Panel
- รองรับ 3–10 คน

```ts
relativeSeat =
  (targetSeatIndex - viewerSeatIndex + playerCount) % playerCount;
```

Mode:

- 3–5 คน: Medium Panel
- 6–8 คน: Compact Panel
- 9–10 คน: Head Portrait Panel

### 11.4 Turn / Phase / Timer

กลางบนแสดง:

- Turn ของใคร
- General head
- Phase
- Pending responder
- Turn number
- Remaining time
- Action prompt

ตัวอย่าง:

```text
เทิร์นของ Thanwa
เฟสลงการ์ด
เหลือ 18 วินาที
```

กรณีรอตอบ:

```text
กำลังรอ Nont ใช้ หลบคม
เหลือ 12 วินาที
```

Timer ต้องอยู่แม้เปิด Dialog

### 11.5 Central Card Zone

มี:

- Draw pile + จำนวน
- Latest played card
- Current resolving card
- Discard pile + จำนวน

Delayed Trick:

- ห้ามวางค้างกลางโต๊ะ
- ต้องติดกับ Player เป้าหมาย
- แสดง Icon บน Player Panel
- กดดูรายละเอียดได้

### 11.6 Player Compact Panel

แสดง:

- Seat
- Head portrait placeholder
- Player name
- General
- Faction
- HP
- Hand count
- Equipment icons
- Delayed Trick icons
- Alive/dead
- Connection state
- Turn state
- Target state

ห้ามแสดง:

- Hidden hand
- Hidden Role
- Private decision

### 11.7 Player Detail Dialog

กด Player Panel แล้วแสดง:

- General artwork
- Head portrait
- Player/General/Faction
- HP
- Role ตามสิทธิ์
- Skills และ state
- Equipment
- Delayed Tricks
- Hand count
- Distance
- Attack range result
- Connection/death

Behavior:

- Click outside / Esc / Close
- ไม่ยกเลิก Card/Target selection
- Timer ยังเห็น
- Mobile เปิดเต็มจอ

### 11.8 Local Player / Hand / Equipment

Local Player ใหญ่กว่าคนอื่น

Hand:

- Desktop hover preview
- Click select
- Mobile tap preview แล้ว tap อีกครั้งเลือก
- Horizontal scroll
- Usable/disabled/selected
- แสดงเหตุผลที่ใช้ไม่ได้
- แสดง `เลือกแล้ว 1/2`
- Max selection จำกัดใน UI และ Server/Engine

Equipment:

- Weapon
- Armor
- Offensive horse
- Defensive horse
- ดูชื่อ/ผล/ระยะ
- Other player แสดงเป็น Icon

### 11.9 Game History

- แสดง 4–6 รายการล่าสุด
- เปิดดูทั้งหมดได้
- ชื่อ Player จริง
- ชื่อ Card/Skill จริง
- กดชื่อ Player เพื่อ Highlight
- กดชื่อ Card เพื่อ Preview
- ห้ามเปิดข้อมูลลับ

### 11.10 Dialog / Notification

ต้องมี:

- Death Dialog
- Reconnecting
- Session expired
- All players gone
- Leave confirmation
- Result screen
- Card preview
- General detail
- ขงเบ้งเรียงการ์ด

### 11.11 Functional UI Gate

- เล่นครบหนึ่งเกมโดย Placeholder
- 3, 5, 8, 10 คน Layout ใช้งานได้
- Turn/Phase/Timer ชัด
- Target/Card selection ถูกต้อง
- Dialog ไม่ทำให้ Selection หาย
- ไม่มี Hidden Information
- Rejoin แล้ว UI กลับมากดได้

---

## 12. Phase 8 — Mobile Landscape

### 12.1 Orientation policy

- หน้าแรกและ Lobby ใช้ Portrait ได้
- Character Selection และ Active Match เป็น Landscape-first
- ถ้า Mobile อยู่ Portrait:
  - แสดง Rotate Overlay
  - Block interaction
- หลัง User gesture อาจลอง Fullscreen + Orientation Lock
- Failure ต้อง fallback ได้
- PWA manifest ตั้ง preferred landscape

ข้อความ:

```text
กรุณาหมุนอุปกรณ์เป็นแนวนอน
เกมนี้ออกแบบมาสำหรับการเล่นในแนวนอน
```

### 12.2 Mobile ไม่ใช่ Desktop ที่ย่อขนาด

Mobile Landscape:

- Turn Panel บน
- Local Hand ล่าง
- Compact Portrait Ring
- Player Detail เต็มจอ
- History เป็น Sheet/Dialog
- Tap แทน Hover
- Timer เห็นตลอด
- รองรับ viewport สูง 320–500 CSS px
- รองรับ Safe Area และ Browser toolbar

### 12.3 Mobile Gate

ทดสอบอย่างน้อย:

- 932×430
- 844×390
- 740×360
- Portrait Rotate Overlay
- 10-player layout
- เปลี่ยน orientation ระหว่าง Dialog/Action
- Browser toolbar resize

---

## 13. Phase 9 — Three Kingdoms Theme และ Asset Infrastructure

### 13.1 Theme direction

ชื่อแนวทาง:

> Three Kingdoms War Table / โต๊ะบัญชาการสามก๊ก

วัสดุ:

- ไม้เข้ม
- ทองแดงเก่า
- เหล็กดำ
- หนัง
- กระดาษเก่า
- ลายจีน
- แสงคบเพลิง
- ควัน/ถ่านแดงแบบ subtle

ห้าม:

- Neon มากเกินไป
- Panel สีขาวสมัยใหม่
- Background รบกวนการอ่าน
- Shop/Mail/Mission/Chat จากภาพอ้างอิง

### 13.2 Asset-ready ก่อน Artwork จริง

ต้องรองรับ:

- Card full
- Card thumbnail
- Card back
- General full
- General portrait
- General head
- Faction icon
- Role icon
- Equipment icon
- UI frame/background

โครงสร้าง:

```text
packages/client/public/assets/
  cards/
    full/
    thumbnail/
    backs/
  generals/
    full/
    portrait/
    head/
  factions/
  roles/
  equipment/
  ui/
```

### 13.3 Fallback

- ไม่มี thumbnail ใช้ full
- ไม่มี head crop portrait
- ไม่มี portrait crop full
- ไม่มีภาพใช้ Placeholder + Name
- Missing asset ห้าม crash
- ชื่อและรายละเอียด render จากข้อมูล ไม่ฝังในภาพ

### 13.4 Components

```text
<CardArtwork cardId variant />
<GeneralArtwork generalId variant="full|portrait|head" />
<FactionIcon factionId />
<RoleIcon roleId />
<EquipmentSlotIcon slot />
```

### 13.5 Theme/Asset Gate

- Functional UI ผ่านก่อน
- Placeholder fallback ผ่าน
- ทุก Asset ใช้ Stable ID
- Mobile/desktop readability ผ่าน
- Artwork จริงใส่ภายหลังได้โดยไม่แก้ Business Component

---

## 14. Phase 10 — Animation, Accessibility, QA และ Deploy

### 14.1 Animation

ใช้เฉพาะเพื่อสื่อ:

- Draw
- Play card
- Attach Delayed Trick
- Equip
- Damage
- Heal
- Death
- Turn change

กฎ:

- ไม่ block input นาน
- ไม่หยุด Timer
- Rejoin ไม่ replay animation เก่า
- เตรียม Reduced Motion

### 14.2 Accessibility

- Font ไทยอ่านง่าย
- Decorative font เฉพาะหัวข้อ
- สีไม่ใช่สัญญาณเดียว
- Touch target กดง่าย
- Esc ปิด Dialog
- Keyboard navigation
- ARIA label
- Contrast ผ่าน

### 14.3 Multiplayer QA

- เล่นจบ 3 คน
- เล่นจบ 5 คน
- เล่นจบ 8 คน
- เล่นจบ 10 คน
- Multiple disconnect
- Refresh ทุก Phase
- Duplicate click
- Network latency
- Rematch 3 รอบ
- Old Match action rejected

### 14.4 Deploy

ระบบปัจจุบันเก็บ State ใน memory:

- ใช้ Single Server Instance
- WebSocket ต้องทำงาน
- Server restart ทำให้ Active Match หาย
- ต้องแสดงข้อความ Session lost
- Config:
  - Rejoin Grace Period
  - Decision timeout
- Log lifecycle โดยไม่บันทึก Private cards

---

## 15. Test Requirements

### 15.1 Engine

ทุก Bug fix ต้องมี:

- Unit test
- Invalid input
- Atomicity
- Duplicate/retry
- Interaction case
- Hidden information case ถ้าเกี่ยวข้อง

### 15.2 Server E2E

- Create/Join/Leave
- Duplicate name
- Rejoin before/after expiry
- Wrong/revoked token
- Seat preserved
- Pending decision restored
- Expired decision rejected
- Old Match action rejected
- Host transfer
- All players gone
- Post-game/Rematch

### 15.3 Client

- Relative seats
- Self bottom center
- 3–10 player modes
- Turn/Phase/Timer
- Selection max
- Dialog keeps selection
- Rejoin loading
- Stale selection reset
- Hidden Role
- Delayed Trick attached to target
- Result screen
- Missing asset fallback
- Mobile landscape

---

## 16. Definition of Done

Issue ถือว่า Done เมื่อ:

- มี Requirement ID
- มี Root Cause
- มี Acceptance Criteria
- แก้เฉพาะ Scope
- Engine/Server authority ถูกต้อง
- Hidden Information ไม่รั่ว
- Tests เพิ่มและผ่าน
- Typecheck/Lint ผ่าน
- Claude ส่ง Changed files + Diff summary + Risks
- GPT Review ไม่มี Critical/Major issue
- แก้ Review แล้วตรวจซ้ำ
- `TODO_MASTER_ORDERED.md` ถูกอัปเดต
- Spec ถูกอัปเดตหาก Behavior เปลี่ยน

---

## 17. Claude + GPT Workflow

หนึ่ง Issue ต่อหนึ่ง Commit/PR

```text
1. เลือก Requirement ID
2. Claude อ่านเฉพาะ Section ที่เกี่ยวข้อง
3. Claude วิเคราะห์ Root Cause
4. Claudeระบุไฟล์ก่อนแก้
5. Claudeแก้ + เพิ่ม Test
6. Claudeส่ง Diff/Test/Risks
7. GPT ตรวจ Requirement/Authority/Security/Race/Regression
8. Claudeแก้ Review
9. GPT ตรวจซ้ำ
10. Merge
11. Update TODO
```

### 17.1 สิ่งที่ Claude ห้ามทำ

- แก้ UI พร้อม Engine Bug โดยไม่จำเป็น
- Rename Internal IDs ตอนเปลี่ยนชื่อไทย
- Refactor ไฟล์ไม่เกี่ยวข้อง
- เชื่อ Client validation
- ส่ง State เต็มแล้วซ่อนด้วย CSS
- เริ่ม Final Theme ก่อน Functional UI Gate

---

## 18. Milestones

### Milestone 1 — Stable Gameplay Core

- Engine bugs ปิด
- Identity stable
- Leave/Rejoin ผ่าน
- Hidden information secure
- Match end/rematch ผ่าน

### Milestone 2 — Functional New Interface

- Projected Game View พร้อม
- Circular relative seats
- Turn/Phase/Timer
- Hand/Equipment/History
- Player Detail
- 3–10 คน
- Mobile Landscape
- Placeholder assets

### Milestone 3 — Visual Release

- Three Kingdoms Theme
- Card artwork
- General full/portrait/head
- Animation
- Accessibility
- Production QA

---

# ภาคผนวก A — กฎเกม สำรับ นายพล และ Event Stack

> ส่วนนี้เป็น Source of Truth ของกลไกเกม หากแก้กฎต้องแก้ทั้งส่วน Implementation และ Test

## A1. บทบาท (Roles)

| บทบาท | จีน | เปิดเผย? | เงื่อนไขชนะ |
|---|---|---|---|
| **เจ้าเมือง** | 主公 | ✅ | กำจัดกบฏและไส้ศึกทั้งหมด |
| **ขุนนางภักดี** | 忠臣 | ❌ | เหมือนเจ้าเมือง (ชนะร่วม แม้ตัวเองตายแล้ว) |
| **กบฏ** | 反贼 | ❌ | กำจัดเจ้าเมือง (ชนะร่วม แม้ตัวเองตายแล้ว) |
| **ไส้ศึก** | 内奸 | ❌ | **ต้องเป็นผู้รอดคนสุดท้าย** และเจ้าเมืองต้องตาย |

### สัดส่วนบทบาท

| ผู้เล่น | เจ้าเมือง | ภักดี | กบฏ | ไส้ศึก |
|---|---|---|---|---|
| 3 | 1 | 0 | 1 | 1 |
| 4 | 1 | 1 | 1 | 1 |
| 5 | 1 | 1 | 2 | 1 |
| 6 | 1 | 1 | 3 | 1 |
| 7 | 1 | 2 | 3 | 1 |
| 8 | 1 | 2 | 4 | 1 |
| 9 | 1 | 3 | 4 | 1 |
| 10 | 1 | 3 | 4 | 2 |

### รางวัล/บทลงโทษเมื่อสังหาร

| สถานการณ์ | ผล |
|---|---|
| สังหาร**กบฏ** | ผู้สังหารจั่ว **3 ใบ** |
| **เจ้าเมือง**สังหาร**ขุนนางภักดี** | เจ้าเมืองทิ้งการ์ดในมือ + อุปกรณ์**ทั้งหมด** |
| อื่น ๆ | ไม่มีผล |

---

## A2. การตั้งค่าเกม (Setup)

```
1. สุ่มแจกบทบาท (ใช้ seeded RNG)
2. เจ้าเมืองเปิดเผยตัว
3. เจ้าเมืองเลือกนายพล (สุ่มให้เลือก 5 ตัว)
4. คนอื่นเลือกนายพลจาก pool ที่เหลือ (สุ่มให้เลือกคนละ 3 ตัว)
5. พลังชีวิตสูงสุด:
   - เจ้าเมือง = ค่านายพล + 1
   - คนอื่น    = ค่านายพล
6. ทุกคนจั่ว 4 ใบ
7. เจ้าเมืองเริ่มเทิร์นแรก → วนตามลำดับที่นั่ง
```

---

## A3. โครงสร้างเทิร์น

| # | เฟส | จีน | รายละเอียด |
|---|---|---|---|
| 1 | **เตรียมพร้อม** | 准备阶段 | จุด trigger (อ่านดาววางกล, ร่ายระบำลั่วสุ่ย) |
| 2 | **ตัดสิน** | 判定阶段 | ประมวลผลเขตตัดสิน — **ใบที่วางทีหลังสุดก่อน (LIFO)** |
| 3 | **จั่วการ์ด** | 摸牌阶段 | จั่ว **2 ใบ** (สกิลปรับได้) |
| 4 | **ลงการ์ด** | 出牌阶段 | ลงการ์ดตามข้อจำกัดด้านล่าง |
| 5 | **ทิ้งการ์ด** | 弃牌阶段 | ทิ้งให้เหลือ ≤ **พลังชีวิตปัจจุบัน** |
| 6 | **จบเทิร์น** | 结束阶段 | จุด trigger (จันทร์หลบโฉม) |

### ข้อจำกัดเฟสลงการ์ด

| การ์ด | ข้อจำกัด |
|---|---|
| **จู่โจม** | **1 ใบ/เทิร์น** (ยกเว้นมีสกิล/อุปกรณ์ปลด) |
| **ท้อคืนชีพ** | ลงได้เฉพาะเมื่อพลังชีวิต**ไม่เต็ม** |
| **อุปกรณ์** | ไม่จำกัด แต่ช่องละ 1 ใบ (ทับได้ ใบเก่าเข้ากองทิ้ง) |
| **กลอุบาย** | ไม่จำกัด (ยกเว้นข้อจำกัดระยะ) |

---

## A4. ระบบระยะทางและระยะโจมตี

```ts
// engine/src/core/distance.ts
distanceBase(a, b) = min(clockwiseSteps, counterClockwiseSteps)   // ข้ามคนที่ตายแล้ว
distanceNet(a, b)  = max(1, distanceBase - a.horseMinus + b.horsePlus)

attackRange(p) = p.equipment.weapon?.range ?? 1
canAttack(a, b) = attackRange(a) >= distanceNet(a, b)
```

### ข้อจำกัดระยะของกลอุบาย

| การ์ด | ระยะ |
|---|---|
| ฉกทรัพย์ตามน้ำ | **1 เท่านั้น** |
| อื่น ๆ ทั้งหมด | ไม่จำกัด |

---

## A5. พลังชีวิต / ใกล้ตาย / เสียชีวิต

```
ใกล้ตาย: hp <= 0

ลำดับการช่วย:
1. trigger: OnDying
2. ถามจาก "ผู้ใกล้ตาย" ก่อน แล้ววนตามลำดับที่นั่ง
3. ใครก็ได้ลง "ท้อคืนชีพ" ช่วยได้ (หลายใบ / หลายคน / ไม่จำกัดระยะ)
4. ต้องฟื้นจน hp > 0   (hp = -2 → ต้องใช้ท้อคืนชีพ 3 ใบ)
5. ครบรอบแล้วยัง <= 0 → เสียชีวิต → trigger: OnDeath

เมื่อเสียชีวิต:
1. เปิดเผยบทบาท
2. ทิ้งการ์ดในมือ + อุปกรณ์ + เขตตัดสิน ทั้งหมด
3. ประมวลผลรางวัล/บทลงโทษของผู้จู่โจม
4. ตรวจสอบเงื่อนไขจบเกม
```

---

## A6. ระบบไพ่ตัดสิน (Judgment)

```
1. เปิดการ์ดใบบนสุดของกองจั่ว      → trigger: OnJudgeCardRevealed
2. เปิดโอกาสให้แก้ผล                → trigger: BeforeJudgeEffect  ⚠️ "พลิกชะตา" แทรกตรงนี้
3. ประมวลผลตามดอก/เลข              → trigger: OnJudgeResult
4. ไพ่ตัดสินเข้ากองทิ้ง              → trigger: AfterJudge  ⚠️ "เก็บลิขิตฟ้า" เก็บตรงนี้
```

> ⚠️ **จุดสำคัญ**: การตัดสิน**ไม่ใช่** `const card = drawPile.pop(); return card.suit`
> มันต้องเป็น **event ที่หยุดรอ response จากผู้เล่นคนอื่นได้** (สุมาอี้แก้ไพ่ตัดสินของคนอื่นได้)

### ตารางเงื่อนไขตัดสิน

| ใช้โดย | เงื่อนไข | ผล |
|---|---|---|
| ค่ายกลแปดทิศ | **แดง** (♥️♦️) | นับเป็นลง "หลบคม" อัตโนมัติ |
| สุขจนลืมจ๊ก | **♥️** | รอด (ไม่ข้ามเฟส) |
| อสนีบาตเวียนค่าย | **♠️ 2–9** | เสีย **3 พลังชีวิต** |
| ม้าเหล็กทะลวงค่าย | **แดง** | เป้าหมายลง "หลบคม" ไม่ได้ |
| เนตรเดียวทวงแค้น | **ไม่ใช่ ♥️** | ผู้ทำร้ายโดนลงโทษ |
| ร่ายระบำลั่วสุ่ย | **ดำ** (♠️♣️) | ได้การ์ดนั้น + ตัดสินซ้ำ |

---

## A7. รายการการ์ดทั้งหมด

### 8.1 การ์ดพื้นฐาน

| การ์ด | จีน | ผล |
|---|---|---|
| **จู่โจม** | 杀 | โจมตี 1 คนในระยะ → เป้าหมายต้องลง "หลบคม" มิฉะนั้นเสีย 1 HP |
| **หลบคม** | 闪 | ตอบโต้ "จู่โจม" — ลงเองในเทิร์นตัวเองไม่ได้ |
| **ท้อคืนชีพ** | 桃 | ฟื้น 1 HP — ในเทิร์น: ใช้กับตัวเอง / นอกเทิร์น: ช่วยคนใกล้ตายเท่านั้น |

### 8.2 กลอุบายทันที

| การ์ด | จีน | เป้าหมาย | ผล |
|---|---|---|---|
| **เนรมิตทรัพย์จากสูญ** | 无中生有 | ตัวเอง | จั่ว 2 ใบ |
| **ฉกทรัพย์ตามน้ำ** | 顺手牵羊 | 1 คน (**ระยะ 1**) | **ขโมย**การ์ด 1 ใบ |
| **ข้ามน้ำรื้อสะพาน** | 过河拆桥 | 1 คน | **ทิ้ง**การ์ด 1 ใบของเป้าหมาย |
| **ท้าศึกเดี่ยว** | 决斗 | 1 คน | ผลัดกันลง "จู่โจม" เริ่มจาก**เป้าหมาย** → ใครลงไม่ได้ก่อน เสีย 1 HP |
| **ยืมดาบฆ่าคน** | 借刀杀人 | 1 คนที่**มีอาวุธ** | บังคับเป้าหมายลง "จู่โจม" ใส่คนที่เราเลือก → ถ้าไม่ลง **เราได้อาวุธของเขา** |
| **ชนเผ่าใต้บุกค่าย** | 南蛮入侵 | ทุกคนอื่น | ต้องลง "จู่โจม" มิฉะนั้นเสีย 1 HP |
| **หมื่นศรถล่มค่าย** | 万箭齐发 | ทุกคนอื่น | ต้องลง "หลบคม" มิฉะนั้นเสีย 1 HP |
| **สัตย์สาบานสวนท้อ** | 桃园结义 | ทุกคน | ฟื้น 1 HP |
| **ห้าธัญญาบริบูรณ์** | 五谷丰登 | ทุกคน | เปิดการ์ดเท่าจำนวนคนที่ยังไม่ตาย → ผลัดกันเลือกคนละ 1 ใบ (เริ่มจากผู้ใช้) |
| **ลบล้างกลศึก** | 无懈可击 | 1 กลอุบาย | **ยกเลิก**กลอุบาย 1 ใบ — **ยกเลิกตัวเองได้** (ซ้อนไม่จำกัด), ใช้ได้ทุกเวลา |

### 8.3 กลอุบายหน่วงเวลา (วางในเขตตัดสิน)

| การ์ด | จีน | ผล |
|---|---|---|
| **สุขจนลืมจ๊ก** | 乐不思蜀 | ตัดสิน: ไม่ใช่ **♥️** → **ข้ามเฟสลงการ์ด** (ไม่ว่าผลใด การ์ดเข้ากองทิ้ง) |
| **อสนีบาตเวียนค่าย** | 闪电 | ตัดสิน: **♠️2–9** → เสีย **3 HP**, การ์ดเข้ากองทิ้ง<br>ถ้าไม่โดน → **ส่งต่อ**คนถัดไป |

> **กฎเขตตัดสิน**: 1 คนมีกลอุบายหน่วงเวลาชนิดเดียวกันซ้ำไม่ได้ · ประมวลผลแบบ **LIFO** · "ลบล้างกลศึก" ยกเลิกได้ตอน**กำลังจะประมวลผล** ไม่ใช่ตอนวาง

### 8.4 อาวุธ

| อาวุธ | จีน | ระยะ | ผลพิเศษ |
|---|---|---|---|
| **หน้าไม้กลขงเบ้ง** | 诸葛连弩 | **1** | ลง "จู่โจม" **ไม่จำกัดจำนวน** |
| **กระบี่คู่หยินหยาง** | 雌雄双股剑 | **2** | "จู่โจม" เป้าหมาย**เพศต่างกัน** → เขาเลือก: ทิ้งการ์ด 1 ใบ **หรือ** ให้เราจั่ว 1 ใบ |
| **กระบี่เหมันต์** | 寒冰剑 | **2** | "จู่โจม" จะทำดาเมจ → เลือก**แทนดาเมจ**ด้วยการทิ้งการ์ดเป้าหมาย 2 ใบ |
| **กระบี่ชิงกัง** | 青釭剑 | **2** | 🔒 "จู่โจม" ของเรา **เมินเกราะ**เป้าหมาย |
| **ง้าวมังกรเขียว** | 青龙偃月刀 | **3** | "จู่โจม" ถูก**หลบคม** → ลง "จู่โจม" ใส่เป้าหมายเดิมได้อีก 1 ครั้งทันที |
| **ทวนอสรพิษจั้งปา** | 丈八蛇矛 | **3** | ใช้การ์ดในมือ **2 ใบ** แทน "จู่โจม" 1 ใบ (ดอกอะไรก็ได้) |
| **ขวานผ่าศิลา** | 贯石斧 | **3** | "จู่โจม" ถูก**หลบคม** → ทิ้งการ์ด 2 ใบ เพื่อ**บังคับให้โดน** |
| **ทวนฟางเทียนผ่าฟ้า** | 方天画戟 | **4** | "จู่โจม" เป็นการ์ด**ใบสุดท้ายในมือ** → เลือกเป้าหมายได้สูงสุด **3 คน** |
| **ธนูกิเลน** | 麒麟弓 | **5** | "จู่โจม" ทำดาเมจสำเร็จ → **ทำลายม้า**เป้าหมาย 1 ตัว |

### 8.5 เกราะ

| เกราะ | จีน | ผล |
|---|---|---|
| **ค่ายกลแปดทิศ** | 八卦阵 | ต้องลง "หลบคม" → **ตัดสิน**: ดอก**แดง** → นับเป็นลง "หลบคม" อัตโนมัติ |
| **โล่เทพพิทักษ์** | 仁王盾 | 🔒 "จู่โจม" ดอก**ดำ** ไม่มีผลกับเรา |

### 8.6 ม้า

| ม้า | จีน | ประเภท | ผล |
|---|---|---|---|
| เซ็กเธาว์ | 赤兔 | **-1** | เราคำนวณระยะไปหาคนอื่น -1 |
| เต๊กเลา | 的卢 | **-1** | (เหมือนกัน) |
| อุ้งทองเหินสายฟ้า | 爪黄飞电 | **-1** | (เหมือนกัน) |
| เงาไร้รอย | 绝影 | **+1** | คนอื่นคำนวณระยะมาหาเรา +1 |
| อาชาต้าหว่าน | 大宛 | **+1** | (เหมือนกัน) |
| อาชาม่วงเพลิง | 紫骍 | **+1** | (เหมือนกัน) |

---

## A8. องค์ประกอบกองการ์ด (104 ใบ)

### 9.1 หลักการออกแบบ

กองการ์ดนี้ **ออกแบบใหม่** (ไม่ได้ลอกจากต้นฉบับ) โดยยึดหลัก:

| หลักการ | รายละเอียด |
|---|---|
| **โครงสร้าง 2 สำรับ** | ♠️♥️♣️♦️ × A–K × **2 ชุด** = 104 ใบพอดี — แต่ละ (ดอก, เลข) มี **2 ใบ** |
| **แดง 50% ดำ 50%** | 52/52 พอดี → ค่ายกลแปดทิศ / ม้าเหล็กทะลวงค่าย มีโอกาส **50%** เป๊ะ |
| **แต่ละดอก 26 ใบ** | → สุขจนลืมจ๊กรอด **25%** เป๊ะ |
| **ตรวจสอบได้ด้วย unit test** | ดูหัวข้อ 10 |

### 9.2 ตารางแจกแจงตามดอก

| การ์ด | ♠️ | ♥️ | ♣️ | ♦️ | **รวม** |
|---|---:|---:|---:|---:|---:|
| จู่โจม | 10 | 4 | 10 | 6 | **30** |
| หลบคม | 0 | 8 | 0 | 7 | **15** |
| ท้อคืนชีพ | 0 | 5 | 0 | 3 | **8** |
| เนรมิตทรัพย์จากสูญ | 0 | 2 | 1 | 1 | **4** |
| ข้ามน้ำรื้อสะพาน | 1 | 0 | 2 | 1 | **4** |
| ฉกทรัพย์ตามน้ำ | 1 | 0 | 2 | 1 | **4** |
| ลบล้างกลศึก | 1 | 1 | 2 | 0 | **4** |
| ท้าศึกเดี่ยว | 1 | 0 | 1 | 1 | **3** |
| ชนเผ่าใต้บุกค่าย | 1 | 0 | 2 | 0 | **3** |
| สุขจนลืมจ๊ก | 1 | 1 | 1 | 0 | **3** |
| ยืมดาบฆ่าคน | 0 | 0 | 1 | 1 | **2** |
| ห้าธัญญาบริบูรณ์ | 0 | 1 | 0 | 1 | **2** |
| หมื่นศรถล่มค่าย | 0 | 0 | 0 | 1 | **1** |
| สัตย์สาบานสวนท้อ | 0 | 1 | 0 | 0 | **1** |
| อสนีบาตเวียนค่าย | 1 | 0 | 0 | 0 | **1** |
| หน้าไม้กลขงเบ้ง | 1 | 0 | 1 | 0 | **2** |
| กระบี่คู่หยินหยาง | 1 | 0 | 0 | 0 | **1** |
| กระบี่เหมันต์ | 1 | 0 | 0 | 0 | **1** |
| กระบี่ชิงกัง | 1 | 0 | 0 | 0 | **1** |
| ง้าวมังกรเขียว | 1 | 0 | 0 | 0 | **1** |
| ทวนอสรพิษจั้งปา | 1 | 0 | 0 | 0 | **1** |
| ขวานผ่าศิลา | 0 | 0 | 0 | 1 | **1** |
| ทวนฟางเทียนผ่าฟ้า | 0 | 0 | 0 | 1 | **1** |
| ธนูกิเลน | 0 | 1 | 0 | 0 | **1** |
| ค่ายกลแปดทิศ | 1 | 0 | 1 | 0 | **2** |
| โล่เทพพิทักษ์ | 0 | 0 | 1 | 0 | **1** |
| ม้า -1 | 0 | 2 | 1 | 0 | **3** |
| ม้า +1 | 2 | 0 | 0 | 1 | **3** |
| **รวมแต่ละดอก** | **26** | **26** | **26** | **26** | **104** |

### 9.3 รายการการ์ดครบ 104 ใบ

#### ♠️ โพดำ (Spade) — 26 ใบ

| เลข | ใบที่ 1 | ใบที่ 2 |
|---|---|---|
| A | หน้าไม้กลขงเบ้ง | จู่โจม |
| 2 | ค่ายกลแปดทิศ | กระบี่คู่หยินหยาง |
| 3 | กระบี่เหมันต์ | จู่โจม |
| 4 | ท้าศึกเดี่ยว | จู่โจม |
| 5 | ง้าวมังกรเขียว | เงาไร้รอย (ม้า +1) |
| 6 | กระบี่ชิงกัง | จู่โจม |
| 7 | จู่โจม | จู่โจม |
| 8 | จู่โจม | ชนเผ่าใต้บุกค่าย |
| 9 | จู่โจม | **อสนีบาตเวียนค่าย** |
| 10 | จู่โจม | จู่โจม |
| J | ฉกทรัพย์ตามน้ำ | ข้ามน้ำรื้อสะพาน |
| Q | ทวนอสรพิษจั้งปา | สุขจนลืมจ๊ก |
| K | อาชาต้าหว่าน (ม้า +1) | ลบล้างกลศึก |

#### ♥️ โพแดง (Heart) — 26 ใบ

| เลข | ใบที่ 1 | ใบที่ 2 |
|---|---|---|
| A | สัตย์สาบานสวนท้อ | หลบคม |
| 2 | เนรมิตทรัพย์จากสูญ | หลบคม |
| 3 | ท้อคืนชีพ | หลบคม |
| 4 | ท้อคืนชีพ | หลบคม |
| 5 | ธนูกิเลน | เซ็กเธาว์ (ม้า -1) |
| 6 | ท้อคืนชีพ | หลบคม |
| 7 | ท้อคืนชีพ | หลบคม |
| 8 | ท้อคืนชีพ | หลบคม |
| 9 | เนรมิตทรัพย์จากสูญ | จู่โจม |
| 10 | ห้าธัญญาบริบูรณ์ | จู่โจม |
| J | หลบคม | จู่โจม |
| Q | สุขจนลืมจ๊ก | จู่โจม |
| K | ลบล้างกลศึก | อุ้งทองเหินสายฟ้า (ม้า -1) |

#### ♣️ ดอกจิก (Club) — 26 ใบ

| เลข | ใบที่ 1 | ใบที่ 2 |
|---|---|---|
| A | หน้าไม้กลขงเบ้ง | จู่โจม |
| 2 | ค่ายกลแปดทิศ | โล่เทพพิทักษ์ |
| 3 | ข้ามน้ำรื้อสะพาน | จู่โจม |
| 4 | ข้ามน้ำรื้อสะพาน | จู่โจม |
| 5 | เต๊กเลา (ม้า -1) | จู่โจม |
| 6 | ท้าศึกเดี่ยว | จู่โจม |
| 7 | ชนเผ่าใต้บุกค่าย | จู่โจม |
| 8 | ชนเผ่าใต้บุกค่าย | จู่โจม |
| 9 | เนรมิตทรัพย์จากสูญ | จู่โจม |
| 10 | ฉกทรัพย์ตามน้ำ | จู่โจม |
| J | ฉกทรัพย์ตามน้ำ | จู่โจม |
| Q | สุขจนลืมจ๊ก | ยืมดาบฆ่าคน |
| K | ลบล้างกลศึก | ลบล้างกลศึก |

#### ♦️ ข้าวหลามตัด (Diamond) — 26 ใบ

| เลข | ใบที่ 1 | ใบที่ 2 |
|---|---|---|
| A | หมื่นศรถล่มค่าย | หลบคม |
| 2 | เนรมิตทรัพย์จากสูญ | หลบคม |
| 3 | ท้อคืนชีพ | หลบคม |
| 4 | ท้อคืนชีพ | หลบคม |
| 5 | ขวานผ่าศิลา | หลบคม |
| 6 | จู่โจม | หลบคม |
| 7 | จู่โจม | หลบคม |
| 8 | จู่โจม | ท้อคืนชีพ |
| 9 | จู่โจม | ฉกทรัพย์ตามน้ำ |
| 10 | จู่โจม | ข้ามน้ำรื้อสะพาน |
| J | จู่โจม | ท้าศึกเดี่ยว |
| Q | ทวนฟางเทียนผ่าฟ้า | ห้าธัญญาบริบูรณ์ |
| K | อาชาม่วงเพลิง (ม้า +1) | ยืมดาบฆ่าคน |

---

## A9. การตรวจสอบสมดุล (Balance Verification)

> เขียนเป็น **`tests/balance.test.ts`** และรันทุกครั้งที่แก้ `cards.json`

### 10.1 ตรวจสอบโครงสร้าง

```ts
describe('deck structure', () => {
  it('has exactly 104 cards', () => {
    expect(deck.length).toBe(104)
  })

  it('has 26 cards per suit', () => {
    for (const suit of SUITS) expect(countSuit(deck, suit)).toBe(26)
  })

  it('has exactly 2 cards per (suit, rank)', () => {
    for (const suit of SUITS)
      for (let rank = 1; rank <= 13; rank++)
        expect(count(deck, suit, rank)).toBe(2)
  })

  it('is 50/50 red/black', () => {
    expect(countColor(deck, 'red')).toBe(52)
    expect(countColor(deck, 'black')).toBe(52)
  })
})
```

### 10.2 ตรวจสอบความน่าจะเป็นของไพ่ตัดสิน

| กลไก | เงื่อนไข | ใบ | ความน่าจะเป็น | ประเมิน |
|---|---|---:|---:|---|
| **ค่ายกลแปดทิศ** | แดง | 52/104 | **50.0%** | เกราะที่ดี แต่พึ่งไม่ได้เต็มที่ ✅ |
| **ม้าเหล็กทะลวงค่าย** (ม้าเฉียว) | แดง | 52/104 | **50.0%** | ครึ่งต่อครึ่ง ✅ |
| **ร่ายระบำลั่วสุ่ย** (เอียนสี) | ดำ | 52/104 | **50.0%** | คาดหวังได้ +1 ใบ/เทิร์นโดยเฉลี่ย ✅ |
| **สุขจนลืมจ๊ก** | รอดถ้า ♥️ | 26/104 | **รอด 25.0%** | โดนข้ามเฟส 75% — แรงพอควร ✅ |
| **เนตรเดียวทวงแค้น** (แฮหัวตุ้น) | ไม่ใช่ ♥️ | 78/104 | **ติด 75.0%** | สกิลสวนกลับที่น่ากลัว ✅ |
| **อสนีบาตเวียนค่าย** | ♠️ 2–9 | 16/104 | **15.4%** | วนราว 6–7 คนก่อนระเบิด ✅ |

**อสนีบาตเวียนค่ายกับ 8 คน:**
```
P(ไม่มีใครโดนเลยครบ 1 รอบ) = (1 - 0.154)^8 = 27%
→ 73% ที่จะระเบิดใส่ใครสักคนภายใน 1 รอบ ✅ ตึงเครียดกำลังดี
```

### 10.3 สมดุลการ์ดพื้นฐาน

| ประเด็น | ค่า | ประเมิน |
|---|---|---|
| **จู่โจม : หลบคม** | 30 : 15 = **2:1** | อัตราส่วนคลาสสิก — เกมรุกได้เปรียบ ✅ |
| **จู่โจม ดำ : แดง** | 20 : 10 = **2:1** | **โล่เทพพิทักษ์กัน "จู่โจม" ได้ 67%** — แรง แต่ไม่ absolute ✅ |
| **ท้อคืนชีพ** | 8 ใบ (7.7%) | หายาก → ความตายมีน้ำหนัก ✅ |
| **หลบคม + ท้อคืนชีพ = แดงล้วน** | 23 ใบ | ทำให้สกิลแปลงการ์ด**ไม่แย่งทรัพยากรกัน** ✅ |

### 10.4 ทรัพยากรของสกิลแปลงการ์ด

| สกิล | นายพล | ใช้การ์ด | ใช้ได้ | ประเมิน |
|---|---|---|---:|---|
| คมง้าวชาด | กวนอู | **แดง** → จู่โจม | 52 ใบ | ครึ่งสำรับ ✅ |
| เงางามหลบคม | เอียนสี | **ดำ** → หลบคม | 52 ใบ | ครึ่งสำรับ ✅ |
| ระฆังราตรีปล้นค่าย | กำเหลง | **ดำ** → ข้ามสะพานฯ | 52 ใบ | ครึ่งสำรับ ✅ |
| เข็มทองต่อชีพ | ฮัวโต๋ | **แดง** → ท้อคืนชีพ | 52 ใบ | ครึ่งสำรับ (เฉพาะคนใกล้ตาย) ✅ |
| โฉมงามตรึงศึก | ไต้เกี้ยว | **♦️** → เพลินฯ | 26 ใบ | 1 ใน 4 — จำกัดกว่า สมเหตุสมผล ✅ |

> **หมายเหตุการออกแบบ**: "หลบคม" กับ "ท้อคืนชีพ" เป็น**สีแดงล้วน** โดยตั้งใจ → ทำให้เอียนสี (ดำ→หลบคม) และกำเหลง (ดำ→ข้ามสะพานฯ) ใช้การ์ดที่ปกติ "ไม่ค่อยมีค่า" ส่วนกวนอูและฮัวโต๋ใช้แดง — แต่ละคนมีของใช้ครึ่งสำรับพอดี ไม่มีใครขาดแคลน

---

## A10. นายพลและสกิล

**รวม 25 ตัว** · 🔒 = สกิลบังคับ · 👑 = สกิลเจ้าเมือง

### 🔵 วุยก๊ก (Wei)

| นายพล | HP | สกิล | Trigger | รายละเอียด |
|---|---|---|---|---|
| **โจโฉ** | 4 | **พลิกภัยเป็นกล** | `OnDamaged` | ได้รับดาเมจ → **เก็บการ์ดที่ทำร้ายเรา** |
| | | 👑 **ใต้ธงวุย** | `OnNeedDodge` | ต้องลง "หลบคม" → ให้ฝ่าย**วุยก๊ก**คนอื่นลงแทนได้ (ถามวนตามที่นั่ง) |
| **สุมาอี้** | 3 | **ชิงคืนหลังศึก** | `OnDamaged` | ได้รับดาเมจ → **ชิงการ์ด 1 ใบ**จากผู้ทำร้าย |
| | | **พลิกชะตา** | `BeforeJudgeEffect` | ก่อนไพ่ตัดสิน**ของใครก็ได้**มีผล → ลงการ์ดในมือ **แทนที่** |
| **แฮหัวตุ้น** | 4 | **เนตรเดียวทวงแค้น** | `OnDamaged` | ได้รับดาเมจ → ตัดสิน: ไม่ใช่ ♥️ → ผู้ทำร้ายเลือก **ทิ้ง 2 ใบ** หรือ **เสีย 1 HP** |
| **เตียวเลี้ยว** | 4 | **แปดร้อยทลายค่าย** | `DrawPhase` | สละการจั่ว → **ชิงการ์ดในมือ**จากคนอื่นสูงสุด 2 คน คนละ 1 ใบ |
| **เคาทู** | 4 | **เปลือยเกราะท้าศึก** | `DrawPhase` | จั่วน้อยลง 1 ใบ → "จู่โจม"/"ท้าศึกเดี่ยว" **ดาเมจ +1** (จนจบเทิร์น) |
| **กุยแก** | 3 | **เก็บลิขิตฟ้า** | `AfterJudge` | หลังไพ่ตัดสิน**ของเรา**มีผล → **เก็บไพ่ใบนั้น** |
| | | **กลฝากยามโรยแรง** | `OnHPLost` | เสีย 1 HP → ดูการ์ดบนกอง **2 ใบ** แล้ว**แจกให้ใครก็ได้**<br>▸ เสีย 2 HP = ทำงาน 2 ครั้ง |
| **เอียนสี** | 3 | **เงางามหลบคม** | `CardConversion` | การ์ด**ดำ** → ใช้แทน **"หลบคม"** |
| | | **ร่ายระบำลั่วสุ่ย** | `TurnStart` | ตัดสิน: **ดำ** → เก็บการ์ดนั้น + **ตัดสินซ้ำ** (วนจนออกแดง) |

### 🔴 จ๊กก๊ก (Shu)

| นายพล | HP | สกิล | Trigger | รายละเอียด |
|---|---|---|---|---|
| **เล่าปี่** | 4 | **ปันทรัพย์รวมใจ** | `PlayPhase` | ให้การ์ดในมือแก่คนอื่นกี่ใบก็ได้ → ให้ครบ **2 ใบ**ในเทิร์น = **ฟื้น 1 HP** (1 ครั้ง/เทิร์น) |
| | | 👑 **ธงจ๊กเรียกศึก** | `OnNeedSha` | ต้องลง "จู่โจม" → ให้ฝ่าย**จ๊กก๊ก**คนอื่นลงแทนได้ |
| **กวนอู** | 4 | **คมง้าวชาด** | `CardConversion` | การ์ด**แดง** → ใช้แทน **"จู่โจม"** |
| **เตียวหุย** | 4 | 🔒 **คำรามสะพานเตียงปัน** | `Passive` | ลง "จู่โจม" **ไม่จำกัดจำนวน** |
| **ขงเบ้ง** | 3 | **อ่านดาววางกล** | `TurnStart` | ดูการ์ดบนกอง **X ใบ** (X = คนที่ยังไม่ตาย, **สูงสุด 5**) → จัดเรียงวางบน/ใต้กอง |
| | | 🔒 **กลเมืองว่าง** | `Passive` | **ไม่มีการ์ดในมือ** → ตกเป็นเป้าหมาย "จู่โจม"/"ท้าศึกเดี่ยว" **ไม่ได้** |
| **จูล่ง** | 4 | **เจ็ดเข้าเจ็ดออก** | `CardConversion` | "จู่โจม" ↔ "หลบคม" **สลับใช้แทนกันได้** |
| **ม้าเฉียว** | 4 | 🔒 **อาชาเสเหลียง** | `Passive` | ระยะไปหาคนอื่น **-1** (ซ้อนกับม้าได้) |
| | | **ม้าเหล็กทะลวงค่าย** | `OnShaTargeted` | ระบุเป้าหมาย "จู่โจม" → ตัดสิน: **แดง** → เป้าหมาย**ลง "หลบคม" ไม่ได้** |
| **หองหยิม** | 3 | **ปัญญากลจักร** | `OnUseTrick` | ใช้**กลอุบายธรรมดา** (ไม่ใช่การ์ดแปลง) → **จั่ว 1 ใบ** |
| | | 🔒 **เครื่องกลไร้พรมแดน** | `Passive` | ใช้กลอุบาย **ไม่จำกัดระยะ** |

### 🟢 ง่อก๊ก (Wu)

| นายพล | HP | สกิล | Trigger | รายละเอียด |
|---|---|---|---|---|
| **ซุนกวน** | 4 | **ชั่งดุลใต้หล้า** | `PlayPhase` (1/เทิร์น) | ทิ้งการ์ดกี่ใบก็ได้ → **จั่วใหม่เท่าจำนวนที่ทิ้ง** |
| | | 👑🔒 **แคว้นง่อค้ำชู** | `OnHealedByWu` | ฝ่าย**ง่อก๊ก**คนอื่นใช้ "ท้อคืนชีพ" กับเรา → **ฟื้นเพิ่มอีก 1 HP** |
| **กำเหลง** | 4 | **ระฆังราตรีปล้นค่าย** | `CardConversion` | การ์ด**ดำ** → ใช้แทน **"ข้ามน้ำรื้อสะพาน"** |
| **ลิบอง** | 4 | **ซ่อนคมสะสมศึก** | `DiscardPhase` | เฟสลงการ์ด**ไม่ได้ใช้ "จู่โจม" เลย** → **ข้ามเฟสทิ้งการ์ด** |
| **อุยกาย** | 4 | **โบยกายลวงศึก** | `PlayPhase` (หลายครั้ง) | **เสีย 1 HP เอง** → **จั่ว 2 ใบ** |
| **จิวยี่** | 3 | **ปรีชาเจียงตง** | `DrawPhase` | **จั่วเพิ่ม 1 ใบ** (รวม 3 ใบ) |
| | | **ไพ่ลวงซ่อนคม** | `PlayPhase` (1/เทิร์น) | เลือก 1 คน → ให้เขา**ทายดอก** → เขาได้การ์ดในมือเรา 1 ใบ (เราเลือก) แล้วเปิด<br>▸ **ทายผิด** → เขา**เสีย 1 HP** |
| **ไต้เกี้ยว** | 3 | **โฉมงามตรึงศึก** | `CardConversion` | การ์ด **♦️** → ใช้แทน **"สุขจนลืมจ๊ก"** |
| | | **แพรพลิ้วเบี่ยงคม** | `OnShaTargeted` | ตกเป็นเป้า "จู่โจม" → **ทิ้งการ์ด 1 ใบ** → **โอน "จู่โจม" ไปคนอื่น**<br>▸ เป้าใหม่ต้องอยู่ในระยะโจมตีเรา และ**ห้ามเป็นผู้ใช้** |
| **ลกซุน** | 3 | 🔒 **ถ่อมตนซ่อนคม** | `Passive` | ตกเป็นเป้าหมาย **"ฉกทรัพย์ตามน้ำ" และ "สุขจนลืมจ๊ก" ไม่ได้** |
| | | **กลค่ายไม่สิ้น** | `OnHandEmpty` | **เสียการ์ดใบสุดท้ายในมือ** → **จั่ว 1 ใบ** |
| **ซุนซางเซียง** | 3 | **ผูกวาสนาสองแคว้น** | `PlayPhase` (1/เทิร์น) | **ทิ้ง 2 ใบ** + เลือกคนที่**บาดเจ็บ** → **ทั้งเราและเขาฟื้น 1 HP** |
| | | **ศาสตราไม่ขาดมือ** | `OnEquipmentLost` | **เสียอุปกรณ์ 1 ใบ** → **จั่ว 2 ใบ** |

### ⚪ อิสระ (Qun)

| นายพล | HP | สกิล | Trigger | รายละเอียด |
|---|---|---|---|---|
| **ฮัวโต๋** | 3 | **คัมภีร์ถุงเขียว** | `PlayPhase` (1/เทิร์น) | **ทิ้งการ์ดในมือ 1 ใบ** → คนที่**บาดเจ็บ** 1 คน **ฟื้น 1 HP** |
| | | **เข็มทองต่อชีพ** | `OutOfTurn` | **นอกเทิร์นตัวเอง** → การ์ด**แดง** ใช้แทน **"ท้อคืนชีพ"** (เฉพาะคน**ใกล้ตาย**) |
| **ลิโป้** | 4 | 🔒 **หอกฟางเทียนข่มทัพ** | `Passive` | **"จู่โจม"** ของเรา → เป้าหมายต้องลง **"หลบคม" 2 ใบ**<br>**"ท้าศึกเดี่ยว"** ของเรา → คู่ต่อสู้ต้องลง **"จู่โจม" 2 ใบ**ทุกครั้ง |
| **เตียวเสี้ยน** | 3 | **กลหญิงงามแตกสัมพันธ์** | `PlayPhase` (1/เทิร์น) | **ทิ้ง 1 ใบ** + เลือกผู้เล่น**ชาย 2 คน** → **บังคับให้คนหนึ่ง "ท้าศึกเดี่ยว" กับอีกคน** |
| | | **จันทร์หลบโฉม** | `TurnEnd` | **จั่ว 1 ใบ** |

---

## A11. Event Stack & Trigger System

### 12.1 หัวใจของ engine

เกมนี้**ไม่ใช่**เกมผลัดกันเล่นธรรมดา — มันคือเกมที่**เทิร์นถูกขัดจังหวะตลอดเวลา**

```
A ยิง "จู่โจม" ใส่ B
  ├─ trigger: OnShaTargeted  → B มี "แพรพลิ้วเบี่ยงคม"? → โอนเป้าหมายได้
  ├─ trigger: OnShaTargeted  → A มี "ม้าเหล็กทะลวงค่าย"? → ตัดสิน
  │    └─ trigger: BeforeJudgeEffect → C มี "พลิกชะตา"? → เปลี่ยนผล
  ├─ ถาม B ลง "หลบคม"
  │    └─ B มี "ค่ายกลแปดทิศ" → ตัดสิน (แทรกอีกชั้น)
  ├─ ถ้าโดน → trigger: BeforeDamage → trigger: OnDamaged
  │    └─ B เป็นโจโฉ → เก็บการ์ด / B เป็นแฮหัวตุ้น → ตัดสินสวนกลับ
  └─ ถ้า B ตาย → trigger: OnDying → ถามหา "ท้อคืนชีพ" วนทุกคน
```

> ถ้าเขียนเป็น function call ซ้อนกัน โค้ดจะพังทันที — **ต้องเป็น stack**

### 12.2 โครงสร้างที่แนะนำ

```ts
// engine/src/core/eventStack.ts
export interface GameEvent {
  id: string
  type: EventType
  source?: PlayerId
  targets?: PlayerId[]
  cards?: CardId[]
  cancelled: boolean          // ⚠️ "ลบล้างกลศึก" ทำงานผ่านตรงนี้
  data: Record<string, unknown>
}

// ประมวลผลแบบ stack — event ใหม่ push ทับ, ทำเสร็จค่อย pop
export class EventStack {
  private stack: GameEvent[] = []
  push(e: GameEvent): void { this.stack.push(e) }
  pop(): GameEvent | undefined { return this.stack.pop() }
  current(): GameEvent | undefined { return this.stack.at(-1) }
}
```

**Decision Request — ใช้ generator**

```ts
// engine หยุดรอตรงนี้ได้ โดยไม่ต้องมี callback ซ้อน
export function* useSha(
  state: GameState,
  source: PlayerId,
  target: PlayerId,
): Generator<Decision, void, PlayerAnswer> {

  const dodge = yield {
    type: 'askForCard',
    player: target,
    cardType: 'shan',
    reason: 'respondToSha',
  }

  if (!dodge.cardIds?.length) {
    yield* dealDamage(state, source, target, 1)
  }
}
```

> **ทำไม generator**: server แค่เรียก `gen.next(playerAnswer)` เมื่อได้คำตอบจาก socket
> — ไม่ต้องเขียน state machine เอง และ engine ยังคง **ไม่รู้จัก network** อยู่

### 12.3 Trigger Points ทั้งหมด

```ts
export type TriggerPoint =
  // ── วงจรเทิร์น ──
  | 'TurnStart'            // เฟสเตรียมพร้อม
  | 'JudgePhaseStart'
  | 'DrawPhaseStart'
  | 'DrawPhaseEnd'
  | 'PlayPhaseStart'
  | 'PlayPhaseEnd'
  | 'DiscardPhaseStart'
  | 'TurnEnd'

  // ── การ์ด ──
  | 'OnCardUsed'
  | 'OnUseTrick'
  | 'OnCardTargeted'
  | 'OnShaTargeted'
  | 'OnNeedDodge'
  | 'OnNeedSha'
  | 'OnCardLost'
  | 'OnHandEmpty'
  | 'OnEquipmentLost'

  // ── ดาเมจ / พลังชีวิต ──
  | 'BeforeDamage'
  | 'OnDamaged'
  | 'OnHPLost'             // ไม่ใช่ดาเมจ (เช่น โบยกายลวงศึก)
  | 'OnHealed'
  | 'OnHealedByWu'         // สำหรับสกิล "แคว้นง่อค้ำชู"
  | 'OnDying'
  | 'OnDeath'

  // ── ไพ่ตัดสิน ──
  | 'OnJudgeCardRevealed'
  | 'BeforeJudgeEffect'    // ⚠️ "พลิกชะตา" แทรกตรงนี้
  | 'OnJudgeResult'
  | 'AfterJudge'           // ⚠️ "เก็บลิขิตฟ้า" เก็บตรงนี้
```

### 12.4 ลำดับความสำคัญของ trigger

เมื่อ trigger เดียวกันมีหลายสกิลรอทำงาน:

```
1. สกิลบังคับ (🔒 locked) ทำงานก่อนเสมอ
2. สกิลของ "เจ้าของเทิร์น" ก่อน
3. จากนั้นวนตามลำดับที่นั่ง (ตามเข็มนาฬิกา)
4. ถ้าผู้เล่นคนเดียวมีหลายสกิลใน trigger เดียวกัน → ให้เขาเลือกลำดับเอง
```

---

# ภาคผนวก B — Engine Schema Reference

> Schema ส่วนนี้เป็นแนวทางจาก Spec กฎเกมเดิม ต้องปรับให้ตรงกับโค้ดจริงโดยไม่ทำลาย Authority และ Hidden Information

## B1. Engine TypeScript Types & Data Schema (Reference)

### 13.1 Core Types

```ts
// engine/src/types.ts

export type Suit  = 'spade' | 'heart' | 'club' | 'diamond'
export type Color = 'red' | 'black'
export type Rank  = 1|2|3|4|5|6|7|8|9|10|11|12|13   // 1=A, 11=J, 12=Q, 13=K

export type Faction = 'wei' | 'shu' | 'wu' | 'qun'
export type Role    = 'lord' | 'loyalist' | 'rebel' | 'traitor'
export type Gender  = 'male' | 'female'

export type CardCategory = 'basic' | 'trick' | 'delayedTrick' | 'equipment'
export type EquipSlot    = 'weapon' | 'armor' | 'horseMinus' | 'horsePlus'

export interface Card {
  id: string              // "spade_1_1"  = {suit}_{rank}_{copy}
  typeKey: string         // "sha" | "crossbow" | ...
  suit: Suit
  rank: Rank
  // ⚠️ ไม่เก็บ color แยก — คำนวณจาก suit เสมอ (กันข้อมูลไม่ตรงกัน)
}

export const colorOf = (suit: Suit): Color =>
  suit === 'heart' || suit === 'diamond' ? 'red' : 'black'

export interface Player {
  id: string
  seat: number
  name: string

  role: Role                // ⚠️ ต้อง filter ก่อนส่งให้ client คนอื่น
  roleRevealed: boolean

  generalId: string
  faction: Faction
  gender: Gender

  hp: number
  maxHp: number
  alive: boolean

  hand: Card[]              // ⚠️ ต้อง filter
  equipment: Partial<Record<EquipSlot, Card>>
  judgmentZone: Card[]      // LIFO — ใบท้ายสุดประมวลผลก่อน

  // ตัวนับที่รีเซ็ตทุกเทิร์น
  shaUsedThisTurn: number
  skillUsedThisTurn: Record<string, number>
}

export interface GameState {
  seed: number              // ⚠️ ต้องมี — เพื่อ reproduce bug ได้
  players: Player[]
  currentSeat: number
  phase: Phase
  drawPile: Card[]          // ⚠️ ต้อง filter
  discardPile: Card[]
  eventStack: GameEvent[]
  pendingDecision?: Decision
  finished: boolean
  winners?: Role[]
}
```

### 13.2 `cards.json`

```jsonc
{
  "deckVersion": "1.0",
  "totalCards": 104,

  "cards": [
    { "id": "spade_1_1", "typeKey": "crossbow", "suit": "spade", "rank": 1 },
    { "id": "spade_1_2", "typeKey": "sha",      "suit": "spade", "rank": 1 },
    { "id": "spade_2_1", "typeKey": "bagua",    "suit": "spade", "rank": 2 },
    { "id": "spade_2_2", "typeKey": "sword_yy", "suit": "spade", "rank": 2 }
    // ... รวม 104 ใบ ตามตารางหัวข้อ 9.3
  ],

  "cardTypes": {
    "sha": {
      "nameKey": "card.sha",
      "category": "basic",
      "targetRule": "singleInRange",
      "usageLimitPerTurn": 1,
      "effects": [{ "type": "damage", "amount": 1 }]
    },
    "wuxie": {
      "nameKey": "card.wuxie",
      "category": "trick",
      "targetRule": "targetTrick",
      "canTargetSameType": true,
      "playableAnytime": true
    },
    "crossbow": {
      "nameKey": "card.crossbow",
      "category": "equipment",
      "slot": "weapon",
      "attackRange": 1,
      "effects": [{ "type": "removeShaLimit" }]
    }
  }
}
```

### 13.3 `generals.json`

```jsonc
{
  "generals": [
    {
      "id": "caocao",
      "nameKey": "general.caocao",
      "faction": "wei",
      "gender": "male",
      "maxHp": 4,
      "skills": ["caocao_s1", "caocao_s2"]
    }
  ],

  "skills": {
    "caocao_s1": {
      "nameKey": "skill.caocao_s1",
      "descKey": "skill.caocao_s1.desc",
      "type": "triggered",
      "trigger": "OnDamaged",
      "optional": true,
      "isLocked": false,
      "isLordSkill": false
    },
    "caocao_s2": {
      "nameKey": "skill.caocao_s2",
      "type": "triggered",
      "trigger": "OnNeedDodge",
      "isLordSkill": true
    }
  }
}
```

### 13.4 `locale/th.json`

```jsonc
{
  "card.sha":   "จู่โจม",
  "card.shan":  "หลบคม",
  "card.tao":   "ท้อคืนชีพ",
  "card.wuxie": "ลบล้างกลศึก",

  "general.caocao":       "โจโฉ",
  "skill.caocao_s1":      "พลิกภัยเป็นกล",
  "skill.caocao_s1.desc": "เมื่อได้รับดาเมจ คุณสามารถเก็บการ์ดที่ทำร้ายคุณเข้ามือ"
}
```

> ⚠️ **สำคัญมาก**: ใช้ `key` ที่ **ไม่ผูกกับชื่อ** (`skill.caocao_s1` ไม่ใช่ `skill.jianxiong`)
> เพราะถ้าวันหนึ่งจะทำเชิงพาณิชย์ ต้องเปลี่ยนชื่อสกิลทั้งหมด — แบบนี้แค่**สลับไฟล์ locale** ไม่ต้องแตะโค้ดเลย

---

# ภาคผนวก C — Test Cases ของกฎเกม

## C1. กรณีทดสอบกฎเกมเดิม

> **ผ่าน 5 เคสนี้ = engine แข็งพอรองรับนายพลอีก 200 ตัว**

### TC-1: "ลบล้างกลศึก" ซ้อนกัน ⚠️ สำคัญที่สุด

```
A ลง "ท้าศึกเดี่ยว" ใส่ B
  → C ลง "ลบล้างกลศึก" ยกเลิก "ท้าศึกเดี่ยว"
    → D ลง "ลบล้างกลศึก" ยกเลิก "ลบล้างกลศึก" ของ C
      → E ลง "ลบล้างกลศึก" ยกเลิก "ลบล้างกลศึก" ของ D

ผลที่ถูก: "ท้าศึกเดี่ยว" ถูกยกเลิก   (จำนวนคี่ = ยกเลิก, จำนวนคู่ = ผ่าน)
```
**ทดสอบ**: event stack ซ้อนได้ไม่จำกัดชั้น

---

### TC-2: "หมื่นศรถล่มค่าย" กับ 8 คน

```
A ลง "หมื่นศรถล่มค่าย"
  → ถามทีละคนตามลำดับที่นั่ง: B → C → D → E → F → G → H
  → C ลง "ลบล้างกลศึก" → ยกเลิก "เฉพาะส่วนของ C" เท่านั้น
     (B, D–H ยังโดนอยู่)
```
**ทดสอบ**: กลอุบายกลุ่มแยกเป้าหมายได้ + ยกเลิกทีละเป้าหมาย

---

### TC-3: "พลิกชะตา" แทรกไพ่ตัดสินของคนอื่น

```
A มี "อสนีบาตเวียนค่าย" ในเขตตัดสิน
  → เฟสตัดสินของ A: เปิดไพ่ = ♠️5  (โดนฟ้าผ่า!)
    → สุมาอี้ (B) ใช้ "พลิกชะตา" ลง ♥️K แทนที่
      → ผลใหม่: ไม่โดน → "อสนีบาตเวียนค่าย" ส่งต่อคนถัดไป
```
**ทดสอบ**: ระบบตัดสินหยุดรอ response จากผู้เล่น**คนอื่น**ได้

---

### TC-4: "กระบี่ชิงกัง" vs "ค่ายกลแปดทิศ"

```
A ถือ "กระบี่ชิงกัง" ลง "จู่โจม" ใส่ B
  → B มี "ค่ายกลแปดทิศ"
  → กระบี่ชิงกัง = 🔒 เมินเกราะ
  → ผลที่ถูก: B ใช้ "ค่ายกลแปดทิศ" ไม่ได้ ต้องลง "หลบคม" จริง
```
**ทดสอบ**: ลำดับความสำคัญ สกิลบังคับ vs เกราะ

---

### TC-5: โซ่ trigger ต่อเนื่อง

```
อุยกาย ใช้ "โบยกายลวงศึก" (เสีย 1 HP เอง)
  → HP เหลือ 0 → เข้าสถานะ "ใกล้ตาย"
    → ถามหา "ท้อคืนชีพ" วนตามลำดับที่นั่ง
      → ฮัวโต๋ ใช้ "เข็มทองต่อชีพ" (การ์ดแดง = ท้อคืนชีพ)
        → อุยกายรอด → จั่ว 2 ใบตามสกิลเดิม
```
**ทดสอบ**: trigger ซ้อน trigger + การ์ดแปลงร่างตอนใกล้ตาย + สกิลเดิมทำงานต่อหลังรอดตาย

---

### TC-6: Determinism (เช็กว่าไม่มี `Math.random()` หลุดรอด)

```ts
const g1 = createGame({ playerCount: 8, seed: 42 })
const g2 = createGame({ playerCount: 8, seed: 42 })

runUntilEnd(g1, botPolicy)
runUntilEnd(g2, botPolicy)

expect(g1.state).toEqual(g2.state)   // seed เดียวกัน = ผลเดียวกันเป๊ะ
```

---

# ภาคผนวก D — อภิธานศัพท์

## D1. อภิธานศัพท์

| จีน | ไทย | อังกฤษ | key |
|---|---|---|---|
| 主公 | เจ้าเมือง | Lord | `lord` |
| 忠臣 | ขุนนางภักดี | Loyalist | `loyalist` |
| 反贼 | กบฏ | Rebel | `rebel` |
| 内奸 | ไส้ศึก | Traitor | `traitor` |
| 武将 | นายพล | General | `general` |
| 体力 | พลังชีวิต | HP | `hp` |
| 手牌 | การ์ดในมือ | Hand | `hand` |
| 牌堆 | กองจั่ว | Draw Pile | `drawPile` |
| 弃牌堆 | กองทิ้ง | Discard Pile | `discardPile` |
| 判定区 | เขตไพ่ตัดสิน | Judgment Zone | `judgmentZone` |
| 装备区 | เขตอุปกรณ์ | Equipment Zone | `equipmentZone` |
| 距离 | ระยะทาง | Distance | `distance` |
| 攻击范围 | ระยะโจมตี | Attack Range | `attackRange` |
| 判定 | ไพ่ตัดสิน | Judgment | `judgment` |
| 濒死 | ใกล้ตาย | Dying | `dying` |
| 阵亡 | เสียชีวิต | Dead | `dead` |
| 锁定技 | สกิลบังคับ | Locked Skill | `lockedSkill` |
| 主公技 | สกิลเจ้าเมือง | Lord Skill | `lordSkill` |
| 魏 | วุยก๊ก | Wei | `wei` |
| 蜀 | จ๊กก๊ก | Shu | `shu` |
| 吴 | ง่อก๊ก | Wu | `wu` |
| 群 | อิสระ | Qun | `qun` |

---

# ภาคผนวก E — Thai Naming Catalog

## E1. Thai Naming Catalog & คำสั่งย้ายชื่อ

> **สถานะชื่อ**: ชุดชื่อแนะนำสำหรับนำไปใช้ใน implementation รอบถัดไป  
> **ขอบเขต**: เปลี่ยนเฉพาะข้อความที่ผู้เล่นมองเห็น ห้ามเปลี่ยน `typeKey`, `cardId`, `skillId`, `generalId`, trigger หรือ logic  
> **หลักการ**: ชื่อเชิงธีมอยู่บรรทัดแรก ส่วนคำอธิบายผลต้องบอกการกระทำตรงไปตรงมาเสมอ

### 17.1 กฎการย้ายชื่อ

1. Internal key เดิมต้องคงอยู่ เช่น `card.sha`, `skill.caocao_s1`
2. ห้าม rename file, class, typeKey หรือ Skill ID เพื่อให้ตรงกับชื่อไทย
3. แก้ชื่อผ่าน localization/data layer เท่านั้น
4. Test ที่ตรวจ logic ห้ามผูกกับข้อความภาษาไทย
5. Snapshot/UI test ที่ตรวจข้อความสามารถอัปเดตตาม Catalog นี้
6. Game log ต้อง resolve ชื่อจาก key ขณะ render ไม่ควรบันทึกชื่อไทยเป็น identity
7. Artwork ต้องไม่เป็นแหล่งข้อมูลหลักของชื่อและคำอธิบาย
8. ระหว่าง migration ให้ค้นหาชื่อเดิมทั้ง repository และจำแนกว่าเป็น:
   - ข้อความแสดงผล → เปลี่ยน
   - comment/test title → เปลี่ยนได้
   - Internal key/ID → ห้ามเปลี่ยน
9. ชื่อภาษาจีนใน Spec คงไว้เพื่อใช้อ้างอิงกลไกและต้นทาง
10. หากพบชื่อเก่าที่ไม่ได้อยู่ใน Catalog ให้หยุดและรายงานก่อนตั้งชื่อเพิ่มเอง

### 17.2 การ์ดทั้งหมด 15 ชนิด

| ประเภท | ชื่อเดิม | ชื่อใหม่ที่ใช้ใน Spec | กลไกโดยย่อ | แรงบันดาลใจ/เหตุผล |
|---|---|---|---|---|
| การ์ดพื้นฐาน | สังหาร | **จู่โจม** | โจมตีผู้เล่นเป้าหมาย 1 คนในระยะ เป้าหมายต้องใช้ “หลบคม” มิฉะนั้นเสีย 1 พลังชีวิต | ชื่อเชิงการกระทำแบบตรงไปตรงมา — สั้น จำง่าย และสื่อว่าเป็นการ์ดโจมตี โดยไม่ผูกชื่อกับผลลัพธ์ว่าต้องสังหารสำเร็จ |
| การ์ดพื้นฐาน | หลบ | **หลบคม** | ตอบโต้ “จู่โจม” เพื่อหลีกเลี่ยงความเสียหาย | ภาพการหลบคมอาวุธในสนามรบ — ชัดกว่าคำว่า “หลบ” เพียงคำเดียว และยังสั้นพอสำหรับปุ่มตอบโต้ |
| การ์ดพื้นฐาน | ท้อ | **ท้อคืนชีพ** | ฟื้น 1 พลังชีวิต หรือช่วยผู้เล่นที่อยู่ในสถานะใกล้ตาย | ผลท้อในคติจีนซึ่งเชื่อมโยงกับอายุยืนและการฟื้นชีวิต — ยังคงสัญลักษณ์ผลท้อ แต่เพิ่มคำที่ทำให้ผู้เล่นเข้าใจการกระทำทันที |
| การ์ดอุบายทันที | เนรมิตจากความว่างเปล่า | **เนรมิตทรัพย์จากสูญ** | จั่วการ์ด 2 ใบ | สำนวนจีนว่าด้วยการสร้างสิ่งขึ้นจากความว่าง — รักษาความหมายเดิม แต่คำว่า “ทรัพย์” เชื่อมกับการได้รับทรัพยากรในมือ |
| การ์ดอุบายทันที | ฉวยโอกาสลักแกะ | **ฉกทรัพย์ตามน้ำ** | เลือกผู้เล่นในระยะ 1 แล้วนำการ์ดของเป้าหมายมา 1 ใบ | กลศึกฉวยโอกาสหยิบฉวยผลประโยชน์ระหว่างทาง — สื่อการขโมยโดยอาศัยจังหวะ และอ่านเป็นธรรมชาติในภาษาไทย |
| การ์ดอุบายทันที | ข้ามสะพานแล้วรื้อทิ้ง | **ข้ามน้ำรื้อสะพาน** | เลือกผู้เล่น 1 คน แล้วทิ้งการ์ดของเป้าหมาย 1 ใบ | สำนวนจีนว่าด้วยการตัดทางหรือทำลายประโยชน์ของอีกฝ่ายหลังผ่านพ้นอุปสรรค — กระชับขึ้นและยังคงภาพของกลศึกเดิม |
| การ์ดอุบายทันที | ดวล | **ท้าศึกเดี่ยว** | ผู้ใช้และเป้าหมายผลัดกันใช้ “จู่โจม” ผู้ที่ใช้ไม่ได้ก่อนเสีย 1 พลังชีวิต | การท้าประลองตัวต่อตัวหน้ากองทัพ — สื่อว่าเป็นการประลองแบบหนึ่งต่อหนึ่งได้ชัดกว่าคำสั้นทั่วไป |
| การ์ดอุบายทันที | ยืมดาบฆ่าคน | **ยืมดาบฆ่าคน** | บังคับผู้เล่นที่มีอาวุธให้ใช้ “จู่โจม” ใส่อีกคน มิฉะนั้นผู้ใช้ได้อาวุธนั้น | กลศึกยืมมือผู้อื่นกำจัดเป้าหมาย — ชื่อเดิมตรงกับกลไกอย่างสมบูรณ์และเป็นกลอุบายจีนที่จดจำง่าย |
| การ์ดอุบายกลุ่ม | ศึกชนเผ่าใต้ | **ชนเผ่าใต้บุกค่าย** | ผู้เล่นอื่นทุกคนต้องใช้ “จู่โจม” มิฉะนั้นเสีย 1 พลังชีวิต | ศึกปราบชนเผ่าทางใต้ในเรื่องสามก๊ก — เพิ่มภาพการบุกค่ายและสื่อว่าเป็นภัยที่กระทบทุกคน |
| การ์ดอุบายกลุ่ม | ห่าธนู | **หมื่นศรถล่มค่าย** | ผู้เล่นอื่นทุกคนต้องใช้ “หลบคม” มิฉะนั้นเสีย 1 พลังชีวิต | การระดมยิงเกาทัณฑ์พร้อมกันทั่วสนามรบ — ให้ภาพการโจมตีหมู่ชัดเจนและมีบรรยากาศสงครามจีน |
| การ์ดอุบายกลุ่ม | สาบานสวนท้อ | **สัตย์สาบานสวนท้อ** | ผู้เล่นทุกคนฟื้น 1 พลังชีวิต | คำสัตย์ร่วมเป็นพี่น้องในสวนท้อ — เพิ่มคำว่า “สัตย์” เพื่อให้ชื่อสมบูรณ์และสะท้อนเหตุการณ์ในนิยายชัดขึ้น |
| การ์ดอุบายกลุ่ม | ธัญญาหารบริบูรณ์ | **ห้าธัญญาบริบูรณ์** | เปิดการ์ดตามจำนวนผู้เล่นที่ยังมีชีวิต แล้วผลัดกันเลือกคนละ 1 ใบ | สำนวนอวยพรให้ธัญญาหารทั้งห้าอุดมสมบูรณ์ — คงความหมายต้นทางและทำให้ชื่อมีเอกลักษณ์มากขึ้น |
| การ์ดอุบายตอบโต้ | ไร้ช่องโหว่ | **ลบล้างกลศึก** | ยกเลิกผลของการ์ดอุบาย 1 ใบ และสามารถตอบโต้กันเป็นทอด ๆ ได้ | การอ่านแผนและหักล้างกลยุทธ์ของฝ่ายตรงข้าม — ชื่อบอกการกระทำโดยตรงและยังมีบรรยากาศการชิงไหวชิงพริบ |
| อุบายล่าช้า | เพลินจนลืมแคว้นสู่ | **สุขจนลืมจ๊ก** | เมื่อตัดสินไม่ใช่โพแดง ผู้เล่นเป้าหมายข้ามเฟสลงการ์ด | เหตุการณ์เล่าเสี้ยนใช้ชีวิตสุขสบายจนกล่าวว่าไม่คิดถึงจ๊ก — อ้างอิงสามก๊กโดยตรง กระชับ และแก้คำเรียกแคว้นให้ตรงกับชื่อไทยที่ใช้ในเกม |
| อุบายล่าช้า | สายฟ้า | **อสนีบาตเวียนค่าย** | ตัดสินได้โพดำ 2–9 แล้วเสีย 3 พลังชีวิต หากไม่เกิดผลให้ส่งต่อผู้เล่นถัดไป | อสนีบาตที่เคลื่อนผ่านค่ายทหารจนกว่าจะฟาดลง — สื่อทั้งภัยจากสายฟ้าและกลไกส่งต่อได้ในชื่อเดียว |

### 17.3 อุปกรณ์ทั้งหมด 17 ชิ้น

| ประเภท | ชื่อเดิม | ชื่อใหม่ที่ใช้ใน Spec | กลไกโดยย่อ | แรงบันดาลใจ/เหตุผล |
|---|---|---|---|---|
| อาวุธ | หน้าไม้กลจูกัดเหลียง | **หน้าไม้กลขงเบ้ง** | ระยะ 1 ใช้ “จู่โจม” ได้ไม่จำกัดจำนวนในเฟสลงการ์ด | หน้าไม้กลที่ผูกกับขงเบ้งในวัฒนธรรมสามก๊ก — ใช้ชื่อไทยที่ผู้เล่นคุ้นเคยและอ่านสั้นกว่าการทับศัพท์จูกัดเหลียง |
| อาวุธ | กระบี่คู่หยินหยาง | **กระบี่คู่หยินหยาง** | ระยะ 2 เมื่อจู่โจมเป้าหมายต่างเพศ เป้าหมายเลือกทิ้ง 1 ใบหรือให้ผู้ใช้จั่ว 1 ใบ | คู่ตรงข้ามหยิน–หยาง — ชื่อเดิมสื่อกลไกต่างเพศชัดและมีภาพแบบจีนอยู่แล้ว |
| อาวุธ | กระบี่น้ำแข็ง | **กระบี่เหมันต์** | ระยะ 2 เลือกทิ้งการ์ดเป้าหมาย 2 ใบแทนการสร้างความเสียหาย | คมกระบี่เย็นเยียบที่หยุดยั้งแทนการปลิดชีวิต — คำว่า “เหมันต์” ให้บรรยากาศโบราณและยังสื่อความเย็น |
| อาวุธ | กระบี่ชิงกัง | **กระบี่ชิงกัง** | ระยะ 2 การจู่โจมของผู้ใช้ไม่สนผลของเกราะเป้าหมาย | อาวุธชื่อเฉพาะในเรื่องสามก๊ก — คงชื่อเฉพาะเพื่อรักษาเอกลักษณ์ของอาวุธ |
| อาวุธ | ง้าวมังกรเขียว | **ง้าวมังกรเขียว** | ระยะ 3 เมื่อจู่โจมถูกหลบคม สามารถจู่โจมเป้าหมายเดิมอีกครั้ง | ง้าวคู่กายกวนอู — ชื่อไทยเป็นที่รู้จักและสื่อภาพอาวุธชัดเจน |
| อาวุธ | ทวนงูจั้งปา | **ทวนอสรพิษจั้งปา** | ระยะ 3 ใช้การ์ดในมือ 2 ใบแทน “จู่โจม” 1 ใบ | ทวนอสรพิษคู่กายเตียวหุย — เพิ่มน้ำหนักเชิงวรรณกรรมแต่ยังรักษาคำว่าจั้งปาซึ่งเป็นชื่อเฉพาะ |
| อาวุธ | ขวานทะลุศิลา | **ขวานผ่าศิลา** | ระยะ 3 เมื่อจู่โจมถูกหลบคม ทิ้ง 2 ใบเพื่อบังคับให้การโจมตีสร้างผล | ขวานหนักที่ผ่าทะลวงหินผา — กระชับและให้ภาพพลังทำลายชัดเจน |
| อาวุธ | ทวนฟางเทียน | **ทวนฟางเทียนผ่าฟ้า** | ระยะ 4 หากจู่โจมเป็นการ์ดใบสุดท้ายในมือ เลือกเป้าหมายได้สูงสุด 3 คน | อาวุธคู่กายลิโป้และภาพการกวาดศัตรูหลายทิศ — คงชื่อฟางเทียนและเพิ่มคำที่สื่อพลังโจมตีเป็นวงกว้าง |
| อาวุธ | ธนูกิเลน | **ธนูกิเลน** | ระยะ 5 เมื่อจู่โจมสร้างความเสียหาย ทำลายม้าของเป้าหมายได้ 1 ใบ | สัตว์มงคลกิเลนและอาวุธระยะไกล — ชื่อเดิมสั้น จำง่าย และมีบรรยากาศจีนชัดเจน |
| เกราะ | ค่ายกลแปดทิศ | **ค่ายกลแปดทิศ** | เมื่อต้องใช้หลบคม ให้ตัดสิน หากเป็นสีแดงถือว่าใช้หลบคมสำเร็จ | ค่ายกลแปดทิศของขงเบ้ง — ชื่อเดิมเป็นภาพจำของสามก๊กและตรงกับกลไกตัดสิน |
| เกราะ | โล่ราชันย์ | **โล่เทพพิทักษ์** | การจู่โจมสีดำไม่มีผลต่อผู้สวมใส่ | ผู้พิทักษ์ผู้ยืนหยัดต้านคมศึก — สื่อการป้องกันชัดและหลีกเลี่ยงความเข้าใจผิดว่าเป็นอุปกรณ์เฉพาะเจ้าเมือง |
| ม้า -1 | เซ็กเธาว์ | **เซ็กเธาว์** | ลดระยะที่ผู้ใช้คำนวณไปยังผู้เล่นอื่น 1 | อาชากระต่ายแดงคู่กายลิโป้และกวนอู — ชื่อไทยเป็นที่รู้จักอย่างกว้างขวาง จึงควรคงไว้ |
| ม้า -1 | เต๊กเลา | **เต๊กเลา** | ลดระยะที่ผู้ใช้คำนวณไปยังผู้เล่นอื่น 1 | อาชาที่ช่วยเล่าปี่ข้ามลำธาร — ชื่อไทยเป็นที่คุ้นเคยในเรื่องสามก๊ก |
| ม้า -1 | จั่วอึ้งฮุยเตี้ยน | **อุ้งทองเหินสายฟ้า** | ลดระยะที่ผู้ใช้คำนวณไปยังผู้เล่นอื่น 1 | ความหมายเชิงภาพของอาชาอุ้งเท้าทองที่เร็วราวสายฟ้า — แก้การทับศัพท์ที่อ่านยากให้เป็นชื่อไทยเชิงภาพและจดจำง่าย |
| ม้า +1 | เจฺว๋อิ่ง | **เงาไร้รอย** | เพิ่มระยะที่ผู้เล่นอื่นคำนวณมายังผู้ใช้ 1 | อาชาที่รวดเร็วจนเงาตามไม่ทัน — ถ่ายทอดความหมายชื่อจีนเป็นภาษาไทยที่อ่านง่าย |
| ม้า +1 | ต้าหว่าน | **อาชาต้าหว่าน** | เพิ่มระยะที่ผู้เล่นอื่นคำนวณมายังผู้ใช้ 1 | อาชาจากดินแดนต้าหว่าน — เติมคำว่าอาชาเพื่อให้ผู้เล่นรู้ประเภทของการ์ดจากชื่อ |
| ม้า +1 | จื่อซิง | **อาชาม่วงเพลิง** | เพิ่มระยะที่ผู้เล่นอื่นคำนวณมายังผู้ใช้ 1 | อาชาสีม่วงแดงราวเปลวเพลิง — เปลี่ยนทับศัพท์ที่เข้าใจยากเป็นชื่อเชิงภาพ |

### 17.4 สกิลนายพลทั้งหมด 40 สกิล

| นายพล | ชื่อเดิม | ชื่อใหม่ที่ใช้ใน Spec | กลไกโดยย่อ | แรงบันดาลใจ/เหตุผล |
|---|---|---|---|---|
| **โจโฉ** | วีรบุรุษเจ้าเล่ห์ | **พลิกภัยเป็นกล** | เมื่อได้รับความเสียหาย สามารถนำการ์ดที่ทำร้ายตนเข้ามือ | บุคลิกโจโฉที่เปลี่ยนวิกฤตให้เป็นโอกาส — สื่อกลไกเปลี่ยนการ์ดที่ทำอันตรายให้กลายเป็นทรัพยากร |
| **โจโฉ** | คุ้มกันราชา | **ใต้ธงวุย** | สกิลเจ้าเมือง: เมื่อจำเป็นต้องใช้หลบคม ให้ผู้เล่นวุยก๊กอื่นใช้แทนได้ | การรวมกำลังผู้ใต้บังคับบัญชาภายใต้ธงวุย — สื่อทั้งก๊กที่มีสิทธิ์ช่วยและสถานะบัญชาการของเจ้าเมือง |
| **สุมาอี้** | โต้กลับ | **ชิงคืนหลังศึก** | เมื่อได้รับความเสียหาย ชิงการ์ด 1 ใบจากผู้ที่ทำร้าย | การอดทนรับจังหวะแล้วทวงผลประโยชน์กลับคืน — บอกการกระทำชิงคืนหลังถูกโจมตีได้ชัด |
| **สุมาอี้** | อัจฉริยะปีศาจ | **พลิกชะตา** | ก่อนผลไพ่ตัดสินของผู้เล่นใดมีผล สามารถใช้การ์ดในมือแทนไพ่ตัดสิน | สุมาอี้ผู้คอยพลิกผลลัพธ์ในวินาทีสำคัญ — สั้น จำง่าย และตรงกับการเปลี่ยนผลตัดสิน |
| **แฮหัวตุ้น** | ห้าวหาญเด็ดเดี่ยว | **เนตรเดียวทวงแค้น** | เมื่อได้รับความเสียหาย ตัดสินเพื่อบังคับผู้ทำร้ายทิ้ง 2 ใบหรือเสีย 1 พลังชีวิต | ภาพจำแฮหัวตุ้นผู้สูญเสียดวงตาแต่ยังสู้ต่อ — เชื่อมเอกลักษณ์นายพลกับผลสวนกลับ |
| **เตียวเลี้ยว** | จู่โจมสายฟ้าแลบ | **แปดร้อยทลายค่าย** | สละการจั่ว เพื่อชิงการ์ดในมือจากผู้เล่นอื่นสูงสุด 2 คน คนละ 1 ใบ | วีรกรรมกองกำลังแปดร้อยบุกทลายทัพใหญ่ที่หับป๋า — มีเอกลักษณ์ของเตียวเลี้ยวและให้ภาพการชิงจังหวะรวดเร็ว |
| **เคาทู** | ถอดเสื้อรบ | **เปลือยเกราะท้าศึก** | จั่วน้อยลง 1 ใบ เพื่อเพิ่มความเสียหายจากจู่โจมหรือท้าศึกเดี่ยว 1 ในเทิร์นนั้น | เคาทูเปลือยกายเข้าประลองอย่างดุดัน — สื่อทั้งต้นทุนและการเพิ่มพลังโจมตี |
| **กุยแก** | ริษยาฟ้า | **เก็บลิขิตฟ้า** | หลังไพ่ตัดสินของตนมีผล สามารถเก็บการ์ดใบนั้นเข้ามือ | ผู้มองเห็นชะตาและนำสิ่งที่ฟ้าตัดสินมาใช้ประโยชน์ — ตรงกับการเก็บไพ่ตัดสินและยังคงโทนเกี่ยวกับชะตาฟ้า |
| **กุยแก** | แผนสุดท้าย | **กลฝากยามโรยแรง** | ทุกครั้งที่เสีย 1 พลังชีวิต ดูการ์ดบนกอง 2 ใบแล้วแจกให้ผู้เล่นใดก็ได้ | กุยแกผู้ยังทิ้งแผนไว้ให้ผู้อื่นแม้ร่างกายอ่อนแอ — สะท้อนการส่งต่อประโยชน์หลังสูญเสียพลังชีวิตโดยไม่สื่อว่าต้องเสียชีวิต |
| **เอียนสี** | โฉมงามล่มเมือง | **เงางามหลบคม** | ใช้การ์ดสีดำแทนหลบคม | เงามืดของหญิงงามที่พลิ้วหลบคมศึก — สื่อทั้งเงื่อนไขสีดำและผลหลบได้ในชื่อ |
| **เอียนสี** | เทพีลั่วสุ่ย | **ร่ายระบำลั่วสุ่ย** | เริ่มเทิร์นให้ตัดสิน หากเป็นสีดำเก็บการ์ดและตัดสินซ้ำจนออกสีแดง | ภาพเทพธิดาริมแม่น้ำลั่วและจังหวะต่อเนื่องราวการร่ายรำ — สะท้อนการตัดสินซ้ำต่อเนื่องและคงเอกลักษณ์ลั่วสุ่ย |
| **เล่าปี่** | เมตตาธรรม | **ปันทรัพย์รวมใจ** | มอบการ์ดให้ผู้อื่นได้ และเมื่อมอบครบ 2 ใบในเทิร์น ฟื้น 1 พลังชีวิต | เล่าปี่ใช้ความเอื้อเฟื้อรวบรวมผู้คน — ระบุทั้งการแบ่งปันและผลจากการผูกใจ |
| **เล่าปี่** | ปลุกใจนักรบ | **ธงจ๊กเรียกศึก** | สกิลเจ้าเมือง: เมื่อจำเป็นต้องใช้จู่โจม ให้ผู้เล่นจ๊กก๊กอื่นใช้แทนได้ | การเรียกระดมผู้ใต้ธงจ๊กเข้าสู้แทนผู้นำ — สื่อก๊กที่เกี่ยวข้องและการเรียกใช้การโจมตี |
| **กวนอู** | เทพเจ้าสงคราม | **คมง้าวชาด** | ใช้การ์ดสีแดงแทนจู่โจม | ง้าวมังกรเขียวและภาพใบหน้าสีชาดของกวนอู — เชื่อมเงื่อนไขสีแดงกับอาวุธประจำตัว |
| **เตียวหุย** | คำรามสนั่น | **คำรามสะพานเตียงปัน** | ใช้จู่โจมได้ไม่จำกัดจำนวน | เตียวหุยคำรามขวางทัพที่สะพานเตียงปัน — อ้างอิงเหตุการณ์เด่นและให้ความรู้สึกบุกกดดันต่อเนื่อง |
| **ขงเบ้ง** | ดูดาว | **อ่านดาววางกล** | ดูการ์ดบนกองตามจำนวนที่กำหนด แล้วจัดเรียงไว้บนหรือใต้กอง | ขงเบ้งหยั่งดวงดาวและวางแผนก่อนศึก — สื่อทั้งการมองเห็นและการจัดลำดับ |
| **ขงเบ้ง** | กลเมืองร้าง | **กลเมืองว่าง** | เมื่อไม่มีการ์ดในมือ ไม่สามารถตกเป็นเป้าหมายของจู่โจมหรือท้าศึกเดี่ยว | กลเมืองว่างที่ใช้ความสงบนิ่งข่มขวัญศัตรู — ใช้คำไทยที่เป็นที่รู้จักมากกว่า “เมืองร้าง” และตรงกับเหตุการณ์ |
| **จูล่ง** | ใจมังกร | **เจ็ดเข้าเจ็ดออก** | ใช้จู่โจมแทนหลบคม หรือใช้หลบคมแทนจู่โจมได้ | วีรกรรมจูล่งบุกเข้าออกทัพศัตรูหลายครั้งที่เตียงปัน — สะท้อนความสามารถสลับรุกและรับอย่างคล่องตัว |
| **ม้าเฉียว** | วิชาขี่ม้า | **อาชาเสเหลียง** | ระยะที่ตนคำนวณไปยังผู้เล่นอื่นลดลง 1 | กองม้าจากแคว้นเสเหลียงซึ่งม้าเฉียวมีชื่อเสียง — มีเอกลักษณ์เฉพาะตัวกว่าชื่อเชิงระบบทั่วไป |
| **ม้าเฉียว** | ทหารม้าเหล็ก | **ม้าเหล็กทะลวงค่าย** | เมื่อเลือกเป้าหมายจู่โจม ให้ตัดสิน หากเป็นสีแดง เป้าหมายใช้หลบคมไม่ได้ | กองทหารม้าเกราะหนักพุ่งทะลวงแนวรับ — สื่อผลที่ทำให้การป้องกันของเป้าหมายถูกเจาะ |
| **หองหยิม** | รวบรวมปัญญา | **ปัญญากลจักร** | เมื่อใช้การ์ดอุบายธรรมดาจากมือ จั่ว 1 ใบ | ความสามารถด้านกลไกและสิ่งประดิษฐ์ — เชื่อมการใช้กลอุบายกับเอกลักษณ์นักประดิษฐ์ |
| **หองหยิม** | อัจฉริยะพิสดาร | **เครื่องกลไร้พรมแดน** | ใช้การ์ดอุบายโดยไม่จำกัดระยะ | เครื่องกลที่ส่งผลได้ไกลเกินข้อจำกัดทั่วไป — สื่อผลไม่จำกัดระยะโดยตรงในโทนจีนเชิงกลไก |
| **ซุนกวน** | ถ่วงดุลอำนาจ | **ชั่งดุลใต้หล้า** | หนึ่งครั้งต่อเทิร์น ทิ้งการ์ดกี่ใบก็ได้แล้วจั่วใหม่เท่าจำนวน | ซุนกวนผู้ประเมินกำลังและรักษาสมดุลของแคว้น — คงแนวคิดสมดุล แต่เพิ่มภาพการชั่งน้ำหนักสถานการณ์ใหญ่ |
| **ซุนกวน** | กอบกู้ | **แคว้นง่อค้ำชู** | สกิลเจ้าเมือง: เมื่อผู้เล่นง่อก๊กอื่นใช้ท้อคืนชีพกับตน ฟื้นเพิ่มอีก 1 พลังชีวิต | ผู้คนแห่งง่อก๊กช่วยค้ำจุนเจ้าแคว้น — สื่อก๊กและความช่วยเหลือได้ชัดกว่าคำกว้าง ๆ |
| **กำเหลง** | จู่โจมพิสดาร | **ระฆังราตรีปล้นค่าย** | ใช้การ์ดสีดำแทนข้ามน้ำรื้อสะพาน | กำเหลงนำกองกล้าร้อยนายบุกค่ายยามราตรีและมีภาพจำเรื่องระฆัง — เชื่อมเงื่อนไขสีดำกับการลอบโจมตีและทำลายทรัพยากร |
| **ลิบอง** | ข่มใจตนเอง | **ซ่อนคมสะสมศึก** | หากเฟสลงการ์ดไม่ได้ใช้จู่โจม ข้ามเฟสทิ้งการ์ด | การอดกลั้นไม่เผยคมเพื่อสะสมกำลังและรอจังหวะ — สื่อเงื่อนไขไม่โจมตีและผลเก็บการ์ดไว้ |
| **อุยกาย** | กลลวงทรมานตน | **โบยกายลวงศึก** | เสีย 1 พลังชีวิตของตนเพื่อจั่ว 2 ใบ ใช้ได้หลายครั้งในเฟสลงการ์ด | อุยกายยอมถูกโบยเพื่อทำกลแสร้งสวามิภักดิ์ — อ้างอิงเหตุการณ์สามก๊กโดยตรงและสื่อการทำร้ายตนเพื่อสร้างแผน |
| **จิวยี่** | สง่างามผงาด | **ปรีชาเจียงตง** | ในเฟสจั่ว จั่วเพิ่ม 1 ใบ | จิวยี่ผู้มีทั้งความสามารถและสง่างามแห่งเจียงตง — ให้เอกลักษณ์เฉพาะนายพลมากกว่าคำชมทั่วไป |
| **จิวยี่** | กลไส้ศึก | **ไพ่ลวงซ่อนคม** | ให้เป้าหมายทายดอก รับการ์ดที่ผู้ใช้เลือก และเสีย 1 พลังชีวิตหากทายผิด | มอบสิ่งล่อใจที่ซ่อนอันตรายและข้อมูลไม่ครบถ้วน — สื่อกลไกทายการ์ดและภัยที่ซ่อนอยู่ได้ตรงกว่าเดิม |
| **ไต้เกี้ยว** | โฉมงามแห่งแผ่นดิน | **โฉมงามตรึงศึก** | ใช้การ์ดข้าวหลามตัดแทนสุขจนลืมจ๊ก | เสน่ห์ที่ทำให้คู่ต่อสู้หยุดชะงักและหลงลืมศึก — เชื่อมความงามกับผลข้ามเฟสลงการ์ด |
| **ไต้เกี้ยว** | หลบลี้ภัย | **แพรพลิ้วเบี่ยงคม** | เมื่อเป็นเป้าหมายจู่โจม ทิ้ง 1 ใบเพื่อโอนเป้าหมายไปยังผู้เล่นอื่นที่ถูกต้อง | ชายแพรพลิ้วเบี่ยงแนวคมอาวุธ — สื่อการโยกย้ายเป้าหมายอย่างอ่อนช้อยและเห็นการกระทำชัด |
| **ลกซุน** | ถ่อมตน | **ถ่อมตนซ่อนคม** | ไม่สามารถตกเป็นเป้าหมายของฉกทรัพย์ตามน้ำและสุขจนลืมจ๊ก | ลกซุนซ่อนความสามารถภายใต้ท่าทีสุภาพถ่อมตน — เพิ่มภาพการป้องกันตนจากกลอุบายโดยไม่แสดงพิษสง |
| **ลกซุน** | ค่ายเรียงราย | **กลค่ายไม่สิ้น** | เมื่อเสียการ์ดใบสุดท้ายในมือ จั่ว 1 ใบ | แนวค่ายที่ต่อเนื่อง ค่ายหนึ่งสิ้นยังมีอีกค่ายรองรับ — สื่อว่าทรัพยากรในมือไม่ขาดช่วง |
| **ซุนซางเซียง** | ผูกสัมพันธ์ | **ผูกวาสนาสองแคว้น** | ทิ้ง 2 ใบ เลือกผู้เล่นที่บาดเจ็บ แล้วตนและเป้าหมายฟื้นคนละ 1 พลังชีวิต | การอภิเษกที่เชื่อมสัมพันธ์ระหว่างจ๊กและง่อ — อ้างอิงเรื่องสามก๊กและสื่อผลช่วยเหลือทั้งสองฝ่าย |
| **ซุนซางเซียง** | สตรีอาจหาญ | **ศาสตราไม่ขาดมือ** | เมื่อเสียอุปกรณ์ 1 ใบ จั่ว 2 ใบ | องค์หญิงนักรบผู้รายล้อมด้วยอาวุธและนางกำนัลถือศาสตรา — เชื่อมการสูญเสียอุปกรณ์กับการได้ทรัพยากรใหม่ |
| **ฮัวโต๋** | ถุงยาเขียว | **คัมภีร์ถุงเขียว** | หนึ่งครั้งต่อเทิร์น ทิ้งการ์ด 1 ใบเพื่อฟื้นผู้เล่นที่บาดเจ็บ 1 พลังชีวิต | คัมภีร์การแพทย์ถุงเขียวที่เชื่อมโยงกับฮัวโต๋ — ให้ความรู้สึกเป็นวิชาแพทย์มากกว่าชื่อสิ่งของธรรมดา |
| **ฮัวโต๋** | ปฐมพยาบาล | **เข็มทองต่อชีพ** | นอกเทิร์นตน ใช้การ์ดสีแดงแทนท้อคืนชีพเพื่อช่วยผู้ใกล้ตาย | วิชาแพทย์จีนและเข็มรักษาที่ดึงผู้ป่วยกลับจากความตาย — มีบรรยากาศจีนและสื่อการช่วยชีวิตฉุกเฉิน |
| **ลิโป้** | ไร้เทียมทาน | **หอกฟางเทียนข่มทัพ** | จู่โจมบังคับเป้าหมายใช้หลบคม 2 ใบ และท้าศึกเดี่ยวบังคับคู่ต่อสู้ใช้จู่โจม 2 ใบในแต่ละครั้ง | ลิโป้กับอาวุธฟางเทียนซึ่งกดดันศัตรูเหนือคนทั่วไป — มีเอกลักษณ์เฉพาะตัวและสื่อแรงกดดันที่ต้องตอบโต้เพิ่ม |
| **เตียวเสี้ยน** | ยุแยงตะแคงรั่ว | **กลหญิงงามแตกสัมพันธ์** | ทิ้ง 1 ใบ เลือกผู้เล่นชาย 2 คน แล้วบังคับให้คนหนึ่งท้าศึกเดี่ยวกับอีกคน | กลหญิงงามและแผนทำลายความสัมพันธ์ระหว่างลิโป้กับตั๋งโต๊ะ — อ้างอิงสามก๊กโดยตรงและบอกผลยุให้ชายสองคนต่อสู้กัน |
| **เตียวเสี้ยน** | จันทร์อำพราง | **จันทร์หลบโฉม** | เมื่อจบเทิร์น จั่ว 1 ใบ | สมญาหญิงงามจนดวงจันทร์ยังหลบซ่อน — เป็นสำนวนที่ไพเราะ มีเอกลักษณ์ และยังคงธีมเตียวเสี้ยน |

### 17.5 รูปแบบ localization ที่ต้องการ

```jsonc
{
  "card.sha.name": "จู่โจม",
  "card.sha.summary": "โจมตีผู้เล่นเป้าหมาย 1 คนในระยะ เป้าหมายต้องใช้ “หลบคม” มิฉะนั้นเสีย 1 พลังชีวิต",

  "card.shan.name": "หลบคม",
  "card.shan.summary": "ตอบโต้ “จู่โจม” เพื่อหลีกเลี่ยงความเสียหาย",

  "card.tao.name": "ท้อคืนชีพ",
  "card.tao.summary": "ฟื้น 1 พลังชีวิต หรือช่วยผู้เล่นที่อยู่ในสถานะใกล้ตาย",

  "general.caocao": "โจโฉ",
  "skill.caocao_s1.name": "พลิกภัยเป็นกล",
  "skill.caocao_s1.summary": "เมื่อได้รับความเสียหาย สามารถนำการ์ดที่ทำร้ายตนเข้ามือ"
}
```

รองรับช่วงเปลี่ยนผ่านได้ด้วย schema:

```ts
interface LocalizedGameText {
  name: string;
  summary: string;
  description?: string;
  flavorText?: string;
}
```

### 17.6 Acceptance Criteria สำหรับ Claude

- [ ] ชื่อใหม่ทั้งหมดถูกใส่ใน localization/data layer
- [ ] ชื่อเก่าที่เป็น UI text ถูกแทนที่ครบ
- [ ] Internal IDs ทั้งหมดเหมือนเดิม
- [ ] จำนวนการ์ด 104 ใบไม่เปลี่ยน
- [ ] จำนวน General 25 ตัวและ Skill 40 สกิลไม่เปลี่ยน
- [ ] Logic, trigger, target rule, range และ balance ไม่เปลี่ยน
- [ ] Unit tests ของ Engine ผ่านโดยไม่ต้องแก้ expectation เชิงกลไก
- [ ] UI แสดงชื่อใหม่ในมือ กองทิ้ง Dialog อุปกรณ์ Game log และ Result screen
- [ ] Server logs/debug logs ใช้ ID เป็นหลักและอาจ resolve ชื่อเพื่ออ่านง่ายเท่านั้น
- [ ] ค้นหา repository แล้วไม่มีชื่อเก่าหลงเหลือในข้อความที่ผู้เล่นมองเห็น
- [ ] Missing artwork ยังคงแสดงชื่อและคำอธิบายได้
- [ ] Claude ส่งรายการไฟล์ที่แก้, diff summary, test result และชื่อเก่าที่พบแต่นอก Catalog

### 17.7 ห้าม Claude เปลี่ยนสิ่งต่อไปนี้

- `cardId`
- `typeKey`
- `skillId`
- `generalId`
- Socket event names
- Trigger names
- Save/session data keys
- Asset stable IDs
- Deck composition
- Card counts, suits และ ranks
- Game mechanics เพื่อให้เข้ากับชื่อใหม่

---
