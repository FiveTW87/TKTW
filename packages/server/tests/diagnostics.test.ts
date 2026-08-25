import { describe, expect, it, vi } from "vitest";
import {
  buildDiagnosticRecord,
  createDiagnosticReporter,
  type DiagnosticInput,
} from "../src/diagnostics";

describe("structured server diagnostics", () => {
  it("keeps correlation fields while dropping every non-allowlisted payload field", () => {
    const input = {
      event: "game.answer",
      outcome: "rejected",
      roomCode: "ABCDE1",
      matchId: "match_7",
      decisionId: "dec_4",
      clientActionId: "action_9",
      seatIndex: 2,
      sessionToken: "super-secret-token",
      hand: [{ id: "private-card" }],
      role: "traitor",
      choice: "private-choice",
      rawPayload: { targetIds: ["p2"] },
    } as DiagnosticInput & Record<string, unknown>;

    const record = buildDiagnosticRecord(input, () => 123_456);
    expect(record).toEqual({
      timestamp: 123_456,
      event: "game.answer",
      outcome: "rejected",
      roomCode: "ABCDE1",
      matchId: "match_7",
      decisionId: "dec_4",
      clientActionId: "action_9",
      seatIndex: 2,
    });
    expect(JSON.stringify(record)).not.toMatch(/super-secret|private-card|traitor|private-choice|targetIds/);
  });

  it("normalizes errors without stacks, tokens, UUIDs, or unbounded text", () => {
    const secret = "token_123456789012345678901234567890";
    const record = buildDiagnosticRecord({
      event: "room.rejoin",
      outcome: "rejected",
      error: new Error(`invalid session token ${secret} 550e8400-e29b-41d4-a716-446655440000 ${"x".repeat(400)}`),
    });
    expect(record.errorName).toBe("Error");
    expect(record.reason).toContain("invalid session token");
    expect(record.reason).toContain("[redacted]");
    expect(record.reason).not.toContain(secret);
    expect(record.reason).not.toContain("550e8400");
    expect(record.reason!.length).toBeLessThanOrEqual(240);
    expect(record).not.toHaveProperty("stack");
  });

  it("never lets a diagnostic sink failure affect room control flow", () => {
    const sink = vi.fn(() => { throw new Error("collector offline"); });
    const report = createDiagnosticReporter(sink, () => 7);
    expect(() => report({ event: "decision.timeout", outcome: "triggered", roomCode: "ROOM1" })).not.toThrow();
    expect(sink).toHaveBeenCalledWith(expect.objectContaining({ timestamp: 7, event: "decision.timeout" }));
  });
});
