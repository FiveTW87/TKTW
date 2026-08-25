import { describe, expect, it } from "vitest";
import { emitAckWithTimeout, type AckTransport } from "../src/lib/ack";

function transportWith(response?: unknown): AckTransport {
  return {
    emit: (_event, _payload, callback) => {
      if (response !== undefined) callback(response);
    },
  };
}

describe("socket acknowledgement timeout", () => {
  it("returns a typed recoverable failure instead of leaving the promise pending", async () => {
    await expect(emitAckWithTimeout(transportWith(), 10, "game:answer", {}))
      .resolves.toEqual({ ok: false, error: "connection timeout" });
  });

  it("preserves a normal server acknowledgement", async () => {
    await expect(emitAckWithTimeout(transportWith({ ok: true, seatIndex: 2 }), 10, "room:rejoin", {}))
      .resolves.toEqual({ ok: true, seatIndex: 2 });
  });
});
