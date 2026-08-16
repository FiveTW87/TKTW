export interface GeneralArt {
  portrait: string | undefined;
  fullBody: string | undefined;
  background: string;
}

export type GeneralPose = "idle" | "attack" | "hit" | "skill";

export interface GeneralPosePresentation {
  art: string | undefined;
  fallbackArt: string | undefined;
  scale: number;
  offsetX: number;
  offsetY: number;
}

type PoseLayout = Pick<GeneralPosePresentation, "scale" | "offsetX" | "offsetY">;

const GENERAL_ASSET_NAME: Record<string, string> = {
  caocao: "cao_cao",
  simayi: "sima_yi",
  xiahoudun: "xiahou_dun",
  caoren: "cao_ren",
  zhangliao: "zhang_liao",
  guojia: "guo_jia",
  zhenji: "zhen_ji",
  liubei: "liu_bei",
  guanyu: "guan_yu",
  zhangfei: "zhang_fei",
  zhaoyun: "zhao_yun",
  machao: "ma_chao",
  zhugeliang: "zhuge_liang",
  pangtong: "pang_tong",
  sunquan: "sun_quan",
  zhouyu: "zhou_yu",
  ganning: "gan_ning",
  lumeng: "lu_meng",
  huanggai: "huang_gai",
  daiqiao: "da_qiao",
  sunshangxiang: "sun_shangxiang",
  luxun: "lu_xun",
  lubu: "lu_bu",
  diaochan: "diao_chan",
  huatuo: "hua_tuo",
};

const FACTION_ASSET_NAME: Record<string, string> = {
  wei: "wei",
  shu: "shu",
  wu: "wu",
  qun: "independent",
};

const GENERAL_POSE_ASSET: Partial<Record<string, Partial<Record<Exclude<GeneralPose, "idle">, string>>>> = {
  caocao: {
    attack: "/assets/generals/cao_cao_attack-v1.png",
    hit: "/assets/generals/cao_cao_hit-v1.png",
    skill: "/assets/generals/cao_cao_skill-v1.png",
  },
  simayi: {
    attack: "/assets/generals/sima_yi_attack-v1.png",
    hit: "/assets/generals/sima_yi_hit-v1.png",
    skill: "/assets/generals/sima_yi_skill-v1.png",
  },
  xiahoudun: {
    attack: "/assets/generals/xiahou_dun_attack-v1.png",
    hit: "/assets/generals/xiahou_dun_hit-v1.png",
    skill: "/assets/generals/xiahou_dun_skill-v1.png",
  },
  caoren: {
    attack: "/assets/generals/cao_ren_attack-v1.png",
    hit: "/assets/generals/cao_ren_hit-v1.png",
    skill: "/assets/generals/cao_ren_skill-v1.png",
  },
  zhangliao: {
    attack: "/assets/generals/zhang_liao_attack-v1.png",
    hit: "/assets/generals/zhang_liao_hit-v1.png",
    skill: "/assets/generals/zhang_liao_skill-v1.png",
  },
  guojia: {
    attack: "/assets/generals/guo_jia_attack-v2.png",
    hit: "/assets/generals/guo_jia_hit-v1.png",
    skill: "/assets/generals/guo_jia_skill-v1.png",
  },
  zhenji: {
    attack: "/assets/generals/zhen_ji_attack-v1.png",
    hit: "/assets/generals/zhen_ji_hit-v1.png",
    skill: "/assets/generals/zhen_ji_skill-v1.png",
  },
  liubei: {
    attack: "/assets/generals/liu_bei_attack-v1.png",
    hit: "/assets/generals/liu_bei_hit-v3.png",
    skill: "/assets/generals/liu_bei_skill-v1.png",
  },
  guanyu: {
    attack: "/assets/generals/guan_yu_attack-v1.png",
    hit: "/assets/generals/guan_yu_hit-v2.png",
    skill: "/assets/generals/guan_yu_skill-v1.png",
  },
  zhangfei: {
    attack: "/assets/generals/zhang_fei_attack-v1.png",
    hit: "/assets/generals/zhang_fei_hit-v1.png",
    skill: "/assets/generals/zhang_fei_skill-v1.png",
  },
  zhaoyun: {
    attack: "/assets/generals/zhao_yun_attack-v1.png",
    hit: "/assets/generals/zhao_yun_hit-v1.png",
    skill: "/assets/generals/zhao_yun_skill-v1.png",
  },
  machao: {
    attack: "/assets/generals/ma_chao_attack-v1.png",
    hit: "/assets/generals/ma_chao_hit-v1.png",
    skill: "/assets/generals/ma_chao_skill-v1.png",
  },
  zhugeliang: {
    attack: "/assets/generals/zhuge_liang_attack-v1.png",
    hit: "/assets/generals/zhuge_liang_hit-v1.png",
    skill: "/assets/generals/zhuge_liang_skill-v1.png",
  },
  pangtong: {
    attack: "/assets/generals/pang_tong_attack-v1.png",
    hit: "/assets/generals/pang_tong_hit-v1.png",
    skill: "/assets/generals/pang_tong_skill-v1.png",
  },
  sunquan: {
    attack: "/assets/generals/sun_quan_attack-v1.png",
    hit: "/assets/generals/sun_quan_hit-v1.png",
    skill: "/assets/generals/sun_quan_skill-v1.png",
  },
  zhouyu: {
    attack: "/assets/generals/zhou_yu_attack-v1.png",
    hit: "/assets/generals/zhou_yu_hit-v1.png",
    skill: "/assets/generals/zhou_yu_skill-v1.png",
  },
  ganning: {
    attack: "/assets/generals/gan_ning_attack-v1.png",
    hit: "/assets/generals/gan_ning_hit-v1.png",
    skill: "/assets/generals/gan_ning_skill-v1.png",
  },
  lumeng: {
    attack: "/assets/generals/lu_meng_attack-v1.png",
    hit: "/assets/generals/lu_meng_hit-v1.png",
    skill: "/assets/generals/lu_meng_skill-v1.png",
  },
  huanggai: {
    attack: "/assets/generals/huang_gai_attack-v1.png",
    hit: "/assets/generals/huang_gai_hit-v1.png",
    skill: "/assets/generals/huang_gai_skill-v1.png",
  },
  daiqiao: {
    attack: "/assets/generals/da_qiao_attack-v1.png",
    hit: "/assets/generals/da_qiao_hit-v1.png",
    skill: "/assets/generals/da_qiao_skill-v1.png",
  },
  sunshangxiang: {
    attack: "/assets/generals/sun_shangxiang_attack-v1.png",
    hit: "/assets/generals/sun_shangxiang_hit-v1.png",
    skill: "/assets/generals/sun_shangxiang_skill-v1.png",
  },
  luxun: {
    attack: "/assets/generals/lu_xun_attack-v1.png",
    hit: "/assets/generals/lu_xun_hit-v1.png",
    skill: "/assets/generals/lu_xun_skill-v1.png",
  },
  lubu: {
    attack: "/assets/generals/lu_bu_attack-v1.png",
    hit: "/assets/generals/lu_bu_hit-v1.png",
    skill: "/assets/generals/lu_bu_skill-v1.png",
  },
  huatuo: {
    attack: "/assets/generals/hua_tuo_attack-v1.png",
    hit: "/assets/generals/hua_tuo_hit-v1.png",
    skill: "/assets/generals/hua_tuo_skill-v1.png",
  },
  diaochan: {
    attack: "/assets/generals/diao_chan_attack-v1.png",
    hit: "/assets/generals/diao_chan_hit-v1.png",
    skill: "/assets/generals/diao_chan_skill-v1.png",
  },
};

