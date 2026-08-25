import { describe, expect, it, vi } from "vitest";
import { createAcceptedActionChannel } from "../src/lib/acceptedActionChannel";

describe("accepted action channel", () => {
  it("publishes acknowledged answers with their pre-answer projected legal actions and supports unsubscribe", () => {
    const channel = createAcceptedActionChannel();
    const listener = vi.fn();
    const unsubscribe = channel.subscribe(listener);
    const event = {
      acceptedAnswer: { decisionId: "draw", choice: "draw" },
      legalActions: [{ kind: "draw" }],
    } as const;

    channel.publish(event);
    expect(listener).toHaveBeenCalledWith(event);

    unsubscribe();
    channel.publish(event);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
