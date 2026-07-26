import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDeviceMode } from "../src/lib/useDeviceMode";

// SPEC §12.3's own mobile gate sizes — all landscape (wider than tall) and
// short enough to need compact sizing.
const GATE_SIZES: [number, number][] = [
  [932, 430],
  [844, 390],
  [740, 360],
];

function setViewport(width: number, height: number) {
  window.innerWidth = width;
  window.innerHeight = height;
  window.dispatchEvent(new Event("resize"));
}

const originalWidth = window.innerWidth;
const originalHeight = window.innerHeight;

afterEach(() => {
  setViewport(originalWidth, originalHeight);
});

describe("useDeviceMode (SPEC §12 — mobile landscape detection)", () => {
  it.each(GATE_SIZES)("classifies %ix%i as landscape + compact", (w, h) => {
    setViewport(w, h);
    const { result } = renderHook(() => useDeviceMode());
    expect(result.current.orientation).toBe("landscape");
    expect(result.current.compact).toBe(true);
  });

  it("classifies a portrait phone size as portrait", () => {
    setViewport(390, 844);
    const { result } = renderHook(() => useDeviceMode());
    expect(result.current.orientation).toBe("portrait");
  });

  it("classifies a normal desktop window as landscape, not compact", () => {
    setViewport(1440, 900);
    const { result } = renderHook(() => useDeviceMode());
    expect(result.current.orientation).toBe("landscape");
    expect(result.current.compact).toBe(false);
  });

  it("re-reads on resize", () => {
    setViewport(1440, 900);
    const { result } = renderHook(() => useDeviceMode());
    expect(result.current.compact).toBe(false);
    act(() => setViewport(932, 430));
    expect(result.current.compact).toBe(true);
  });
});
