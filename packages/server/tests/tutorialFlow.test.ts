import { respond } from "@tktw/engine";
import { describe, expect, it } from "vitest";
import { automatedAnswerFor } from "../src/rooms/gameFlow";
import { RoomManager } from "../src/rooms/RoomManager";

describe("tutorial automated decisions", () => {
  it("uses the selected scenario's scripted input instead of the generic bot policy", () => {
    const room = new RoomManager().startTutorial("ผู้ฝึก", "basic-recovery").room;
    const learnerDecision = room.session!.state.pendingDecision!;
    respond(room.session!, {
      decisionId: learnerDecision.id,
      playerId: learnerDecision.playerId,
      pass: true,
    });
    const botDecision = room.session!.state.pendingDecision!;

    expect(automatedAnswerFor(room, botDecision)).toEqual({
      decisionId: botDecision.id,
      playerId: botDecision.playerId,
      choice: "endPhase",
    });
  });
});
