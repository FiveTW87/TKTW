// ENG-009 — turn a structured GameLogEntry (eventType + ids) into a Thai line.
// The engine never stores Thai as identity; localization lives entirely here.
import type { GameView, LogEntry } from "@tktw/shared";
import { cardDisplay } from "./cardNames";
import { skillById } from "./generalSkills";
import { roleDisplay } from "./roles";

const SUIT_TH: Record<string, string> = { spade: "โพดำ", heart: "โพแดง", club: "ดอกจิก", diamond: "ข้าวหลามตัด" };

export function resolveLogEntry(entry: LogEntry, view: GameView): string {
  const name = (id: string | undefined): string =>
    id ? view.players.find((p) => p.id === id)?.name ?? id : "?";
  const card = (t: string | undefined): string => (t ? cardDisplay(t).name : "");
  const skill = (id: string | undefined): string => (id ? skillById(id)?.name ?? id : "");
  const d = entry.data ?? {};
  const actor = name(entry.actorId);
  const targets = (entry.targetIds ?? []).map(name).join(", ");
  const amt = entry.amount ?? 0;

  switch (entry.eventType) {
    case "damage":
      return `${actor} ได้รับดาเมจ ${amt}${d.sourceId ? ` จาก ${name(String(d.sourceId))}` : ""} (เหลือ ${d.hp} HP)`;
    case "hpLoss":
      return `${actor} เสีย HP ${amt} (เหลือ ${d.hp})`;
    case "heal":
      return `${actor} ฟื้น HP ${amt}`;
    case "tao":
      return `${actor} ลง "${card("tao")}" ช่วย ${targets}`;
    case "dodge":
      return `${actor} ลง "${card("shan")}"${d.sourceId ? ` กันสังหารจาก ${name(String(d.sourceId))}` : ""}`;
    case "death":
      return `${actor} เสียชีวิต (บทบาท: ${roleDisplay(String(d.role))?.name ?? d.role})${d.killerId ? ` — สังหารโดย ${name(String(d.killerId))}` : ""}`;
    case "draw":
      return `${actor} จั่ว ${amt} ใบ${entry.cardType ? ` ("${card(entry.cardType)}")` : ""}`;
    case "discard":
      return `${actor} ทิ้งการ์ด ${amt} ใบ${d.reason === "overLimit" ? " (เกินเพดาน HP)" : ""}`;
    case "equip":
      return `${actor} สวมอุปกรณ์ "${card(entry.cardType)}"`;
    case "placeDelayed":
      return `${actor} วาง "${card(entry.cardType)}" ในเขตตัดสินของ ${targets}`;
    case "judgment": {
      const face = `${SUIT_TH[String(d.suit)] ?? d.suit}${d.rank}`;
      const outcome =
        d.outcome === "hit" ? `โดน ${amt} ดาเมจ` :
        d.outcome === "miss" ? "ไม่โดน" :
        d.outcome === "survive" ? "รอด" :
        d.outcome === "skipPlay" ? "ข้ามเฟสลงการ์ด" :
        d.outcome === "autoDodge" ? 'นับเป็น "หลบ" อัตโนมัติ' :
        d.outcome === "fail" ? "ไม่ติด" : "";
      return `${actor} ตัดสิน "${card(entry.cardType)}" ${face} — ${outcome}`;
    }
    case "cardCancelled":
      return `"${card(entry.cardType)}" ของ ${actor} ถูกยกเลิก`;
    case "wuxie":
      return `${actor} ลง "${card("wuxie")}" ต่อ "${card(String(d.targetType))}"`;
    case "forwardShandian":
      return `ส่งต่อ "${card("shandian")}" ไปยัง ${targets}`;
    case "shandianCancelForward":
      return `"${card("shandian")}" ถูก "${card("wuxie")}" กัน — ส่งต่อคนถัดไป`;
    case "skipPlay":
      return `${actor} ข้ามเฟสลงการ์ด`;
    case "skipDiscard":
      return `${actor} ข้ามเฟสทิ้งการ์ด${entry.skillId ? ` (${skill(entry.skillId)})` : ""}`;
    case "reshuffle":
      return `กองจั่วหมด — สับกองทิ้งเป็นกองจั่วใหม่ ${amt} ใบ`;
    case "roleReveal":
      return `${actor} คือ ${roleDisplay(String(d.role))?.name ?? d.role}`;
    case "pickGeneral":
      return `${actor} เลือกนายพล`;
    case "killReward":
      return `${actor} สังหารกบฏสำเร็จ จั่ว ${amt} ใบ`;
    case "killPenalty":
      return `${actor} (เจ้าเมือง) สังหารขุนนางภักดี ทิ้งการ์ดในมือและอุปกรณ์`;
    case "fanjianGuess":
      return d.correct ? `${actor} ทายดอกถูก (กลไส้ศึก)` : `${actor} ทายดอกผิด — เสีย 1 HP (กลไส้ศึก)`;
    // weapon/skill flavor
    case "swordIceDiscard": return `${actor} ทิ้งการ์ด 2 ใบแทนโดนดาเมจ (กระบี่น้ำแข็ง)`;
    case "qilinDestroyHorse": return `${actor} ถูกทำลาย${d.slot === "horseMinus" ? "ม้า−1" : "ม้า+1"} (ธนูกิเลน)`;
    case "guanshiForce": return `${actor} ทิ้งการ์ด 2 ใบ บังคับให้ "สังหาร" โดน (ขวานทะลุศิลา)`;
    case "qinglongReplay": return `${actor} ใช้ง้าวมังกรเขียว ลง "สังหาร" ซ้ำใส่ ${targets}`;
    case "renwangNegate": return `"สังหาร" ดอกดำ${d.sourceId ? ` จาก ${name(String(d.sourceId))}` : ""} ไม่มีผลกับ ${actor} (โล่ราชันย์)`;
    case "swordYyDiscard": return `${actor} ทิ้งการ์ด 1 ใบ (กระบี่คู่หยินหยาง)`;
    case "swordYyDraw": return `${actor} จั่ว 1 ใบ (กระบี่คู่หยินหยาง)`;
    case "zhangbaSha": return `${actor} ใช้ทวนงูจั้งปา ทิ้ง 2 ใบแทน "สังหาร"`;
    case "juedouSha": return `${actor} ลง "สังหาร" ตอบโต้ในดวล`;
    case "jiedaoForce": return `${actor} ถูกบังคับให้ลง "สังหาร" ใส่ ${targets} (ยืมดาบฆ่าคน)`;
    case "jiedaoTakeWeapon": return `${actor} ได้อาวุธ "${card(entry.cardType)}" จาก ${targets} (ยืมดาบฆ่าคน)`;
    case "guoheDiscard": return `${actor} ทิ้งการ์ด "${card(entry.cardType)}" ของ ${targets} (ข้ามสะพานแล้วรื้อทิ้ง)`;
    case "shunshouSteal": return `${actor} ขโมยการ์ด "${card(entry.cardType)}" จาก ${targets} (ฉวยโอกาสลักแกะ)`;
    case "wuguReveal": return `${actor} ใช้ "ธัญญาหารบริบูรณ์" เปิด ${amt} ใบ`;
    case "wuguPick": return `${actor} เลือกการ์ดจากธัญญาหารบริบูรณ์`;
    case "skillUse":
      return `${actor} ใช้ "${skill(entry.skillId)}"${targets ? ` → ${targets}` : ""}`;
    default:
      return `${actor} ${entry.eventType}`.trim();
  }
}
