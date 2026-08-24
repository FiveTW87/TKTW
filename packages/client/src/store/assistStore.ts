import { create } from "zustand";

export type AssistanceLevel = "off" | "basic" | "detailed";
export type WalkthroughStatus = "new" | "active" | "paused" | "completed" | "skipped";

export interface WalkthroughProgress {
  status: WalkthroughStatus;
  step: number;
}

interface AssistState {
  level: AssistanceLevel;
  walkthrough: WalkthroughProgress;
  setLevel: (level: AssistanceLevel) => void;
  beginIfNeeded: () => void;
  nextWalkthroughStep: (totalSteps: number) => void;
  previousWalkthroughStep: () => void;
  pauseWalkthrough: () => void;
  resumeWalkthrough: () => void;
  skipWalkthrough: () => void;
  replayWalkthrough: () => void;
}

const STORAGE_KEY = "tktw_assist";

const DEFAULT_STATE = {
  level: "basic",
  walkthrough: { status: "new", step: 0 },
} as const satisfies Pick<AssistState, "level" | "walkthrough">;

const LEVELS = new Set<AssistanceLevel>(["off", "basic", "detailed"]);
const WALKTHROUGH_STATUSES = new Set<WalkthroughStatus>(["new", "active", "paused", "completed", "skipped"]);
const initial = load();

export const useAssistStore = create<AssistState>((set) => ({
  level: initial.level,
  walkthrough: initial.walkthrough,
  setLevel: (level) => {
    set({ level });
    save({ level, walkthrough: useAssistStore.getState().walkthrough });
  },
  beginIfNeeded: () => updateWalkthrough(set, (current, level) =>
    level !== "off" && current.status === "new" ? { status: "active", step: 0 } : current),
  nextWalkthroughStep: (totalSteps) => updateWalkthrough(set, (current) => {
    if (current.status !== "active") return current;
    const lastStep = Math.max(0, totalSteps - 1);
    const nextStep = current.step + 1;
    return nextStep > lastStep
      ? { status: "completed", step: lastStep }
      : { status: "active", step: nextStep };
  }),
  previousWalkthroughStep: () => updateWalkthrough(set, (current) =>
    current.status === "active" ? { ...current, step: Math.max(0, current.step - 1) } : current),
  pauseWalkthrough: () => updateWalkthrough(set, (current) =>
    current.status === "active" ? { ...current, status: "paused" } : current),
  resumeWalkthrough: () => updateWalkthrough(set, (current, level) =>
    level !== "off" && (current.status === "paused" || current.status === "new")
      ? { ...current, status: "active" }
      : current),
  skipWalkthrough: () => updateWalkthrough(set, (current) => ({ ...current, status: "skipped" })),
  replayWalkthrough: () => updateWalkthrough(set, (_current, level) =>
    level === "off" ? { status: "paused", step: 0 } : { status: "active", step: 0 }),
}));

function load(): Pick<AssistState, "level" | "walkthrough"> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshDefault();
    const parsed = JSON.parse(raw) as {
      version?: unknown;
      level?: unknown;
      walkthrough?: { status?: unknown; step?: unknown };
    };
    if (
      parsed.version !== 1
      || typeof parsed.level !== "string"
      || !LEVELS.has(parsed.level as AssistanceLevel)
      || typeof parsed.walkthrough?.status !== "string"
      || !WALKTHROUGH_STATUSES.has(parsed.walkthrough.status as WalkthroughStatus)
      || typeof parsed.walkthrough.step !== "number"
      || !Number.isInteger(parsed.walkthrough.step)
      || parsed.walkthrough.step < 0
    ) return freshDefault();
    return {
      level: parsed.level as AssistanceLevel,
      walkthrough: {
        status: parsed.walkthrough.status as WalkthroughStatus,
        step: parsed.walkthrough.step,
      },
    };
  } catch {
    return freshDefault();
  }
}

function freshDefault(): Pick<AssistState, "level" | "walkthrough"> {
  return { level: DEFAULT_STATE.level, walkthrough: { ...DEFAULT_STATE.walkthrough } };
}

function updateWalkthrough(
  set: (partial: Partial<AssistState>) => void,
  update: (current: WalkthroughProgress, level: AssistanceLevel) => WalkthroughProgress,
): void {
  const state = useAssistStore.getState();
  const walkthrough = update(state.walkthrough, state.level);
  if (walkthrough === state.walkthrough) return;
  set({ walkthrough });
  save({ level: state.level, walkthrough });
}

function save(state: Pick<AssistState, "level" | "walkthrough">): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...state }));
  } catch {
    // Assistance remains usable when browser storage is blocked or full.
  }
}
