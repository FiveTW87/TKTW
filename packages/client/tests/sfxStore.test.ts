import { describe, it, expect, beforeEach } from "vitest";
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
});
