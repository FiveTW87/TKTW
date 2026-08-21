import type { Faction } from "@tktw/shared";
import type { GeneralId } from "./generalNames";

export interface GeneralArt {
  portrait: string | undefined;
  fullBody: string | undefined;
  background: string;
}

export type GeneralPose = "idle" | "attack" | "hit" | "skill";
type ActionPose = Exclude<GeneralPose, "idle">;

export interface GeneralPosePresentation {
  art: string | undefined;
  fallbackArt: string | undefined;
  scale: number;
  offsetX: number;
  offsetY: number;
}

type PoseLayout = Pick<GeneralPosePresentation, "scale" | "offsetX" | "offsetY">;
type GeneralWebpPath = `/assets/generals/${string}.webp`;
type GeneralPosePath = `/assets/generals/${string}-${`v${number}`}.png`;
type FactionBackgroundPath = `/assets/factions/${string}_background.webp`;

export interface GeneralArtManifestEntry {
  portrait: GeneralWebpPath;
  fullBody: GeneralWebpPath;
  poses: Record<ActionPose, { src: GeneralPosePath; layout?: Partial<PoseLayout> }>;
}

// Canonical, reviewable artwork selection. Every playable general declares
// all five browser assets explicitly so version changes and renames cannot be
// hidden behind filename conventions. Action images always fall back to the
// entry's full-body image (then portrait) if loading fails at presentation.
export const GENERAL_ART_MANIFEST = {
  caocao: { portrait: "/assets/generals/cao_cao_head.webp", fullBody: "/assets/generals/cao_cao.webp", poses: {
    attack: { src: "/assets/generals/cao_cao_attack-v1.png" }, hit: { src: "/assets/generals/cao_cao_hit-v1.png" }, skill: { src: "/assets/generals/cao_cao_skill-v1.png" },
  } },
  simayi: { portrait: "/assets/generals/sima_yi_head.webp", fullBody: "/assets/generals/sima_yi.webp", poses: {
    attack: { src: "/assets/generals/sima_yi_attack-v1.png" }, hit: { src: "/assets/generals/sima_yi_hit-v1.png" }, skill: { src: "/assets/generals/sima_yi_skill-v1.png" },
  } },
  xiahoudun: { portrait: "/assets/generals/xiahou_dun_head.webp", fullBody: "/assets/generals/xiahou_dun.webp", poses: {
    attack: { src: "/assets/generals/xiahou_dun_attack-v1.png" }, hit: { src: "/assets/generals/xiahou_dun_hit-v1.png" }, skill: { src: "/assets/generals/xiahou_dun_skill-v1.png" },
  } },
  caoren: { portrait: "/assets/generals/cao_ren_head.webp", fullBody: "/assets/generals/cao_ren.webp", poses: {
    attack: { src: "/assets/generals/cao_ren_attack-v1.png" }, hit: { src: "/assets/generals/cao_ren_hit-v1.png" }, skill: { src: "/assets/generals/cao_ren_skill-v1.png" },
  } },
  zhangliao: { portrait: "/assets/generals/zhang_liao_head.webp", fullBody: "/assets/generals/zhang_liao.webp", poses: {
    attack: { src: "/assets/generals/zhang_liao_attack-v1.png" }, hit: { src: "/assets/generals/zhang_liao_hit-v1.png" }, skill: { src: "/assets/generals/zhang_liao_skill-v1.png" },
  } },
  guojia: { portrait: "/assets/generals/guo_jia_head.webp", fullBody: "/assets/generals/guo_jia.webp", poses: {
    attack: { src: "/assets/generals/guo_jia_attack-v2.png" }, hit: { src: "/assets/generals/guo_jia_hit-v1.png" }, skill: { src: "/assets/generals/guo_jia_skill-v1.png" },
  } },
  zhenji: { portrait: "/assets/generals/zhen_ji_head.webp", fullBody: "/assets/generals/zhen_ji.webp", poses: {
    attack: { src: "/assets/generals/zhen_ji_attack-v1.png" }, hit: { src: "/assets/generals/zhen_ji_hit-v1.png" }, skill: { src: "/assets/generals/zhen_ji_skill-v1.png" },
  } },
  liubei: { portrait: "/assets/generals/liu_bei_head.webp", fullBody: "/assets/generals/liu_bei.webp", poses: {
    attack: { src: "/assets/generals/liu_bei_attack-v1.png" }, hit: { src: "/assets/generals/liu_bei_hit-v3.png" }, skill: { src: "/assets/generals/liu_bei_skill-v1.png" },
  } },
  guanyu: { portrait: "/assets/generals/guan_yu_head.webp", fullBody: "/assets/generals/guan_yu.webp", poses: {
    attack: { src: "/assets/generals/guan_yu_attack-v1.png" }, hit: { src: "/assets/generals/guan_yu_hit-v2.png" }, skill: { src: "/assets/generals/guan_yu_skill-v1.png" },
  } },
  zhangfei: { portrait: "/assets/generals/zhang_fei_head.webp", fullBody: "/assets/generals/zhang_fei.webp", poses: {
    attack: { src: "/assets/generals/zhang_fei_attack-v1.png" }, hit: { src: "/assets/generals/zhang_fei_hit-v1.png" }, skill: { src: "/assets/generals/zhang_fei_skill-v1.png" },
  } },
  zhaoyun: { portrait: "/assets/generals/zhao_yun_head.webp", fullBody: "/assets/generals/zhao_yun.webp", poses: {
    attack: { src: "/assets/generals/zhao_yun_attack-v1.png" }, hit: { src: "/assets/generals/zhao_yun_hit-v1.png" }, skill: { src: "/assets/generals/zhao_yun_skill-v1.png" },
  } },
  machao: { portrait: "/assets/generals/ma_chao_head.webp", fullBody: "/assets/generals/ma_chao.webp", poses: {
    attack: { src: "/assets/generals/ma_chao_attack-v1.png" }, hit: { src: "/assets/generals/ma_chao_hit-v1.png" }, skill: { src: "/assets/generals/ma_chao_skill-v1.png" },
  } },
  zhugeliang: { portrait: "/assets/generals/zhuge_liang_head.webp", fullBody: "/assets/generals/zhuge_liang.webp", poses: {
    attack: { src: "/assets/generals/zhuge_liang_attack-v1.png" }, hit: { src: "/assets/generals/zhuge_liang_hit-v1.png" }, skill: { src: "/assets/generals/zhuge_liang_skill-v1.png" },
  } },
  pangtong: { portrait: "/assets/generals/pang_tong_head.webp", fullBody: "/assets/generals/pang_tong.webp", poses: {
    attack: { src: "/assets/generals/pang_tong_attack-v1.png" }, hit: { src: "/assets/generals/pang_tong_hit-v1.png" }, skill: { src: "/assets/generals/pang_tong_skill-v1.png" },
  } },
  sunquan: { portrait: "/assets/generals/sun_quan_head.webp", fullBody: "/assets/generals/sun_quan.webp", poses: {
    attack: { src: "/assets/generals/sun_quan_attack-v1.png" }, hit: { src: "/assets/generals/sun_quan_hit-v1.png" }, skill: { src: "/assets/generals/sun_quan_skill-v1.png" },
  } },
  zhouyu: { portrait: "/assets/generals/zhou_yu_head.webp", fullBody: "/assets/generals/zhou_yu.webp", poses: {
    attack: { src: "/assets/generals/zhou_yu_attack-v1.png" }, hit: { src: "/assets/generals/zhou_yu_hit-v1.png" }, skill: { src: "/assets/generals/zhou_yu_skill-v1.png" },
  } },
  ganning: { portrait: "/assets/generals/gan_ning_head.webp", fullBody: "/assets/generals/gan_ning.webp", poses: {
    attack: { src: "/assets/generals/gan_ning_attack-v1.png" }, hit: { src: "/assets/generals/gan_ning_hit-v1.png" }, skill: { src: "/assets/generals/gan_ning_skill-v1.png" },
  } },
  lumeng: { portrait: "/assets/generals/lu_meng_head.webp", fullBody: "/assets/generals/lu_meng.webp", poses: {
    attack: { src: "/assets/generals/lu_meng_attack-v1.png" }, hit: { src: "/assets/generals/lu_meng_hit-v1.png" }, skill: { src: "/assets/generals/lu_meng_skill-v1.png" },
  } },
  huanggai: { portrait: "/assets/generals/huang_gai_head.webp", fullBody: "/assets/generals/huang_gai.webp", poses: {
    attack: { src: "/assets/generals/huang_gai_attack-v1.png" }, hit: { src: "/assets/generals/huang_gai_hit-v1.png" }, skill: { src: "/assets/generals/huang_gai_skill-v1.png" },
  } },
  daiqiao: { portrait: "/assets/generals/da_qiao_head.webp", fullBody: "/assets/generals/da_qiao.webp", poses: {
    attack: { src: "/assets/generals/da_qiao_attack-v1.png" }, hit: { src: "/assets/generals/da_qiao_hit-v1.png" }, skill: { src: "/assets/generals/da_qiao_skill-v1.png" },
  } },
  sunshangxiang: { portrait: "/assets/generals/sun_shangxiang_head.webp", fullBody: "/assets/generals/sun_shangxiang.webp", poses: {
    attack: { src: "/assets/generals/sun_shangxiang_attack-v1.png" }, hit: { src: "/assets/generals/sun_shangxiang_hit-v1.png" }, skill: { src: "/assets/generals/sun_shangxiang_skill-v1.png" },
  } },
  luxun: { portrait: "/assets/generals/lu_xun_head.webp", fullBody: "/assets/generals/lu_xun.webp", poses: {
    attack: { src: "/assets/generals/lu_xun_attack-v1.png" }, hit: { src: "/assets/generals/lu_xun_hit-v1.png" }, skill: { src: "/assets/generals/lu_xun_skill-v1.png" },
  } },
  lubu: { portrait: "/assets/generals/lu_bu_head.webp", fullBody: "/assets/generals/lu_bu.webp", poses: {
    attack: { src: "/assets/generals/lu_bu_attack-v1.png", layout: { scale: 0.92, offsetY: 4 } },
    hit: { src: "/assets/generals/lu_bu_hit-v1.png", layout: { scale: 0.92, offsetY: 4 } },
    skill: { src: "/assets/generals/lu_bu_skill-v1.png", layout: { scale: 0.92, offsetY: 4 } },
  } },
  huatuo: { portrait: "/assets/generals/hua_tuo_head.webp", fullBody: "/assets/generals/hua_tuo.webp", poses: {
    attack: { src: "/assets/generals/hua_tuo_attack-v1.png" }, hit: { src: "/assets/generals/hua_tuo_hit-v1.png" }, skill: { src: "/assets/generals/hua_tuo_skill-v1.png" },
  } },
  diaochan: { portrait: "/assets/generals/diao_chan_head.webp", fullBody: "/assets/generals/diao_chan.webp", poses: {
    attack: { src: "/assets/generals/diao_chan_attack-v1.png" }, hit: { src: "/assets/generals/diao_chan_hit-v1.png" }, skill: { src: "/assets/generals/diao_chan_skill-v1.png" },
  } },
} as const satisfies Record<GeneralId, GeneralArtManifestEntry>;

