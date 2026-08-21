import type { GameLogView } from "@tktw/shared";
import { describe, expect, it } from "vitest";
import { mapGameLogsToPresentationEvents } from "../src/presentation/presentationEvents";

function log(id: string, eventType: string, overrides: Partial<GameLogView> = {}): GameLogView {
  return { id, turn: 1, eventType, visibility: "public", ...overrides };
}

describe("presentationEvents", () => {
  it("maps every supported semantic kind with match-scoped stable ids", () => {
    expect(mapGameLogsToPresentationEvents("match-1", [
      log("l0", "draw", { actorId: "p1", amount: 2 }),
      log("l1", "skillUse", { actorId: "p2", skillId: "skill-x" }),
      log("l2", "damage", { actorId: "p3", amount: 1, data: { sourceId: "p2" } }),
      log("l3", "hpLoss", { actorId: "p3", amount: 1 }),
      log("l4", "dodge", { actorId: "p4", data: { sourceId: "p2" } }),
      log("l5", "heal", { actorId: "p1", amount: 1, data: { sourceId: "p4" } }),
      log("l6", "death", { actorId: "p3" }),
    ])).toEqual([
      { id: "match-1:l0:draw", logId: "l0", kind: "draw", actorId: "p1", amount: 2 },
      { id: "match-1:l0:motion:draw", logId: "l0", kind: "cardMotion", motion: "draw", source: { kind: "pile", zone: "draw" }, destination: { kind: "player", playerId: "p1", zone: "hand" }, amount: 2, anonymous: true },
      { id: "match-1:l1:skill", logId: "l1", kind: "skill", actorId: "p2", skillId: "skill-x" },
      { id: "match-1:l2:damage", logId: "l2", kind: "damage", targetId: "p3", sourceId: "p2", amount: 1 },
      { id: "match-1:l3:hpLoss", logId: "l3", kind: "hpLoss", targetId: "p3", amount: 1 },
      { id: "match-1:l4:dodge", logId: "l4", kind: "dodge", targetId: "p4", sourceId: "p2" },
      { id: "match-1:l5:heal", logId: "l5", kind: "heal", targetId: "p1", sourceId: "p4", amount: 1 },
      { id: "match-1:l6:death", logId: "l6", kind: "death", targetId: "p3" },
    ]);
  });

  it("preserves received array order instead of sorting log ids", () => {
    const result = mapGameLogsToPresentationEvents("m", [
      log("log_9", "heal", { actorId: "p1" }),
      log("log_10", "death", { actorId: "p2" }),
      log("log_2", "draw", { actorId: "p3" }),
    ]);
    expect(result.map((event) => event.logId)).toEqual(["log_9", "log_10", "log_2", "log_2"]);
  });

  it("maps judgment and wuxie feedback as typed ordered events", () => {
    expect(mapGameLogsToPresentationEvents("match-feedback", [
      log("j0", "judgmentReveal", { actorId: "p1", cardId: "heart_8", cardType: "tao", data: { suit: "heart", rank: 8, reason: "bagua" } }),
      log("j1", "judgmentReplace", { actorId: "p2", targetIds: ["p1"], cardId: "spade_7", cardType: "sha", data: { previousCardId: "heart_8", previousCardType: "tao", previousSuit: "heart", previousRank: 8, suit: "spade", rank: 7 } }),
      log("j2", "judgment", { actorId: "p1", cardType: "bagua", data: { suit: "spade", rank: 7, outcome: "fail" } }),
      log("w0", "wuxie", { actorId: "p3", data: { targetType: "juedou", depth: 2 } }),
      log("w1", "wuxieResult", { actorId: "p0", cardType: "juedou", data: { targetType: "juedou", effective: false } }),
    ])).toEqual([
      { id: "match-feedback:j0:judgmentReveal", logId: "j0", kind: "judgmentReveal", playerId: "p1", cardId: "heart_8", cardType: "tao", suit: "heart", rank: 8, reason: "bagua" },
      { id: "match-feedback:j1:judgmentReplace", logId: "j1", kind: "judgmentReplace", actorId: "p2", playerId: "p1", cardId: "spade_7", cardType: "sha", previousCardId: "heart_8", previousCardType: "tao", previousSuit: "heart", previousRank: 8, suit: "spade", rank: 7 },
      { id: "match-feedback:j2:judgmentResult", logId: "j2", kind: "judgmentResult", playerId: "p1", cardType: "bagua", suit: "spade", rank: 7, outcome: "fail" },
      { id: "match-feedback:w0:wuxieCounter", logId: "w0", kind: "wuxieCounter", actorId: "p3", targetType: "juedou", depth: 2 },
      { id: "match-feedback:w1:wuxieResult", logId: "w1", kind: "wuxieResult", actorId: "p0", targetType: "juedou", effective: false },
    ]);
  });

  it("omits absent optional fields and ignores unsupported or malformed entries", () => {
    expect(mapGameLogsToPresentationEvents("m", [
      log("ok", "damage", { actorId: "target", data: { sourceId: "" } }),
      log("unknown", "unknownEvent", { actorId: "p1" }),
      log("missing-actor", "death"),
      log("bad-source", "dodge", { actorId: "target", data: { sourceId: 42 } }),
    ])).toEqual([
      { id: "m:ok:damage", logId: "ok", kind: "damage", targetId: "target" },
      { id: "m:bad-source:dodge", logId: "bad-source", kind: "dodge", targetId: "target" },
    ]);
  });

  it("maps the complete public card-motion vocabulary without exposing stolen hand identity", () => {
    const result = mapGameLogsToPresentationEvents("match-motion", [
      log("draw", "draw", { actorId: "p1", amount: 2 }),
      log("play", "cardPlay", { actorId: "p1", cardId: "c1", cardType: "sha" }),
      log("discard", "discard", { actorId: "p1", amount: 2 }),
      log("steal", "shunshouSteal", { actorId: "p1", targetIds: ["p2"], cardId: "secret", cardType: "tao" }),
      log("equip", "equip", { actorId: "p1", cardId: "weapon-new", cardType: "qinglong", data: { slot: "weapon", replacedCardId: "weapon-old", replacedCardType: "crossbow" } }),
      log("delayed", "placeDelayed", { actorId: "p1", targetIds: ["p2"], cardId: "delay-1", cardType: "lebusishu" }),
      log("guohe", "guoheDiscard", { actorId: "p1", targetIds: ["p2"], cardId: "lost-1", cardType: "bagua", data: { sourceZone: "equipment" } }),
      log("jiedao", "jiedaoTakeWeapon", { actorId: "p1", targetIds: ["p2"], cardType: "qilin" }),
      log("horse", "qilinDestroyHorse", { actorId: "p2", cardType: "horse_dilu", data: { slot: "horseMinus" } }),
      log("reveal", "wuguReveal", { actorId: "p1", amount: 3, cardType: "wugu" }),
      log("pick", "wuguPick", { actorId: "p2", cardId: "wugu-1", cardType: "tao" }),
      log("forward", "forwardShandian", { actorId: "p2", targetIds: ["p3"], cardType: "shandian" }),
    ]);

    expect(result.filter((event) => event.kind === "cardMotion")).toEqual([
      { id: "match-motion:draw:motion:draw", logId: "draw", kind: "cardMotion", motion: "draw", source: { kind: "pile", zone: "draw" }, destination: { kind: "player", playerId: "p1", zone: "hand" }, amount: 2, anonymous: true },
      { id: "match-motion:play:motion:play", logId: "play", kind: "cardMotion", motion: "play", source: { kind: "player", playerId: "p1", zone: "hand" }, destination: { kind: "pile", zone: "table" }, cardId: "c1", cardType: "sha" },
      { id: "match-motion:discard:motion:discard", logId: "discard", kind: "cardMotion", motion: "discard", source: { kind: "player", playerId: "p1", zone: "hand" }, destination: { kind: "pile", zone: "discard" }, amount: 2, anonymous: true },
      { id: "match-motion:steal:motion:steal", logId: "steal", kind: "cardMotion", motion: "steal", source: { kind: "player", playerId: "p2", zone: "hand" }, destination: { kind: "player", playerId: "p1", zone: "hand" }, amount: 1, anonymous: true },
      { id: "match-motion:equip:motion:equip", logId: "equip", kind: "cardMotion", motion: "equip", source: { kind: "player", playerId: "p1", zone: "hand" }, destination: { kind: "player", playerId: "p1", zone: "equipment" }, cardId: "weapon-new", cardType: "qinglong" },
      { id: "match-motion:equip:motion:equipmentLoss", logId: "equip", kind: "cardMotion", motion: "equipmentLoss", source: { kind: "player", playerId: "p1", zone: "equipment" }, destination: { kind: "pile", zone: "discard" }, cardId: "weapon-old", cardType: "crossbow" },
      { id: "match-motion:delayed:motion:delayed", logId: "delayed", kind: "cardMotion", motion: "delayed", source: { kind: "player", playerId: "p1", zone: "hand" }, destination: { kind: "player", playerId: "p2", zone: "judgment" }, cardId: "delay-1", cardType: "lebusishu" },
      { id: "match-motion:guohe:motion:equipmentLoss", logId: "guohe", kind: "cardMotion", motion: "equipmentLoss", source: { kind: "player", playerId: "p2", zone: "equipment" }, destination: { kind: "pile", zone: "discard" }, cardId: "lost-1", cardType: "bagua" },
      { id: "match-motion:jiedao:motion:stealEquipment", logId: "jiedao", kind: "cardMotion", motion: "steal", source: { kind: "player", playerId: "p2", zone: "equipment" }, destination: { kind: "player", playerId: "p1", zone: "equipment" }, cardType: "qilin" },
      { id: "match-motion:horse:motion:equipmentLoss", logId: "horse", kind: "cardMotion", motion: "equipmentLoss", source: { kind: "player", playerId: "p2", zone: "equipment" }, destination: { kind: "pile", zone: "discard" }, cardType: "horse_dilu" },
      { id: "match-motion:reveal:motion:wuguReveal", logId: "reveal", kind: "cardMotion", motion: "wuguReveal", source: { kind: "pile", zone: "draw" }, destination: { kind: "pile", zone: "wugu" }, amount: 3, anonymous: true },
      { id: "match-motion:pick:motion:wuguPick", logId: "pick", kind: "cardMotion", motion: "wuguPick", source: { kind: "pile", zone: "wugu" }, destination: { kind: "player", playerId: "p2", zone: "hand" }, cardId: "wugu-1", cardType: "tao" },
      { id: "match-motion:forward:motion:delayedForward", logId: "forward", kind: "cardMotion", motion: "delayed", source: { kind: "player", playerId: "p2", zone: "judgment" }, destination: { kind: "player", playerId: "p3", zone: "judgment" }, cardType: "shandian" },
    ]);
    const stolen = result.find((event) => event.id.includes(":steal:motion:"));
    expect(stolen).not.toHaveProperty("cardId");
    expect(stolen).not.toHaveProperty("cardType");
  });
});
