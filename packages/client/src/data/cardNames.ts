// Display-only Thai names + a single Chinese-glyph accent per card typeKey —
// purely presentational (mirrors the design's card face treatment), never
// consulted for legality; the server is the only source of truth for that.
export interface CardDisplay {
  name: string;
  glyph: string;
}

export const CARD_DISPLAY: Record<string, CardDisplay> = {
  sha: { name: "สังหาร", glyph: "殺" },
  shan: { name: "หลบ", glyph: "閃" },
  tao: { name: "ท้อ", glyph: "桃" },
  wuzhong: { name: "เนรมิต", glyph: "無" },
  guohe: { name: "ข้ามสะพานรื้อ", glyph: "拆" },
  shunshou: { name: "ฉวยลักแกะ", glyph: "牽" },
  juedou: { name: "ดวล", glyph: "決" },
  jiedao: { name: "ยืมดาบฆ่าคน", glyph: "借" },
  nanman: { name: "ศึกชนเผ่าใต้", glyph: "蠻" },
  wanjian: { name: "ห่าธนู", glyph: "箭" },
  taoyuan: { name: "สาบานสวนท้อ", glyph: "桃" },
  wugu: { name: "ธัญญาหารบริบูรณ์", glyph: "穀" },
  wuxie: { name: "ไร้ช่องโหว่", glyph: "無" },
  lebusishu: { name: "เพลินจนลืมแคว้นสู่", glyph: "樂" },
  shandian: { name: "สายฟ้า", glyph: "電" },
  crossbow: { name: "หน้าไม้กลจูกัดเหลียง", glyph: "弩" },
  sword_yy: { name: "กระบี่คู่หยินหยาง", glyph: "陰" },
  sword_ice: { name: "กระบี่น้ำแข็ง", glyph: "冰" },
  sword_qinggang: { name: "กระบี่ชิงกัง", glyph: "青" },
  qinglong: { name: "ง้าวมังกรเขียว", glyph: "龍" },
  zhangba: { name: "ทวนงูจั้งปา", glyph: "蛇" },
  guanshi: { name: "ขวานทะลุศิลา", glyph: "貫" },
  fangtian: { name: "ทวนฟ้า", glyph: "戟" },
  qilin: { name: "ธนูกิเลน", glyph: "麟" },
  bagua: { name: "ค่ายกลแปดทิศ", glyph: "卦" },
  renwang: { name: "โล่ราชันย์", glyph: "盾" },
  horse_chitu: { name: "ม้าเซ็กเทา", glyph: "馬" },
  horse_dilu: { name: "ม้าเตกเลา", glyph: "馬" },
  horse_zhaohuang: { name: "ม้าส่องราตรี", glyph: "馬" },
  horse_jueying: { name: "ม้าเจว๋อิ๋ง", glyph: "馬" },
  horse_dawan: { name: "ม้าต้าหวาน", glyph: "馬" },
  horse_zixing: { name: "ม้าจื่อซิง", glyph: "馬" },
};

export function cardDisplay(typeKey: string): CardDisplay {
  return CARD_DISPLAY[typeKey] ?? { name: typeKey, glyph: "?" };
}

