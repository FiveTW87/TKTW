import { describe, expect, it } from "vitest";
import type { PlayerView } from "@tktw/shared";
import { gameErrorCopy } from "../src/data/gameErrorCopy";
import { classifyRejoinFailure } from "../src/data/rejoinFailure";

const players = [
  { id: "p0", name: "โจโฉ" },
  { id: "p2", name: "ลิโป้" },
] as PlayerView[];

describe("gameErrorCopy", () => {
  it("turns an attack range error into Thai names without leaking engine ids", () => {
    const copy = gameErrorCopy("p0: target p2 is out of range for sha", players);
    expect(copy.title).toBe("เป้าหมายอยู่นอกระยะ");
    expect(copy.message).toContain("ลิโป้");
    expect(copy.message).toContain("จู่โจม");
    expect(copy.message).not.toMatch(/p0|p2|sha/);
  });

  it.each([
    ["room is full", "ห้องเต็มแล้ว"],
    ["only the host can start the game", "เฉพาะเจ้าของห้องเท่านั้น"],
    ["stale decision id: expected dec_3, got dec_2", "จังหวะนี้ผ่านไปแล้ว"],
    ["p0: สังหาร usage limit reached", "ใช้จู่โจมครบแล้ว"],
    ["p0: must discard 3 card(s), got 2", "เลือกไพ่ทิ้งไม่ครบ"],
    ["p0: tao target must have a weapon equipped", "เป้าหมายไม่มีอาวุธ"],
  ])("maps %s", (raw, title) => {
    expect(gameErrorCopy(raw, players).title).toBe(title);
  });

  it("uses a readable fallback instead of showing an unknown technical error", () => {
    const copy = gameErrorCopy("some_internal_module: impossible branch 42", players);
    expect(copy.title).toBe("ทำรายการไม่สำเร็จ");
    expect(copy.message).not.toContain("some_internal_module");
  });

  it.each([
    ["stored room not found after server restart", "room-lost", "ห้องเดิมไม่อยู่แล้ว"],
    ["invalid session token for this room", "access-expired", "สิทธิ์เข้าห้องหมดอายุ"],
    ["connection timeout", "transport", "การเชื่อมต่อใช้เวลานานเกินไป"],
  ] as const)("classifies rejoin failure %s", (raw, kind, title) => {
    expect(classifyRejoinFailure(raw)).toBe(kind);
    expect(gameErrorCopy(raw).title).toBe(title);
  });
});
