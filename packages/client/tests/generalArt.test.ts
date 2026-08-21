import { describe, expect, it } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { GENERALS } from "@tktw/engine";
import {
  GENERAL_ART_MANIFEST,
  KNOWN_UNMAPPED_GENERAL_ART_PATHS,
  generalArt,
  generalPoseArt,
  generalPosePresentation,
} from "../src/data/generalArt";

describe("generalArt", () => {
  it("has exactly one typed manifest entry for every playable engine general", () => {
    const engineIds = Object.keys(GENERALS).filter((id) => id !== "none").sort();
    expect(Object.keys(GENERAL_ART_MANIFEST).sort()).toEqual(engineIds);
  });

  it("accounts for every general asset on disk without silently selecting extras", () => {
    const selectedPaths: ReadonlySet<string> = new Set<string>(
      Object.values(GENERAL_ART_MANIFEST).flatMap((entry) => [
        entry.portrait,
        entry.fullBody,
        entry.poses.attack.src,
        entry.poses.hit.src,
        entry.poses.skill.src,
      ]),
    );
    expect(selectedPaths.size).toBe(125);

    for (const path of selectedPaths) {
      expect(existsSync(resolve("public", path.slice(1))), path).toBe(true);
    }

    const diskPaths = readdirSync(resolve("public", "assets", "generals"))
      .map((filename) => `/assets/generals/${filename}`)
      .sort();
    const unselectedPaths = diskPaths.filter((path) => !selectedPaths.has(path));
    expect(unselectedPaths).toEqual([...KNOWN_UNMAPPED_GENERAL_ART_PATHS].sort());
  });

  it("keeps approved version exceptions explicit in the manifest", () => {
    expect(GENERAL_ART_MANIFEST.guojia.poses.attack.src).toBe("/assets/generals/guo_jia_attack-v2.png");
    expect(GENERAL_ART_MANIFEST.liubei.poses.hit.src).toBe("/assets/generals/liu_bei_hit-v3.png");
    expect(GENERAL_ART_MANIFEST.guanyu.poses.hit.src).toBe("/assets/generals/guan_yu_hit-v2.png");
  });

  it("maps an engine general id to its web portrait, full-body art, and faction scene", () => {
    expect(generalArt("caocao", "wei")).toEqual({
      portrait: "/assets/generals/cao_cao_head.webp",
      fullBody: "/assets/generals/cao_cao.webp",
      background: "/assets/factions/wei_background.webp",
    });
  });

  it("keeps an unknown or hidden general safe while retaining the faction scene", () => {
    expect(generalArt("", "shu")).toEqual({
      portrait: undefined,
      fullBody: undefined,
      background: "/assets/factions/shu_background.webp",
    });
    expect(generalArt("none", "unknown")).toEqual({
      portrait: undefined,
      fullBody: undefined,
      background: "/assets/factions/independent_background.webp",
    });
  });

  it("resolves every faction background to a real browser asset", () => {
    for (const faction of ["wei", "shu", "wu", "qun"] as const) {
      const background = generalArt("", faction).background;
      expect(existsSync(resolve("public", background.slice(1))), background).toBe(true);
    }
  });

  it("selects Cao Cao action poses and falls back to full-body art for other generals", () => {
    expect(generalPoseArt("caocao", "wei", "attack")).toBe("/assets/generals/cao_cao_attack-v1.png");
    expect(generalPoseArt("caocao", "wei", "hit")).toBe("/assets/generals/cao_cao_hit-v1.png");
    expect(generalPoseArt("caocao", "wei", "skill")).toBe("/assets/generals/cao_cao_skill-v1.png");
    expect(generalPoseArt("simayi", "wei", "attack")).toBe("/assets/generals/sima_yi_attack-v1.png");
    expect(generalPoseArt("simayi", "wei", "hit")).toBe("/assets/generals/sima_yi_hit-v1.png");
    expect(generalPoseArt("simayi", "wei", "skill")).toBe("/assets/generals/sima_yi_skill-v1.png");
    expect(generalPoseArt("xiahoudun", "wei", "attack")).toBe("/assets/generals/xiahou_dun_attack-v1.png");
    expect(generalPoseArt("xiahoudun", "wei", "hit")).toBe("/assets/generals/xiahou_dun_hit-v1.png");
    expect(generalPoseArt("xiahoudun", "wei", "skill")).toBe("/assets/generals/xiahou_dun_skill-v1.png");
    expect(generalPoseArt("caoren", "wei", "attack")).toBe("/assets/generals/cao_ren_attack-v1.png");
    expect(generalPoseArt("caoren", "wei", "hit")).toBe("/assets/generals/cao_ren_hit-v1.png");
    expect(generalPoseArt("caoren", "wei", "skill")).toBe("/assets/generals/cao_ren_skill-v1.png");
    expect(generalPoseArt("zhangliao", "wei", "attack")).toBe("/assets/generals/zhang_liao_attack-v1.png");
    expect(generalPoseArt("zhangliao", "wei", "hit")).toBe("/assets/generals/zhang_liao_hit-v1.png");
    expect(generalPoseArt("zhangliao", "wei", "skill")).toBe("/assets/generals/zhang_liao_skill-v1.png");
    expect(generalPoseArt("guojia", "wei", "attack")).toBe("/assets/generals/guo_jia_attack-v2.png");
    expect(generalPoseArt("guojia", "wei", "hit")).toBe("/assets/generals/guo_jia_hit-v1.png");
    expect(generalPoseArt("guojia", "wei", "skill")).toBe("/assets/generals/guo_jia_skill-v1.png");
    expect(generalPoseArt("zhenji", "wei", "attack")).toBe("/assets/generals/zhen_ji_attack-v1.png");
    expect(generalPoseArt("zhenji", "wei", "hit")).toBe("/assets/generals/zhen_ji_hit-v1.png");
    expect(generalPoseArt("zhenji", "wei", "skill")).toBe("/assets/generals/zhen_ji_skill-v1.png");
    expect(generalPoseArt("liubei", "shu", "attack")).toBe("/assets/generals/liu_bei_attack-v1.png");
    expect(generalPoseArt("liubei", "shu", "hit")).toBe("/assets/generals/liu_bei_hit-v3.png");
    expect(generalPoseArt("liubei", "shu", "skill")).toBe("/assets/generals/liu_bei_skill-v1.png");
    expect(generalPoseArt("guanyu", "shu", "attack")).toBe("/assets/generals/guan_yu_attack-v1.png");
    expect(generalPoseArt("guanyu", "shu", "hit")).toBe("/assets/generals/guan_yu_hit-v2.png");
    expect(generalPoseArt("guanyu", "shu", "skill")).toBe("/assets/generals/guan_yu_skill-v1.png");
    expect(generalPoseArt("zhangfei", "shu", "attack")).toBe("/assets/generals/zhang_fei_attack-v1.png");
    expect(generalPoseArt("zhangfei", "shu", "hit")).toBe("/assets/generals/zhang_fei_hit-v1.png");
    expect(generalPoseArt("zhangfei", "shu", "skill")).toBe("/assets/generals/zhang_fei_skill-v1.png");
    expect(generalPoseArt("zhaoyun", "shu", "attack")).toBe("/assets/generals/zhao_yun_attack-v1.png");
    expect(generalPoseArt("zhaoyun", "shu", "hit")).toBe("/assets/generals/zhao_yun_hit-v1.png");
    expect(generalPoseArt("zhaoyun", "shu", "skill")).toBe("/assets/generals/zhao_yun_skill-v1.png");
    expect(generalPoseArt("machao", "shu", "attack")).toBe("/assets/generals/ma_chao_attack-v1.png");
    expect(generalPoseArt("machao", "shu", "hit")).toBe("/assets/generals/ma_chao_hit-v1.png");
    expect(generalPoseArt("machao", "shu", "skill")).toBe("/assets/generals/ma_chao_skill-v1.png");
    expect(generalPoseArt("zhugeliang", "shu", "attack")).toBe("/assets/generals/zhuge_liang_attack-v1.png");
    expect(generalPoseArt("zhugeliang", "shu", "hit")).toBe("/assets/generals/zhuge_liang_hit-v1.png");
    expect(generalPoseArt("zhugeliang", "shu", "skill")).toBe("/assets/generals/zhuge_liang_skill-v1.png");
    expect(generalPoseArt("pangtong", "shu", "attack")).toBe("/assets/generals/pang_tong_attack-v1.png");
    expect(generalPoseArt("pangtong", "shu", "hit")).toBe("/assets/generals/pang_tong_hit-v1.png");
    expect(generalPoseArt("pangtong", "shu", "skill")).toBe("/assets/generals/pang_tong_skill-v1.png");
    expect(generalPoseArt("sunquan", "wu", "attack")).toBe("/assets/generals/sun_quan_attack-v1.png");
    expect(generalPoseArt("sunquan", "wu", "hit")).toBe("/assets/generals/sun_quan_hit-v1.png");
    expect(generalPoseArt("sunquan", "wu", "skill")).toBe("/assets/generals/sun_quan_skill-v1.png");
    expect(generalPoseArt("zhouyu", "wu", "attack")).toBe("/assets/generals/zhou_yu_attack-v1.png");
    expect(generalPoseArt("zhouyu", "wu", "hit")).toBe("/assets/generals/zhou_yu_hit-v1.png");
    expect(generalPoseArt("zhouyu", "wu", "skill")).toBe("/assets/generals/zhou_yu_skill-v1.png");
    expect(generalPoseArt("ganning", "wu", "attack")).toBe("/assets/generals/gan_ning_attack-v1.png");
    expect(generalPoseArt("ganning", "wu", "hit")).toBe("/assets/generals/gan_ning_hit-v1.png");
    expect(generalPoseArt("ganning", "wu", "skill")).toBe("/assets/generals/gan_ning_skill-v1.png");
    expect(generalPoseArt("lumeng", "wu", "attack")).toBe("/assets/generals/lu_meng_attack-v1.png");
    expect(generalPoseArt("lumeng", "wu", "hit")).toBe("/assets/generals/lu_meng_hit-v1.png");
    expect(generalPoseArt("lumeng", "wu", "skill")).toBe("/assets/generals/lu_meng_skill-v1.png");
    expect(generalPoseArt("huanggai", "wu", "attack")).toBe("/assets/generals/huang_gai_attack-v1.png");
    expect(generalPoseArt("huanggai", "wu", "hit")).toBe("/assets/generals/huang_gai_hit-v1.png");
    expect(generalPoseArt("huanggai", "wu", "skill")).toBe("/assets/generals/huang_gai_skill-v1.png");
    expect(generalPoseArt("daiqiao", "wu", "attack")).toBe("/assets/generals/da_qiao_attack-v1.png");
    expect(generalPoseArt("daiqiao", "wu", "hit")).toBe("/assets/generals/da_qiao_hit-v1.png");
    expect(generalPoseArt("daiqiao", "wu", "skill")).toBe("/assets/generals/da_qiao_skill-v1.png");
    expect(generalPoseArt("sunshangxiang", "wu", "attack")).toBe("/assets/generals/sun_shangxiang_attack-v1.png");
    expect(generalPoseArt("sunshangxiang", "wu", "hit")).toBe("/assets/generals/sun_shangxiang_hit-v1.png");
    expect(generalPoseArt("sunshangxiang", "wu", "skill")).toBe("/assets/generals/sun_shangxiang_skill-v1.png");
    expect(generalPoseArt("luxun", "wu", "attack")).toBe("/assets/generals/lu_xun_attack-v1.png");
    expect(generalPoseArt("luxun", "wu", "hit")).toBe("/assets/generals/lu_xun_hit-v1.png");
    expect(generalPoseArt("luxun", "wu", "skill")).toBe("/assets/generals/lu_xun_skill-v1.png");
    expect(generalPoseArt("lubu", "qun", "attack")).toBe("/assets/generals/lu_bu_attack-v1.png");
    expect(generalPoseArt("lubu", "qun", "hit")).toBe("/assets/generals/lu_bu_hit-v1.png");
    expect(generalPoseArt("lubu", "qun", "skill")).toBe("/assets/generals/lu_bu_skill-v1.png");
    expect(generalPoseArt("huatuo", "qun", "attack")).toBe("/assets/generals/hua_tuo_attack-v1.png");
    expect(generalPoseArt("huatuo", "qun", "hit")).toBe("/assets/generals/hua_tuo_hit-v1.png");
    expect(generalPoseArt("huatuo", "qun", "skill")).toBe("/assets/generals/hua_tuo_skill-v1.png");
    expect(generalPoseArt("diaochan", "qun", "attack")).toBe("/assets/generals/diao_chan_attack-v1.png");
    expect(generalPoseArt("diaochan", "qun", "hit")).toBe("/assets/generals/diao_chan_hit-v1.png");
    expect(generalPoseArt("diaochan", "qun", "skill")).toBe("/assets/generals/diao_chan_skill-v1.png");
    expect(generalPoseArt("", "wei", "hit")).toBeUndefined();
  });

  it("normalizes oversized pose art while retaining idle art as a loading fallback", () => {
    for (const pose of ["attack", "hit", "skill"] as const) {
      expect(generalPosePresentation("lubu", "qun", pose)).toEqual({
        art: `/assets/generals/lu_bu_${pose}-v1.png`,
        fallbackArt: "/assets/generals/lu_bu.webp",
        scale: 0.92,
        offsetX: 0,
        offsetY: 4,
      });
    }
    expect(generalPosePresentation("lubu", "qun", "idle")).toMatchObject({
      art: "/assets/generals/lu_bu.webp",
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    });
    expect(generalPosePresentation("caocao", "wei", "attack")).toMatchObject({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it("has a versioned action asset on disk for every registered general", () => {
    const generals = [
      ["caocao", "wei"], ["simayi", "wei"], ["xiahoudun", "wei"], ["caoren", "wei"],
      ["zhangliao", "wei"], ["guojia", "wei"], ["zhenji", "wei"], ["liubei", "shu"],
      ["guanyu", "shu"], ["zhangfei", "shu"], ["zhaoyun", "shu"], ["machao", "shu"],
      ["zhugeliang", "shu"], ["pangtong", "shu"], ["sunquan", "wu"], ["zhouyu", "wu"],
      ["ganning", "wu"], ["lumeng", "wu"], ["huanggai", "wu"], ["daiqiao", "wu"],
      ["sunshangxiang", "wu"], ["luxun", "wu"], ["lubu", "qun"], ["huatuo", "qun"],
      ["diaochan", "qun"],
    ] as const;

    for (const [generalId, faction] of generals) {
      for (const pose of ["attack", "hit", "skill"] as const) {
        const asset = generalPoseArt(generalId, faction, pose);
        expect(asset, `${generalId}:${pose}`).toMatch(/_(attack|hit|skill)-v\d+\.png$/);
        expect(existsSync(resolve("public", asset!.slice(1))), asset).toBe(true);
      }
    }
  });
});
