import type { PlayerView } from "@tktw/shared";
import { cardDisplay } from "./cardNames";

export interface GameErrorCopy {
  title: string;
  message: string;
  hint?: string;
  glyph: string;
}

const RESPONSE_CARD_KEYS: Record<string, string> = {
  sha: "sha",
  shan: "shan",
  tao: "tao",
  wuxie: "wuxie",
  "สังหาร": "sha",
};

function displayCard(value: string): string {
  const token = value.trim().replace(/["']/g, "");
  const key = RESPONSE_CARD_KEYS[token] ?? token;
  return cardDisplay(key).name;
}

function displayPlayer(playerId: string, players: PlayerView[]): string {
  const player = players.find((candidate) => candidate.id === playerId);
  if (player) return player.name;
  return /^p\d+$/i.test(playerId) ? "ผู้เล่นเป้าหมาย" : playerId;
}

export function gameErrorCopy(rawError: string, players: PlayerView[] = []): GameErrorCopy {
  const error = rawError.trim();
  const lower = error.toLowerCase();

  if (lower.includes("room not found")) {
    return { title: "ไม่พบห้องนี้", message: "รหัสห้องอาจไม่ถูกต้อง หรือห้องถูกปิดไปแล้ว", hint: "ตรวจสอบรหัสห้องแล้วลองอีกครั้ง", glyph: "室" };
  }
  if (lower.includes("room is full")) {
    return { title: "ห้องเต็มแล้ว", message: "ห้องนี้มีผู้เล่นครบจำนวนสูงสุดแล้ว", hint: "ลองเข้าห้องอื่นหรือสร้างห้องใหม่", glyph: "滿" };
  }
  if (lower.includes("game already started")) {
    return { title: "เกมเริ่มไปแล้ว", message: "ไม่สามารถเข้าร่วมหรือเริ่มเกมนี้ซ้ำได้", hint: "รอรอบถัดไปหรือเข้าห้องใหม่", glyph: "戰" };
  }
  if (lower.includes("only the host can start")) {
    return { title: "เฉพาะเจ้าของห้องเท่านั้น", message: "ผู้เล่นที่สร้างห้องเป็นผู้เริ่มเกมได้", hint: "รอให้เจ้าของห้องกดเริ่มศึก", glyph: "主" };
  }
  const minimumPlayers = lower.match(/need at least (\d+) players to start/);
  if (minimumPlayers) {
    return { title: "ผู้เล่นยังไม่ครบ", message: `ต้องมีผู้เล่นอย่างน้อย ${minimumPlayers[1]} คนจึงจะเริ่มเกมได้`, hint: "เชิญผู้เล่นเพิ่มแล้วลองอีกครั้ง", glyph: "集" };
  }
  if (lower.includes("ชื่อนี้มีคนใช้แล้ว")) {
    return { title: "ชื่อนี้ถูกใช้แล้ว", message: "มีผู้เล่นในห้องใช้ชื่อนี้อยู่", hint: "เปลี่ยนชื่อเล็กน้อยแล้วลองเข้าห้องอีกครั้ง", glyph: "名" };
  }
  if (lower.includes("invalid session token") || lower.includes("not a member of this room")) {
    return { title: "สิทธิ์เข้าห้องหมดอายุ", message: "ระบบไม่พบที่นั่งของคุณในห้องนี้แล้ว", hint: "กลับหน้าหลักแล้วเข้าห้องอีกครั้ง", glyph: "退" };
  }
  if (lower.includes("game is not in progress") || lower.includes("match is not over") || lower.includes("not in lobby")) {
    return { title: "สถานะเกมเปลี่ยนไปแล้ว", message: "คำสั่งนี้ใช้ไม่ได้ในช่วงปัจจุบันของเกม", hint: "รอสักครู่แล้วทำตามปุ่มที่แสดงล่าสุด", glyph: "時" };
  }
  if (
    lower.includes("stale match") ||
    lower.includes("stale decision") ||
    lower.includes("no pending decision") ||
    lower.includes("not your decision")
  ) {
    return { title: "จังหวะนี้ผ่านไปแล้ว", message: "เกมดำเนินต่อไปก่อนที่คำสั่งนี้จะถูกส่ง", hint: "รอหน้าจออัปเดต แล้วเลือกคำสั่งจากสถานะล่าสุด", glyph: "刻" };
  }

  const outOfRange = error.match(/target\s+(\S+)\s+is out of range for\s+(.+)$/i);
  if (outOfRange) {
    const target = displayPlayer(outOfRange[1]!, players);
    const card = displayCard(outOfRange[2]!);
    return { title: "เป้าหมายอยู่นอกระยะ", message: `${target} อยู่ไกลเกินระยะของ “${card}”`, hint: "เลือกเป้าหมายที่ใกล้กว่า หรือใช้อาวุธและม้าเพื่อปรับระยะ", glyph: "距" };
  }
  if (lower.includes("usage limit reached")) {
    return { title: "ใช้จู่โจมครบแล้ว", message: "ตามปกติใช้ไพ่ “จู่โจม” ได้ 1 ครั้งต่อเทิร์น", hint: "จบเฟส หรือสวมหน้าไม้กลขงเบ้งเพื่อเพิ่มจำนวนครั้ง", glyph: "止" };
  }
  if (/needs?\s+\d+(?:-\d+)?\s+target|takes at most 1 target|needs a target/i.test(error)) {
    return { title: "จำนวนเป้าหมายไม่ถูกต้อง", message: "ไพ่ใบนี้ต้องเลือกเป้าหมายตามจำนวนที่กำหนด", hint: "ยกเลิกตัวเลือกเดิม แล้วเลือกเป้าหมายใหม่", glyph: "標" };
  }
  if (lower.includes("target must be alive") || lower.includes("needs exactly 1 living target")) {
    return { title: "เลือกเป้าหมายนี้ไม่ได้", message: "ไพ่ใบนี้ใช้ได้กับผู้เล่นที่ยังอยู่ในการต่อสู้เท่านั้น", hint: "เลือกผู้เล่นที่ยังมีชีวิตอยู่", glyph: "生" };
  }
  if (/cannot\s+\S+\s+a full-hp target/i.test(error)) {
    return { title: "พลังชีวิตเต็มอยู่แล้ว", message: "ไม่สามารถใช้ไพ่ฟื้นฟูกับเป้าหมายที่พลังชีวิตเต็ม", hint: "เลือกผู้เล่นที่บาดเจ็บ หรือเก็บไพ่ไว้ใช้ภายหลัง", glyph: "滿" };
  }
  if (lower.includes("target must have a weapon equipped")) {
    return { title: "เป้าหมายไม่มีอาวุธ", message: "ไพ่ใบนี้ใช้ได้กับผู้เล่นที่ติดตั้งอาวุธอยู่เท่านั้น", hint: "เลือกเป้าหมายที่มีอาวุธ", glyph: "兵" };
  }
  if (lower.includes("cannot be targeted by")) {
    return { title: "เป้าหมายป้องกันผลนี้", message: "สกิลหรือสถานะของผู้เล่นทำให้ไพ่ใบนี้ใช้กับเขาไม่ได้", hint: "เลือกเป้าหมายอื่นหรือใช้ไพ่ชนิดอื่น", glyph: "免" };
  }
  if (lower.includes("already has a") && lower.includes("judgment zone")) {
    return { title: "มีกลศึกนี้อยู่แล้ว", message: "เป้าหมายมีไพ่ชนิดเดียวกันอยู่ในเขตตัดสิน", hint: "เลือกเป้าหมายอื่น", glyph: "疊" };
  }

  if (lower.includes("already used") && lower.includes("this turn")) {
    return { title: "ใช้สกิลครบแล้ว", message: "สกิลนี้ใช้ครบจำนวนครั้งของเทิร์นนี้แล้ว", hint: "รอเทิร์นถัดไปจึงจะใช้ได้อีกครั้ง", glyph: "技" };
  }
  if (lower.includes("no active skill")) {
    return { title: "ใช้สกิลนี้ไม่ได้", message: "สกิลที่เลือกไม่ใช่สกิลกดใช้ในจังหวะนี้", hint: "เลือกคำสั่งหรือสกิลอื่น", glyph: "技" };
  }

  const discardCount = error.match(/must discard\s+(\d+)\s+card/i);
  if (discardCount) {
    return { title: "เลือกไพ่ทิ้งไม่ครบ", message: `ต้องเลือกไพ่ทิ้งให้ครบ ${discardCount[1]} ใบ`, hint: "ตรวจจำนวนไพ่ที่เลือกแล้วกดยืนยันอีกครั้ง", glyph: "棄" };
  }
  if (lower.includes("duplicate card id")) {
    return { title: "เลือกไพ่ซ้ำ", message: "มีไพ่ใบเดิมอยู่ในรายการมากกว่าหนึ่งครั้ง", hint: "ยกเลิกการเลือกแล้วเลือกไพ่ใหม่", glyph: "重" };
  }
  if (lower.includes("not selectable for discard") || lower.includes("is not in hand") || lower.includes("not in") && lower.includes("hand")) {
    return { title: "ไพ่ที่เลือกใช้ไม่ได้แล้ว", message: "ไพ่ใบนั้นอาจถูกใช้หรือย้ายออกจากมือไปแล้ว", hint: "รอมือไพ่อัปเดต แล้วเลือกใหม่อีกครั้ง", glyph: "牌" };
  }
  if (lower.includes("ใช้เป็นแอ็กชันไม่ได้") || lower.includes("does not count as")) {
    return { title: "ใช้ไพ่ผิดจังหวะ", message: "ไพ่ใบนี้ใช้ตอบโต้หรือใช้แทนไพ่ที่ระบบกำหนดไม่ได้", hint: "เลือกไพ่ที่มีชนิดตรงกับคำสั่งบนหน้าจอ", glyph: "應" };
  }
  if (lower.includes("cannot play") && lower.includes(" as ")) {
    return { title: "แปลงไพ่ใบนี้ไม่ได้", message: "สกิลปัจจุบันไม่สามารถเปลี่ยนไพ่ที่เลือกเป็นชนิดนั้น", hint: "เลือกไพ่ที่ตรงตามสีหรือเงื่อนไขของสกิล", glyph: "變" };
  }

  return {
    title: "ทำรายการไม่สำเร็จ",
    message: "ระบบไม่สามารถใช้คำสั่งนี้กับสถานะเกมปัจจุบันได้",
    hint: "รอหน้าจออัปเดต แล้วลองเลือกการ์ดหรือเป้าหมายใหม่อีกครั้ง",
    glyph: "!",
  };
}
