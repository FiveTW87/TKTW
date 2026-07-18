// Display-only Thai names + a Chinese-glyph accent + faction color per
// generalId. Skill names/descriptions aren't included yet — the client's
// first pass shows general identity only, per the "generic decisions
// before bespoke general UI" scoping decision; skills are still fully
// usable server-side, just not narrated with flavor text client-side yet.
export interface GeneralDisplay {
  name: string;
  glyph: string;
}

export const GENERAL_DISPLAY: Record<string, GeneralDisplay> = {
  none: { name: "ไม่มีนายพล", glyph: "?" },
  caocao: { name: "โจโฉ", glyph: "曹" },
  simayi: { name: "สุมาอี้", glyph: "司" },
  xiahoudun: { name: "แฮหัวตุ้น", glyph: "夏" },
  caoren: { name: "เคาทู", glyph: "仁" },
  zhangliao: { name: "เตียวเลี้ยว", glyph: "遼" },
  guojia: { name: "กุยแก", glyph: "郭" },
  zhangfei: { name: "เตียวหุย", glyph: "飛" },
  guanyu: { name: "กวนอู", glyph: "關" },
  zhugeliang: { name: "ขงเบ้ง", glyph: "諸" },
  zhaoyun: { name: "จูล่ง", glyph: "趙" },
  machao: { name: "ม้าเฉียว", glyph: "馬" },
  pangtong: { name: "หองหยิม", glyph: "龐" },
  liubei: { name: "เล่าปี่", glyph: "劉" },
  zhouyu: { name: "จิวยี่", glyph: "周" },
  ganning: { name: "กำเหลง", glyph: "甘" },
  lumeng: { name: "ลิบอง", glyph: "呂" },
  huanggai: { name: "อุยกาย", glyph: "黃" },
  daiqiao: { name: "ไต้เกี้ยว", glyph: "喬" },
  sunshangxiang: { name: "ซุนซางเซียง", glyph: "孫" },
  luxun: { name: "ลกซุน", glyph: "陸" },
  sunquan: { name: "ซุนกวน", glyph: "權" },
  zhenji: { name: "เอียนสี", glyph: "甄" },
  huatuo: { name: "ฮัวโต๋", glyph: "華" },
  lubu: { name: "ลิโป้", glyph: "呂" },
  diaochan: { name: "เตียวเสี้ยน", glyph: "貂" },
};

export function generalDisplay(generalId: string): GeneralDisplay {
  return GENERAL_DISPLAY[generalId] ?? { name: generalId, glyph: "?" };
}

// Faction per generalId — needed at general-select time, where the offered
// generals aren't assigned to a player (with a faction) yet.
const GENERAL_FACTION: Record<string, string> = {
  caocao: "wei", simayi: "wei", xiahoudun: "wei", caoren: "wei", zhangliao: "wei", guojia: "wei", zhenji: "wei",
  liubei: "shu", guanyu: "shu", zhangfei: "shu", zhaoyun: "shu", machao: "shu", zhugeliang: "shu", pangtong: "shu",
  sunquan: "wu", zhouyu: "wu", ganning: "wu", lumeng: "wu", huanggai: "wu", daiqiao: "wu", sunshangxiang: "wu", luxun: "wu",
  lubu: "qun", diaochan: "qun", huatuo: "qun",
};

export function generalFaction(generalId: string): string {
  return GENERAL_FACTION[generalId] ?? "qun";
}

const FACTION_COLOR: Record<string, string> = {
  wei: "#2f5d86", // วุย (โจโฉ) — น้ำเงิน
  shu: "#3c7d52", // จ๊ก (เล่าปี่) — เขียว
  wu: "#a8322a", // ง่อ — แดง
  qun: "#7a6a48", // กลุ่มอิสระ — น้ำตาลกลาง
};

export function factionColor(faction: string): string {
  return FACTION_COLOR[faction] ?? "#7a6a48";
}

const FACTION_LABEL: Record<string, string> = {
  wei: "วุย",
  shu: "จ๊ก",
  wu: "ง่อ",
  qun: "กลุ่มอิสระ",
};

export function factionLabel(faction: string): string {
  return FACTION_LABEL[faction] ?? faction;
}
