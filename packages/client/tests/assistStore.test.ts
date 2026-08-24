import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAssistStore } from "../src/store/assistStore";

describe("assistStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useAssistStore.setState({ level: "basic", walkthrough: { status: "new", step: 0 } });
  });

  it("starts with basic assistance and a new first-table walkthrough", () => {
    expect(useAssistStore.getState().level).toBe("basic");
    expect(useAssistStore.getState().walkthrough).toEqual({ status: "new", step: 0 });
  });

  it("updates and persists the player's assistance level", () => {
    useAssistStore.getState().setLevel("detailed");

    expect(useAssistStore.getState().level).toBe("detailed");
    expect(JSON.parse(localStorage.getItem("tktw_assist")!)).toMatchObject({
      version: 1,
      level: "detailed",
    });
  });

  it("supports pausing, resuming, completing, skipping, and replaying the walkthrough", () => {
    const store = () => useAssistStore.getState();

    store().beginIfNeeded();
    expect(store().walkthrough).toEqual({ status: "active", step: 0 });
    store().nextWalkthroughStep(4);
    expect(store().walkthrough).toEqual({ status: "active", step: 1 });
    store().pauseWalkthrough();
    expect(store().walkthrough.status).toBe("paused");
    store().resumeWalkthrough();
    expect(store().walkthrough.status).toBe("active");
    store().nextWalkthroughStep(2);
    expect(store().walkthrough).toEqual({ status: "completed", step: 1 });
    store().replayWalkthrough();
    expect(store().walkthrough).toEqual({ status: "active", step: 0 });
    store().skipWalkthrough();
    expect(store().walkthrough.status).toBe("skipped");
  });

  it("restores valid preferences while normalizing malformed persisted values", async () => {
    localStorage.setItem("tktw_assist", JSON.stringify({
      version: 1,
      level: "detailed",
      walkthrough: { status: "paused", step: 3 },
    }));
    vi.resetModules();
    const restored = await import("../src/store/assistStore");
    expect(restored.useAssistStore.getState().level).toBe("detailed");
    expect(restored.useAssistStore.getState().walkthrough).toEqual({ status: "paused", step: 3 });

    localStorage.setItem("tktw_assist", JSON.stringify({ level: "maximum", walkthrough: { status: "lost", step: -8 } }));
    vi.resetModules();
    const malformed = await import("../src/store/assistStore");
    expect(malformed.useAssistStore.getState().level).toBe("basic");
    expect(malformed.useAssistStore.getState().walkthrough).toEqual({ status: "new", step: 0 });
  });

  it("keeps assistance usable when browser storage is blocked or full", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(() => useAssistStore.getState().setLevel("detailed")).not.toThrow();
    expect(useAssistStore.getState().level).toBe("detailed");
    setItem.mockRestore();

    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    vi.resetModules();
    const blocked = await import("../src/store/assistStore");
    expect(blocked.useAssistStore.getState().level).toBe("basic");
    expect(blocked.useAssistStore.getState().walkthrough).toEqual({ status: "new", step: 0 });
    getItem.mockRestore();
  });
});
