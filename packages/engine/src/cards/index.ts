import type { CardDef } from "../core/cardEffects";
import { shaCard } from "./sha";
import { taoCard } from "./tao";
import { wuzhongCard } from "./wuzhong";
import { guoheCard } from "./guohe";
import { shunshouCard } from "./shunshou";
import { juedouCard } from "./juedou";
import { jiedaoCard } from "./jiedao";
import { nanmanCard } from "./nanman";
import { wanjianCard } from "./wanjian";
import { taoyuanCard } from "./taoyuan";
import { wuguCard } from "./wugu";
import { lebusishuCard } from "./lebusishu";
import { shandianCard } from "./shandian";

/**
 * typeKey -> CardDef. `shan` and `wuxie` deliberately have no `play`: shan
 * can never be played as a main action (SPEC 8.1: "ลงเองในเทิร์นตัวเองไม่ได้"),
 * and wuxie is only ever offered through the wuxie window (core/wuxieWindow.ts),
 * never dispatched through here. Equipment cards (weapons/armor/horses) also
 * have no `play` here — turnLoop.ts's generic equip branch handles attaching
 * them; weapon *rider* effects live in cards/sha.ts or equipment/*.ts.
 */
export const CARD_EFFECTS: Record<string, CardDef> = {
  sha: shaCard,
  tao: taoCard,
  wuzhong: wuzhongCard,
  guohe: guoheCard,
  shunshou: shunshouCard,
  juedou: juedouCard,
  jiedao: jiedaoCard,
  nanman: nanmanCard,
  wanjian: wanjianCard,
  taoyuan: taoyuanCard,
  wugu: wuguCard,
  lebusishu: lebusishuCard,
  shandian: shandianCard,
};