// Short Thai effect blurbs, shown on hover so the player can learn what each
// card/weapon does without a rulebook. Purely informational.
const CARD_INFO: Record<string, string> = {
  sha: 'โจมตีเป้าในระยะ 1 ดาเมจ — เป้าลง "หลบ" กันได้ · ปกติ 1 ครั้ง/เทิร์น',
  shan: 'ใช้กันเมื่อโดน "สังหาร" (ใช้ตอนถูกโจมตีเท่านั้น)',
  tao: "ฟื้น 1 HP — ใช้กับตัวเอง หรือช่วยคนอื่นที่บาดเจ็บ/กำลังจะตาย",
  wuzhong: "จั่วการ์ด 2 ใบ (ใช้กับตัวเอง)",
  guohe: "ทิ้งการ์ด 1 ใบของเป้าหมาย (อุปกรณ์/ไพ่ตัดสิน/สุ่มจากมือ)",
  shunshou: "ขโมยการ์ด 1 ใบจากเป้าในระยะ 1",
  juedou: 'ประลอง — สลับกันลง "สังหาร" ใครลงไม่ได้ก่อนโดน 1 ดาเมจ',
  jiedao: 'บังคับเป้าที่มีอาวุธลง "สังหาร" ใส่คนอื่น ไม่งั้นเสียอาวุธให้คุณ',
  nanman: 'ทุกคนอื่นต้องลง "สังหาร" ไม่งั้นโดน 1 ดาเมจ',
  wanjian: 'ทุกคนอื่นต้องลง "หลบ" ไม่งั้นโดน 1 ดาเมจ',
  taoyuan: "ทุกคนฟื้น 1 HP",
  wugu: "เปิดการ์ดกลางโต๊ะ ให้ทุกคนไล่เลือกคนละใบ",
  wuxie: "ยกเลิกผลของกลอุบาย 1 ใบ (ใช้ตอบโต้)",
  lebusishu: "วางใส่เป้า — ต้นเทิร์นเป้าตัดสิน ถ้าไม่ใช่โพแดงจะข้ามเฟสลงการ์ด",
  shandian: "วางใส่ตัวเอง — ตัดสินทุกเทิร์น โพดำ 2-9 โดน 3 ดาเมจ ไม่งั้นส่งต่อคนถัดไป",
  crossbow: 'อาวุธ ระยะ 1 — ลง "สังหาร" ได้ไม่จำกัดจำนวนต่อเทิร์น',
  sword_yy: 'อาวุธ ระยะ 2 — "สังหาร" ใส่เพศตรงข้าม ให้เขาทิ้ง 1 ใบ หรือคุณจั่ว 1 ใบ',
  sword_ice: 'อาวุธ ระยะ 2 — "สังหาร" โดน เลือกให้เป้าทิ้ง 2 ใบแทนการรับดาเมจได้',
  sword_qinggang: 'อาวุธ ระยะ 2 — "สังหาร" ของคุณเมินเกราะเป้าหมาย',
  qinglong: 'อาวุธ ระยะ 3 — "สังหาร" ถูกหลบ ลงซ้ำใส่เป้าเดิมได้',
  zhangba: 'อาวุธ ระยะ 3 — ใช้การ์ด 2 ใบแทน "สังหาร" 1 ครั้ง',
  guanshi: 'อาวุธ ระยะ 3 — "สังหาร" ถูกหลบ ทิ้ง 2 ใบบังคับให้โดนได้',
  fangtian: 'อาวุธ ระยะ 4 — "สังหาร" ที่เป็นการ์ดใบสุดท้าย ตีได้ถึง 3 คน',
  qilin: 'อาวุธ ระยะ 5 — "สังหาร" โดน เลือกทำลายม้าของเป้าหมายได้',
  bagua: 'เกราะ — เมื่อต้องลง "หลบ" ตัดสินก่อน ได้โพแดง = หลบอัตโนมัติ',
  renwang: 'เกราะ — "สังหาร" ดอกดำไม่มีผลกับคุณ',
  horse_chitu: "ม้า −1 — คนอื่นมองคุณไกลขึ้น 1 (ป้องกัน)",
  horse_dilu: "ม้า −1 — คนอื่นมองคุณไกลขึ้น 1 (ป้องกัน)",
  horse_zhaohuang: "ม้า −1 — คนอื่นมองคุณไกลขึ้น 1 (ป้องกัน)",
  horse_jueying: "ม้า +1 — คุณเข้าถึงคนอื่นใกล้ขึ้น 1 (โจมตี)",
  horse_dawan: "ม้า +1 — คุณเข้าถึงคนอื่นใกล้ขึ้น 1 (โจมตี)",
  horse_zixing: "ม้า +1 — คุณเข้าถึงคนอื่นใกล้ขึ้น 1 (โจมตี)",
};

export function cardInfo(typeKey: string): string {
  return CARD_INFO[typeKey] ?? "";
}

const SUIT_GLYPH: Record<string, string> = {
  spade: "♠",
  heart: "♥",
  club: "♣",
  diamond: "♦",
};

export function suitGlyph(suit: string): string {
  return SUIT_GLYPH[suit] ?? suit;
}

const RANK_LABEL: Record<number, string> = { 1: "A", 11: "J", 12: "Q", 13: "K" };

export function rankLabel(rank: number): string {
  return RANK_LABEL[rank] ?? String(rank);
}
