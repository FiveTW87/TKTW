import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { classifyDeviceMode, useDeviceMode } from "../src/lib/useDeviceMode";

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
const originalVisualViewport = Object.getOwnPropertyDescriptor(window, "visualViewport");

function installVisualViewport(width: number, height: number) {
  const viewport = new EventTarget() as EventTarget & { width: number; height: number };
  viewport.width = width;
  viewport.height = height;
  Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
  return viewport;
}

afterEach(() => {
  if (originalVisualViewport) Object.defineProperty(window, "visualViewport", originalVisualViewport);
  else Reflect.deleteProperty(window, "visualViewport");
  setViewport(originalWidth, originalHeight);
});

describe("useDeviceMode (SPEC §12 — mobile landscape detection)", () => {
  it("uses one typed compact-landscape mode for every supported gate", () => {
    for (const [width, height] of GATE_SIZES) {
      expect(classifyDeviceMode({ width, height, coarsePointer: true })).toMatchObject({
        layoutMode: "compact-landscape",
        orientation: "landscape",
        compact: true,
        viewportWidth: width,
        viewportHeight: height,
      });
    }
  });

  it("keeps compact mode through Safari toolbar jitter and exits only beyond the hysteresis band", () => {
    const entered = classifyDeviceMode({ width: 932, height: 550, coarsePointer: true });
    const toolbarOpen = classifyDeviceMode({ width: 932, height: 590, coarsePointer: true }, entered);
    const toolbarClosed = classifyDeviceMode({ width: 932, height: 555, coarsePointer: true }, toolbarOpen);
    const exited = classifyDeviceMode({ width: 932, height: 650, coarsePointer: true }, toolbarClosed);
    expect([entered, toolbarOpen, toolbarClosed].map((mode) => mode.layoutMode)).toEqual([
      "compact-landscape", "compact-landscape", "compact-landscape",
    ]);
    expect(exited.layoutMode).toBe("desktop");
  });

  it("does not classify a fine-pointer short desktop as a phone", () => {
    expect(classifyDeviceMode({ width: 1440, height: 500, coarsePointer: false }).layoutMode).toBe("desktop");
    expect(classifyDeviceMode({ width: 1024, height: 500, coarsePointer: false }).layoutMode).toBe("compact-landscape");
  });

  it("rotation overrides compact hysteresis immediately", () => {
    const compact = classifyDeviceMode({ width: 844, height: 390, coarsePointer: true });
    expect(classifyDeviceMode({ width: 390, height: 844, coarsePointer: true }, compact).layoutMode).toBe("portrait");
  });

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

  it("prefers visualViewport and keeps all mounted consumers on the same hysteretic snapshot", () => {
    setViewport(932, 700);
    const visualViewport = installVisualViewport(932, 430);
    const first = renderHook(() => useDeviceMode());
    expect(first.result.current).toMatchObject({
      layoutMode: "compact-landscape",
      viewportHeight: 430,
    });

    act(() => {
      visualViewport.height = 590;
      visualViewport.dispatchEvent(new Event("resize"));
    });
    const second = renderHook(() => useDeviceMode());
    expect(first.result.current.layoutMode).toBe("compact-landscape");
    expect(second.result.current.layoutMode).toBe("compact-landscape");
    expect(second.result.current.viewportHeight).toBe(590);
  });
});
