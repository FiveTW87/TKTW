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
    expect(result.map((event) => event.logId)).toEqual(["log_9", "log_10", "log_2"]);
  });

  it("omits absent optional fields and ignores unsupported or malformed entries", () => {
    expect(mapGameLogsToPresentationEvents("m", [
      log("ok", "damage", { actorId: "target", data: { sourceId: "" } }),
      log("unknown", "equip", { actorId: "p1" }),
      log("missing-actor", "death"),
      log("bad-source", "dodge", { actorId: "target", data: { sourceId: 42 } }),
    ])).toEqual([
      { id: "m:ok:damage", logId: "ok", kind: "damage", targetId: "target" },
      { id: "m:bad-source:dodge", logId: "bad-source", kind: "dodge", targetId: "target" },
    ]);
  });
});
