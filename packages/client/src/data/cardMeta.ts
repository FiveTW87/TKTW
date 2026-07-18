// Client-side mirror of each card's targetRule + equipment slot, taken from
// packages/engine/src/data/cards.json. Used only to shape the tap-to-play
// flow (does this card need a manually-picked target? is it equipment that
// would replace an occupied slot?) — the engine stays the source of truth
// for actual legality; a wrong guess here just means the engine re-prompts.
export type TargetRule =
  | "singleInRange" // สังหาร — one enemy in range
  | "single" // guohe/juedou/lebusishu/shandian — one target
  | "singleArmed" // jiedao — one armed target
  | "shunshouRange" // shunshou — one target within distance 1
  | "self" // wuzhong — self only
  | "selfOrDying" // tao — self (or a dying player, handled via respond flow)
  | "allOthers" // nanman/wanjian — every other player, auto
  | "allIncludingSelf" // taoyuan/wugu — everyone, auto
  | "equipment" // weapons/armor/horses — equips to self
  | "respondOnly"; // shan — never played as a main action

export type EquipSlot = "weapon" | "armor" | "horseMinus" | "horsePlus";

interface CardMeta {
  targetRule: TargetRule;
  slot?: EquipSlot;
  attackRange?: number;
}

export const CARD_META: Record<string, CardMeta> = {
  sha: { targetRule: "singleInRange" },
  shan: { targetRule: "respondOnly" },
  tao: { targetRule: "selfOrDying" },
  wuzhong: { targetRule: "self" },
  guohe: { targetRule: "single" },
  shunshou: { targetRule: "shunshouRange" },
  juedou: { targetRule: "single" },
  jiedao: { targetRule: "singleArmed" },
  nanman: { targetRule: "allOthers" },
  wanjian: { targetRule: "allOthers" },
  taoyuan: { targetRule: "allIncludingSelf" },
  wugu: { targetRule: "allIncludingSelf" },
  wuxie: { targetRule: "respondOnly" },
  lebusishu: { targetRule: "single" },
  shandian: { targetRule: "self" }, // สายฟ้า วางที่ตัวเองเสมอ (ไม่ต้องเลือกเป้า)
  crossbow: { targetRule: "equipment", slot: "weapon", attackRange: 1 },
  sword_yy: { targetRule: "equipment", slot: "weapon", attackRange: 2 },
  sword_ice: { targetRule: "equipment", slot: "weapon", attackRange: 2 },
  sword_qinggang: { targetRule: "equipment", slot: "weapon", attackRange: 2 },
  qinglong: { targetRule: "equipment", slot: "weapon", attackRange: 3 },
  zhangba: { targetRule: "equipment", slot: "weapon", attackRange: 3 },
  guanshi: { targetRule: "equipment", slot: "weapon", attackRange: 3 },
  fangtian: { targetRule: "equipment", slot: "weapon", attackRange: 4 },
  qilin: { targetRule: "equipment", slot: "weapon", attackRange: 5 },
  bagua: { targetRule: "equipment", slot: "armor" },
  renwang: { targetRule: "equipment", slot: "armor" },
  horse_chitu: { targetRule: "equipment", slot: "horseMinus" },
  horse_dilu: { targetRule: "equipment", slot: "horseMinus" },
  horse_zhaohuang: { targetRule: "equipment", slot: "horseMinus" },
  horse_jueying: { targetRule: "equipment", slot: "horsePlus" },
  horse_dawan: { targetRule: "equipment", slot: "horsePlus" },
  horse_zixing: { targetRule: "equipment", slot: "horsePlus" },
};

export function cardMeta(typeKey: string): CardMeta {
  return CARD_META[typeKey] ?? { targetRule: "single" };
}

const TARGET_REQUIRING: ReadonlySet<TargetRule> = new Set<TargetRule>([
  "singleInRange",
  "single",
  "singleArmed",
  "shunshouRange",
]);

/** True when playing this card as a main action requires the player to pick
 *  a target manually (vs self/all/equipment cards that resolve on their own). */
export function needsManualTarget(typeKey: string): boolean {
  return TARGET_REQUIRING.has(cardMeta(typeKey).targetRule);
}

/** False for cards that can never be *played* on your own turn — หลบ / ไร้ช่องโหว่
 *  are response-only (they're used when you're targeted, not proactively).
 *  The hand greys these out during the play phase so a tap can't bounce off
 *  the server and leave the turn stuck. */
export function playableAsMainAction(typeKey: string): boolean {
  return cardMeta(typeKey).targetRule !== "respondOnly";
}

/** How many targets a main-action play of this card needs, as {min,max}.
 *  This is what caps the on-board target picker so a player can never submit
 *  e.g. 2 targets for a single-target สังหาร (the reported game-freeze). */
export function targetCount(
  typeKey: string,
  opts?: { weaponIsFangtian?: boolean; isLastCard?: boolean },
): { min: number; max: number } {
  switch (cardMeta(typeKey).targetRule) {
    case "singleInRange": {
      // fangtian + สังหาร as the last card in hand may hit up to 3.
      const multi = !!opts?.weaponIsFangtian && !!opts?.isLastCard;
      return { min: 1, max: multi ? 3 : 1 };
    }
    case "single":
    case "shunshouRange":
      return { min: 1, max: 1 };
    case "selfOrDying":
      // tao played on someone (self or an injured other) — exactly one target.
      // Whether the picker even opens is decided in Table (it depends on who's
      // injured), but when it does, cap it at one.
      return { min: 1, max: 1 };
    case "singleArmed":
      // jiedao (ยืมดาบฆ่าคน): targetIds[0] = the armed victim, [1] = who they shoot.
      return { min: 2, max: 2 };
    default:
      return { min: 0, max: 0 };
  }
}
