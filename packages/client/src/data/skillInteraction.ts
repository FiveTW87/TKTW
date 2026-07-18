// How the client routes each general skill's `activateSkill` decision — the
// engine asks the owner "use this skill now?" for every non-locked trigger
// skill; this table decides whether we answer silently, prompt inline on the
// character card, or gate it on a teammate. Skills not listed here fall back
// to a plain dialog (using the Thai name), and active-button skills
// (rende/zhiheng/…) never reach activateSkill at all.
import type { GameView, PlayerView } from "@tktw/shared";

export type SkillInteraction =
  // Beneficial, no downstream choice — accept immediately + flash a toast.
  | "autoToast"
  // Accept immediately, silently — a follow-up decision (its own dialog)
  // carries the real choice (yiji→yijiGive, guandou→guandouOrder, …).
  | "autoSilent"
  // A genuine trade-off the player decides at that moment — render accept/
  // pass buttons inline in the character-card skill row.
  | "inline"
  // Lord asking same-faction teammates for help — only worth prompting when
  // an eligible teammate is alive; otherwise auto-pass.
  | "hujia";

export const SKILL_INTERACTION: Record<string, SkillInteraction> = {
  // ① AUTO + toast
  caocao_jianxiong: "autoToast",
  simayi_fankui: "autoToast",
  guojia_yidu: "autoToast",
  zhenji_luoshen: "autoToast",
  machao_tieqi: "autoToast",
  pangtong_juhui: "autoToast",
  zhouyu_yingzi: "autoToast",
  sunshangxiang_jiehun: "autoToast",
  luxun_lianying: "autoToast",
  diaochan_libu: "autoToast",

  // ③ Dialog — accept the wrapper silently; the inner decision is the dialog
  guojia_yiji: "autoSilent",
  xiahoudun_ganglie: "autoSilent",
  daiqiao_huibi: "autoSilent",
  zhugeliang_guandou: "autoSilent",

  // ② inline character-card trade-off
  caoren_tuoyi: "inline",
  zhangliao_tuxi: "inline",

  // ③ lord hujia — teammate-gated
  caocao_hujia: "hujia",
  liubei_hujia: "hujia",
};

export function skillInteraction(skillId: string): SkillInteraction | undefined {
  return SKILL_INTERACTION[skillId];
}

/** Is there another living player in the same faction as `me`? (gates hujia) */
export function sameFactionTeammateAlive(gameView: GameView, me: PlayerView): boolean {
  return gameView.players.some((p) => p.id !== me.id && p.alive && p.faction === me.faction);
}

// Per active skill (the ones with a "ใช้สกิล" button): how many times it can
// be used per turn, and how many cards / targets its use needs — so the UI
// only asks for a target when the skill actually takes one, and greys the
// button out once the limit is spent (mirrors the engine's own rules).
export interface ActiveSkillSpec {
  maxPerTurn: number;
  minCards: number;
  maxCards: number;
  minTargets: number;
  maxTargets: number;
}

const ACTIVE_SKILL_SPEC: Record<string, ActiveSkillSpec> = {
  liubei_rende: { maxPerTurn: Infinity, minCards: 1, maxCards: 1, minTargets: 1, maxTargets: 1 },
  sunquan_zhiheng: { maxPerTurn: 1, minCards: 1, maxCards: 99, minTargets: 0, maxTargets: 0 },
  zhouyu_fanjian: { maxPerTurn: 1, minCards: 1, maxCards: 1, minTargets: 1, maxTargets: 1 },
  huanggai_kurou: { maxPerTurn: Infinity, minCards: 0, maxCards: 0, minTargets: 0, maxTargets: 0 },
  sunshangxiang_jieyuan: { maxPerTurn: 1, minCards: 2, maxCards: 2, minTargets: 1, maxTargets: 1 },
  diaochan_lijian: { maxPerTurn: 1, minCards: 1, maxCards: 1, minTargets: 2, maxTargets: 2 },
  huatuo_qingnang: { maxPerTurn: 1, minCards: 1, maxCards: 1, minTargets: 1, maxTargets: 1 },
};

export function activeSkillSpec(skillId: string): ActiveSkillSpec {
  return ACTIVE_SKILL_SPEC[skillId] ?? { maxPerTurn: Infinity, minCards: 0, maxCards: 99, minTargets: 0, maxTargets: 1 };
}
