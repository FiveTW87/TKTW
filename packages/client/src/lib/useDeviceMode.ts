import { useSyncExternalStore } from "react";

const COMPACT_ENTER_HEIGHT = 560;
const COMPACT_EXIT_HEIGHT = 640;
const COMPACT_FINE_POINTER_MAX_WIDTH = 1100;

export type TableLayoutMode = "portrait" | "compact-landscape" | "desktop";

export interface DeviceViewportInput {
  width: number;
  height: number;
  coarsePointer: boolean;
}

export interface DeviceMode {
  layoutMode: TableLayoutMode;
  orientation: "portrait" | "landscape";
  compact: boolean;
  viewportWidth: number;
  viewportHeight: number;
  coarsePointer: boolean;
}

const SERVER_SNAPSHOT: DeviceMode = {
  layoutMode: "desktop",
  orientation: "landscape",
  compact: false,
  viewportWidth: 1024,
  viewportHeight: 768,
  coarsePointer: false,
};

function validDimension(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}

/** Pure layout policy. The separate enter/exit thresholds prevent Safari's
 * collapsing toolbar from repeatedly switching the table between layouts. */
export function classifyDeviceMode(
  input: DeviceViewportInput,
  previous?: DeviceMode,
): DeviceMode {
  const width = validDimension(input.width, previous?.viewportWidth ?? SERVER_SNAPSHOT.viewportWidth);
  const height = validDimension(input.height, previous?.viewportHeight ?? SERVER_SNAPSHOT.viewportHeight);
  const orientation = height > width ? "portrait" : "landscape";

  let layoutMode: TableLayoutMode;
  if (orientation === "portrait") {
    layoutMode = "portrait";
  } else {
    const compactEligible = input.coarsePointer || width <= COMPACT_FINE_POINTER_MAX_WIDTH;
    const wasCompact = previous?.layoutMode === "compact-landscape";
    const compactHeight = wasCompact ? height < COMPACT_EXIT_HEIGHT : height <= COMPACT_ENTER_HEIGHT;
    layoutMode = compactEligible && compactHeight ? "compact-landscape" : "desktop";
  }

  return {
    layoutMode,
    orientation,
    compact: layoutMode === "compact-landscape",
    viewportWidth: width,
    viewportHeight: height,
    coarsePointer: input.coarsePointer,
  };
}

function readViewportInput(): DeviceViewportInput {
  const visualViewport = window.visualViewport;
  const width = visualViewport?.width ?? window.innerWidth;
  const height = visualViewport?.height ?? window.innerHeight;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  return { width, height, coarsePointer };
}

function equalMode(left: DeviceMode, right: DeviceMode): boolean {
  return left.layoutMode === right.layoutMode
    && left.viewportWidth === right.viewportWidth
    && left.viewportHeight === right.viewportHeight
    && left.coarsePointer === right.coarsePointer;
}

let snapshot = SERVER_SNAPSHOT;
let initialized = false;
const listeners = new Set<() => void>();
let detachListeners: (() => void) | undefined;

function refreshSnapshot(): void {
  if (typeof window === "undefined") return;
  const next = classifyDeviceMode(readViewportInput(), initialized ? snapshot : undefined);
  initialized = true;
  if (equalMode(snapshot, next)) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function attachBrowserListeners(): () => void {
  const onChange = () => refreshSnapshot();
  const pointerQuery = window.matchMedia?.("(pointer: coarse)");
  const visualViewport = window.visualViewport;
  window.addEventListener("resize", onChange);
  window.addEventListener("orientationchange", onChange);
  visualViewport?.addEventListener("resize", onChange);
  if (pointerQuery?.addEventListener) pointerQuery.addEventListener("change", onChange);
  else pointerQuery?.addListener?.(onChange);

  return () => {
    window.removeEventListener("resize", onChange);
    window.removeEventListener("orientationchange", onChange);
    visualViewport?.removeEventListener("resize", onChange);
    if (pointerQuery?.removeEventListener) pointerQuery.removeEventListener("change", onChange);
    else pointerQuery?.removeListener?.(onChange);
  };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!detachListeners) detachListeners = attachBrowserListeners();
  refreshSnapshot();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      detachListeners?.();
      detachListeners = undefined;
    }
  };
}

function getSnapshot(): DeviceMode {
  if (!initialized && typeof window !== "undefined") {
    snapshot = classifyDeviceMode(readViewportInput());
    initialized = true;
  }
  return snapshot;
}

/** Shared device-layout source of truth for the table and its descendants. */
export function useDeviceMode(): DeviceMode {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
}
