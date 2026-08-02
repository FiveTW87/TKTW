export interface GeneralArt {
  portrait: string | undefined;
  fullBody: string | undefined;
  background: string;
}

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

export function generalArt(generalId: string, faction: string): GeneralArt {
  const assetName = GENERAL_ASSET_NAME[generalId];
  const factionName = FACTION_ASSET_NAME[faction] ?? "independent";
  return {
    portrait: assetName ? `/assets/generals/${assetName}_head.webp` : undefined,
    fullBody: assetName ? `/assets/generals/${assetName}.webp` : undefined,
    background: `/assets/factions/${factionName}_background.webp`,
  };
}