// Tracked art with no registered Engine general. Tests reconcile this list
// against disk so new extras can never be selected or ignored silently.
export const KNOWN_UNMAPPED_GENERAL_ART_PATHS = [
  "/assets/generals/dian_wei.webp",
  "/assets/generals/dian_wei_head.webp",
  "/assets/generals/xu_chu.webp",
  "/assets/generals/xu_chu_head.webp",
] as const satisfies readonly GeneralWebpPath[];

const FACTION_BACKGROUND = {
  wei: "/assets/factions/wei_background.webp",
  shu: "/assets/factions/shu_background.webp",
  wu: "/assets/factions/wu_background.webp",
  qun: "/assets/factions/independent_background.webp",
} as const satisfies Record<Faction, FactionBackgroundPath>;

const DEFAULT_POSE_LAYOUT: PoseLayout = { scale: 1, offsetX: 0, offsetY: 0 };

function manifestEntry(generalId: string): GeneralArtManifestEntry | undefined {
  return (GENERAL_ART_MANIFEST as Readonly<Partial<Record<string, GeneralArtManifestEntry>>>)[generalId];
}

function factionBackground(faction: string): FactionBackgroundPath {
  return (FACTION_BACKGROUND as Readonly<Partial<Record<string, FactionBackgroundPath>>>)[faction]
    ?? FACTION_BACKGROUND.qun;
}

export function generalArt(generalId: string, faction: string): GeneralArt {
  const entry = manifestEntry(generalId);
  return { portrait: entry?.portrait, fullBody: entry?.fullBody, background: factionBackground(faction) };
}

export function generalPoseArt(generalId: string, faction: string, pose: GeneralPose): string | undefined {
  const art = generalArt(generalId, faction);
  if (pose === "idle") return art.fullBody ?? art.portrait;
  return manifestEntry(generalId)?.poses[pose].src ?? art.fullBody ?? art.portrait;
}

export function generalPosePresentation(generalId: string, faction: string, pose: GeneralPose): GeneralPosePresentation {
  const entry = manifestEntry(generalId);
  const art = generalArt(generalId, faction);
  const layout = pose === "idle" ? undefined : entry?.poses[pose].layout;
  return {
    art: generalPoseArt(generalId, faction, pose),
    fallbackArt: art.fullBody ?? art.portrait,
    scale: layout?.scale ?? DEFAULT_POSE_LAYOUT.scale,
    offsetX: layout?.offsetX ?? DEFAULT_POSE_LAYOUT.offsetX,
    offsetY: layout?.offsetY ?? DEFAULT_POSE_LAYOUT.offsetY,
  };
}
