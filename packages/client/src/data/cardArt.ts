const CARD_ART_KEYS = new Set([
  "sha", "shan", "tao",
  "wuzhong", "guohe", "shunshou", "juedou", "jiedao", "nanman", "wanjian", "taoyuan", "wugu", "wuxie", "lebusishu", "shandian",
  "crossbow", "sword_yy", "sword_ice", "sword_qinggang", "qinglong", "zhangba", "guanshi", "fangtian", "qilin",
  "bagua", "renwang",
  "horse_chitu", "horse_dilu", "horse_zhaohuang", "horse_jueying", "horse_dawan", "horse_zixing",
]);

/** Returns the public canonical artwork URL when an approved asset exists. */
export function cardArtUrl(typeKey: string): string | undefined {
  return CARD_ART_KEYS.has(typeKey) ? `/assets/cards/${typeKey}.png` : undefined;
}
