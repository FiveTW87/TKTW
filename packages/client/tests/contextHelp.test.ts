import type { LegalActionView } from "@tktw/shared";
import { describe, expect, it } from "vitest";
import {
  buildContextHelp,
  cardUnavailableReasonCopy,
  skillUnavailableReasonCopy,
  type ContextHelpInput,
} from "../src/data/contextHelp";

const cardReasons = [
  "response_only",
  "sha_usage_limit",
  "conversion_wrong_context",
  "insufficient_cards",
  "no_legal_target",
] as const;

const skillReasons = ["usage_limit", "insufficient_cards", "no_legal_target"] as const;

describe("context help copy", () => {
  it("maps every projected card and active-skill reason to neutral Thai copy", () => {
    expect(cardReasons.map((reason) => cardUnavailableReasonCopy(reason))).toEqual([
      "ใช้ได้เฉพาะตอนที่เกมขอให้ตอบสนอง",
      "ใช้สังหารครบจำนวนที่อนุญาตในเทิร์นนี้แล้ว",
      "การแปลงใบนี้ใช้ไม่ได้ในจังหวะปัจจุบัน",
      "มีการ์ดไม่ครบตามจำนวนที่ต้องใช้",
      "ตอนนี้ไม่มีเป้าหมายที่ถูกกติกา",
    ]);
    expect(skillReasons.map((reason) => skillUnavailableReasonCopy(reason))).toEqual([
      "ใช้สกิลครบจำนวนครั้งในเทิร์นนี้แล้ว",
      "มีการ์ดไม่ครบตามจำนวนที่สกิลต้องใช้",
      "ตอนนี้ไม่มีเป้าหมายที่ถูกกติกาสำหรับสกิลนี้",
    ]);
  });
});

describe("buildContextHelp", () => {
  const legalActions: LegalActionView[] = [
    {
      kind: "playCard",
      options: [
        {
          source: "literal",
          typeKey: "sha",
          selectableCardIds: ["private-card-id"],
          minCards: 1,
          maxCards: 1,
          exactCards: 1,
          targeting: { kind: "independent", minTargets: 1, maxTargets: 1, eligibleTargetIds: [] },
          available: false,
          unavailableReason: "no_legal_target",
        },
      ],
    },
    {
      kind: "useSkill",
      options: [
        {
          skillId: "zhouyu_fanjian",
          selectableCardIds: ["private-card-id"],
          minCards: 1,
          maxCards: 1,
          exactCards: 1,
          usesThisTurn: 1,
          maxUsesPerTurn: 1,
          targeting: { kind: "independent", minTargets: 1, maxTargets: 1, eligibleTargetIds: [] },
          available: false,
          unavailableReason: "usage_limit",
        },
      ],
    },
    { kind: "endPhase" },
  ];

  it("keeps Basic orienting, Detailed explanatory, and Off absent", () => {
    expect(buildContextHelp({ level: "off", route: { kind: "mainAction" }, legalActions })).toBeNull();

    expect(buildContextHelp({ level: "basic", route: { kind: "mainAction" }, legalActions })).toEqual({
      kind: "context",
      title: "เฟสลงการ์ดของคุณ",
      summary: "เลือกการ์ดหรือสกิลที่ใช้ได้ หรือจบเฟสเมื่อพร้อม",
      unavailable: [],
    });

    const detailed = buildContextHelp({ level: "detailed", route: { kind: "mainAction" }, legalActions });
    expect(detailed).toEqual({
      kind: "context",
      title: "เฟสลงการ์ดของคุณ",
      summary: "เลือกการ์ดหรือสกิลที่ใช้ได้ หรือจบเฟสเมื่อพร้อม",
      unavailable: [
        { key: "card:sha:no_legal_target", label: "จู่โจม", reason: "ตอนนี้ไม่มีเป้าหมายที่ถูกกติกา" },
        { key: "skill:zhouyu_fanjian:usage_limit", label: "ไพ่ลวงซ่อนคม", reason: "ใช้สกิลครบจำนวนครั้งในเทิร์นนี้แล้ว" },
      ],
    });
    expect(JSON.stringify(detailed)).not.toContain("private-card-id");
  });

  it("explains mandatory discard and pile actions without needing game state", () => {
    expect(buildContextHelp({ level: "basic", route: { kind: "discard", mustDiscard: 2 }, legalActions: [] })).toMatchObject({
      title: "ต้องทิ้งการ์ด 2 ใบ",
    });
    expect(buildContextHelp({ level: "basic", route: { kind: "pile", action: "draw", title: "จั่ว 2 ใบ" }, legalActions: [] })).toMatchObject({
      title: "จั่ว 2 ใบ",
      summary: "แตะกองจั่วเพื่อดำเนินการต่อ",
    });
    expect(buildContextHelp({ level: "basic", route: { kind: "waiting", label: "ผู้เล่นอื่นกำลังเลือก" }, legalActions: [] })).toBeNull();
  });

  it("has a deliberately narrow input that rejects private player state", () => {
    const safe: ContextHelpInput = { level: "basic", route: { kind: "mainAction" }, legalActions: [] };
    expect(buildContextHelp(safe)?.title).toBe("เฟสลงการ์ดของคุณ");

    buildContextHelp({
      level: "basic",
      route: { kind: "mainAction" },
      legalActions: [],
      // @ts-expect-error Context help must never accept players/roles/hands.
      players: [{ role: "rebel", hand: ["secret"] }],
    });
  });
});
