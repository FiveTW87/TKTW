// Display-only Thai names + a single Chinese-glyph accent per card typeKey —
// purely presentational (mirrors the design's card face treatment), never
// consulted for legality; the server is the only source of truth for that.
// Names/summaries follow Naming Pass v1 (THAI_NAMING_CATALOG.md / ภาคผนวก E).
export interface CardDisplay {
  name: string;
  glyph: string;
}

export const CARD_DISPLAY: Record<string, CardDisplay> = {
  sha: { name: "จู่โจม", glyph: "殺" },
  shan: { name: "หลบคม", glyph: "閃" },
  tao: { name: "ท้อคืนชีพ", glyph: "桃" },
  wuzhong: { name: "เนรมิตทรัพย์จากสูญ", glyph: "無" },
  guohe: { name: "ข้ามน้ำรื้อสะพาน", glyph: "拆" },
  shunshou: { name: "ฉกทรัพย์ตามน้ำ", glyph: "牽" },
  juedou: { name: "ท้าศึกเดี่ยว", glyph: "決" },
  jiedao: { name: "ยืมดาบฆ่าคน", glyph: "借" },
  nanman: { name: "ชนเผ่าใต้บุกค่าย", glyph: "蠻" },
  wanjian: { name: "หมื่นศรถล่มค่าย", glyph: "箭" },
  taoyuan: { name: "สัตย์สาบานสวนท้อ", glyph: "桃" },
  wugu: { name: "ห้าธัญญาบริบูรณ์", glyph: "穀" },
  wuxie: { name: "ลบล้างกลศึก", glyph: "無" },
  lebusishu: { name: "สุขจนลืมจ๊ก", glyph: "樂" },
  shandian: { name: "อสนีบาตเวียนค่าย", glyph: "電" },
  crossbow: { name: "หน้าไม้กลขงเบ้ง", glyph: "弩" },
  sword_yy: { name: "กระบี่คู่หยินหยาง", glyph: "陰" },
  sword_ice: { name: "กระบี่เหมันต์", glyph: "冰" },
  sword_qinggang: { name: "กระบี่ชิงกัง", glyph: "青" },
  qinglong: { name: "ง้าวมังกรเขียว", glyph: "龍" },
  zhangba: { name: "ทวนอสรพิษจั้งปา", glyph: "蛇" },
  guanshi: { name: "ขวานผ่าศิลา", glyph: "貫" },
  fangtian: { name: "ทวนฟางเทียนผ่าฟ้า", glyph: "戟" },
  qilin: { name: "ธนูกิเลน", glyph: "麟" },
  bagua: { name: "ค่ายกลแปดทิศ", glyph: "卦" },
  renwang: { name: "โล่เทพพิทักษ์", glyph: "盾" },
  horse_chitu: { name: "เซ็กเธาว์", glyph: "馬" },
  horse_dilu: { name: "เต๊กเลา", glyph: "馬" },
  horse_zhaohuang: { name: "อุ้งทองเหินสายฟ้า", glyph: "馬" },
  horse_jueying: { name: "เงาไร้รอย", glyph: "馬" },
  horse_dawan: { name: "อาชาต้าหว่าน", glyph: "馬" },
  horse_zixing: { name: "อาชาม่วงเพลิง", glyph: "馬" },
};

export function cardDisplay(typeKey: string): CardDisplay {
  return CARD_DISPLAY[typeKey] ?? { name: typeKey, glyph: "?" };
}