const DEFAULT_POSE_LAYOUT: PoseLayout = { scale: 1, offsetX: 0, offsetY: 0 };

const GENERAL_POSE_LAYOUT: Partial<
  Record<string, Partial<Record<Exclude<GeneralPose, "idle">, Partial<PoseLayout>>>>
> = {
  // Lu Bu's long crown plumes and Fangtian halberd fill more of the source
  // canvas than other generals, so normalize his perceived table scale.
  lubu: {
    attack: { scale: 0.92, offsetY: 4 },
    hit: { scale: 0.92, offsetY: 4 },
    skill: { scale: 0.92, offsetY: 4 },
  },
};

export function generalArt(generalId: string, faction: string): GeneralArt {
  const assetName = GENERAL_ASSET_NAME[generalId];
  const factionName = FACTION_ASSET_NAME[faction] ?? "independent";
  return {
    portrait: assetName ? `/assets/generals/${assetName}_head.webp` : undefined,
    fullBody: assetName ? `/assets/generals/${assetName}.webp` : undefined,
    background: `/assets/factions/${factionName}_background.webp`,
  };
}

export function generalPoseArt(generalId: string, faction: string, pose: GeneralPose): string | undefined {
  const art = generalArt(generalId, faction);
  if (pose === "idle") return art.fullBody ?? art.portrait;
  return GENERAL_POSE_ASSET[generalId]?.[pose] ?? art.fullBody ?? art.portrait;
}

export function generalPosePresentation(
  generalId: string,
  faction: string,
  pose: GeneralPose,
): GeneralPosePresentation {
  const art = generalArt(generalId, faction);
  const layout = pose === "idle" ? undefined : GENERAL_POSE_LAYOUT[generalId]?.[pose];
  return {
    art: generalPoseArt(generalId, faction, pose),
    fallbackArt: art.fullBody ?? art.portrait,
    scale: layout?.scale ?? DEFAULT_POSE_LAYOUT.scale,
    offsetX: layout?.offsetX ?? DEFAULT_POSE_LAYOUT.offsetX,
    offsetY: layout?.offsetY ?? DEFAULT_POSE_LAYOUT.offsetY,
  };
}
