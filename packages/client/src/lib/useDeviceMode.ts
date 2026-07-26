import { useEffect, useState } from "react";

/** Viewport height at/below this reads as "mobile landscape" — SPEC §12.2's
 *  own gate sizes (932×430, 844×390, 740×360) top out at 430px tall, so
 *  560 gives headroom for browser toolbars while still excluding real
 *  desktop/tablet windows. Independent of `useIsNarrow` (width-based, for
 *  portrait-tablet column stacking) — this is about short-viewport sizing. */
const COMPACT_HEIGHT = 560;

export interface DeviceMode {
  orientation: "portrait" | "landscape";
  /** True when the viewport is short enough to need mobile-landscape sizing
   *  (tighter paddings/board scale), regardless of orientation. */
  compact: boolean;
}

function readDeviceMode(): DeviceMode {
  if (typeof window === "undefined") return { orientation: "landscape", compact: false };
  const { innerWidth: w, innerHeight: h } = window;
  return {
    orientation: h > w ? "portrait" : "landscape",
    compact: h <= COMPACT_HEIGHT,
  };
}

/** SPEC §12 — Phase 8's device-mode source of truth: orientation (drives the
 *  rotate overlay on Character Select / Table) and compact-height sizing
 *  (drives the mobile-landscape board/panel scaling), both re-read on
 *  resize/orientationchange (covers rotation, browser-toolbar show/hide, and
 *  fullscreen enter/exit). */
export function useDeviceMode(): DeviceMode {
  const [mode, setMode] = useState<DeviceMode>(readDeviceMode);
  useEffect(() => {
    const onChange = () => setMode(readDeviceMode());
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    onChange();
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
    };
  }, []);
  return mode;
}