// Short Thai effect blurbs, shown on hover so the player can learn what each
// card/weapon does without a rulebook. Purely informational.
const CARD_INFO: Record<string, string> = {
  sha: 'โจมตีผู้เล่นเป้าหมาย 1 คนในระยะ เป้าหมายต้องใช้ "หลบคม" มิฉะนั้นเสีย 1 พลังชีวิต',
  shan: 'ตอบโต้ "จู่โจม" เพื่อหลีกเลี่ยงความเสียหาย',
  tao: "ฟื้น 1 พลังชีวิต หรือช่วยผู้เล่นที่อยู่ในสถานะใกล้ตาย",
  wuzhong: "จั่วการ์ด 2 ใบ",
  guohe: "เลือกผู้เล่น 1 คน แล้วทิ้งการ์ดของเป้าหมาย 1 ใบ",
  shunshou: "เลือกผู้เล่นในระยะ 1 แล้วนำการ์ดของเป้าหมายมา 1 ใบ",
  juedou: 'ผู้ใช้และเป้าหมายผลัดกันใช้ "จู่โจม" ผู้ที่ใช้ไม่ได้ก่อนเสีย 1 พลังชีวิต',
  jiedao: 'บังคับผู้เล่นที่มีอาวุธให้ใช้ "จู่โจม" ใส่อีกคน มิฉะนั้นผู้ใช้ได้อาวุธนั้น',
  nanman: 'ผู้เล่นอื่นทุกคนต้องใช้ "จู่โจม" มิฉะนั้นเสีย 1 พลังชีวิต',
  wanjian: 'ผู้เล่นอื่นทุกคนต้องใช้ "หลบคม" มิฉะนั้นเสีย 1 พลังชีวิต',
  taoyuan: "ผู้เล่นทุกคนฟื้น 1 พลังชีวิต",
  wugu: "เปิดการ์ดตามจำนวนผู้เล่นที่ยังมีชีวิต แล้วผลัดกันเลือกคนละ 1 ใบ",
  wuxie: "ยกเลิกผลของการ์ดอุบาย 1 ใบ และสามารถตอบโต้กันเป็นทอด ๆ ได้",
  lebusishu: "เมื่อตัดสินไม่ใช่โพแดง ผู้เล่นเป้าหมายข้ามเฟสลงการ์ด",
  shandian: "ตัดสินได้โพดำ 2–9 แล้วเสีย 3 พลังชีวิต หากไม่เกิดผลให้ส่งต่อผู้เล่นถัดไป",
  crossbow: 'ระยะ 1 ใช้ "จู่โจม" ได้ไม่จำกัดจำนวนในเฟสลงการ์ด',
  sword_yy: 'ระยะ 2 เมื่อจู่โจมเป้าหมายต่างเพศ เป้าหมายเลือกทิ้ง 1 ใบหรือให้ผู้ใช้จั่ว 1 ใบ',
  sword_ice: "ระยะ 2 เลือกทิ้งการ์ดเป้าหมาย 2 ใบแทนการสร้างความเสียหาย",
  sword_qinggang: "ระยะ 2 การจู่โจมของผู้ใช้ไม่สนผลของเกราะเป้าหมาย",
  qinglong: "ระยะ 3 เมื่อจู่โจมถูกหลบคม สามารถจู่โจมเป้าหมายเดิมอีกครั้ง",
  zhangba: 'ระยะ 3 ใช้การ์ดในมือ 2 ใบแทน "จู่โจม" 1 ใบ',
  guanshi: "ระยะ 3 เมื่อจู่โจมถูกหลบคม ทิ้ง 2 ใบเพื่อบังคับให้การโจมตีสร้างผล",
  fangtian: "ระยะ 4 หากจู่โจมเป็นการ์ดใบสุดท้ายในมือ เลือกเป้าหมายได้สูงสุด 3 คน",
  qilin: "ระยะ 5 เมื่อจู่โจมสร้างความเสียหาย ทำลายม้าของเป้าหมายได้ 1 ใบ",
  bagua: "เมื่อต้องใช้หลบคม ให้ตัดสิน หากเป็นสีแดงถือว่าใช้หลบคมสำเร็จ",
  renwang: "การจู่โจมสีดำไม่มีผลต่อผู้สวมใส่",
  horse_chitu: "ลดระยะที่ผู้ใช้คำนวณไปยังผู้เล่นอื่น 1",
  horse_dilu: "ลดระยะที่ผู้ใช้คำนวณไปยังผู้เล่นอื่น 1",
  horse_zhaohuang: "ลดระยะที่ผู้ใช้คำนวณไปยังผู้เล่นอื่น 1",
  horse_jueying: "เพิ่มระยะที่ผู้เล่นอื่นคำนวณมายังผู้ใช้ 1",
  horse_dawan: "เพิ่มระยะที่ผู้เล่นอื่นคำนวณมายังผู้ใช้ 1",
  horse_zixing: "เพิ่มระยะที่ผู้เล่นอื่นคำนวณมายังผู้ใช้ 1",
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
