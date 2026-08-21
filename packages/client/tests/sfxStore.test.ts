import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSfxStore } from "../src/store/sfxStore";

describe("sfxStore (mute/volume prefs)", () => {
  beforeEach(() => {
    localStorage.clear();
    useSfxStore.setState({ muted: false, volume: 0.6 });
  });

  it("defaults to unmuted at volume 0.6", () => {
    expect(useSfxStore.getState().muted).toBe(false);
    expect(useSfxStore.getState().volume).toBe(0.6);
  });

  it("setMuted updates state and persists to localStorage", () => {
    useSfxStore.getState().setMuted(true);
    expect(useSfxStore.getState().muted).toBe(true);
    const stored = JSON.parse(localStorage.getItem("tktw_sfx")!);
    expect(stored.muted).toBe(true);
  });

  it("setVolume clamps to [0,1] and persists", () => {
    useSfxStore.getState().setVolume(1.5);
    expect(useSfxStore.getState().volume).toBe(1);
    useSfxStore.getState().setVolume(-0.5);
    expect(useSfxStore.getState().volume).toBe(0);
    const stored = JSON.parse(localStorage.getItem("tktw_sfx")!);
    expect(stored.volume).toBe(0);
  });

  it("normalizes non-finite volume and survives persistence failure", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    expect(() => useSfxStore.getState().setVolume(Number.NaN)).not.toThrow();
    expect(useSfxStore.getState().volume).toBe(0.6);
    expect(() => useSfxStore.getState().setMuted(true)).not.toThrow();
    expect(useSfxStore.getState().muted).toBe(true);
    setItem.mockRestore();
  });

  it("falls back to valid defaults when persisted preferences are malformed", async () => {
    localStorage.setItem("tktw_sfx", "{bad json");
    vi.resetModules();
    const malformed = await import("../src/store/sfxStore");
    expect(malformed.useSfxStore.getState().muted).toBe(false);
    expect(malformed.useSfxStore.getState().volume).toBe(0.6);

    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    vi.resetModules();
    const blocked = await import("../src/store/sfxStore");
    expect(blocked.useSfxStore.getState().muted).toBe(false);
    expect(blocked.useSfxStore.getState().volume).toBe(0.6);
    getItem.mockRestore();
  });
});
