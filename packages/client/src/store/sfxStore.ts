import { create } from "zustand";

const STORAGE_KEY = "tktw_sfx";
const DEFAULT_PREFS = { muted: false, volume: 0.6 } as const;

interface StoredSfxPrefs {
  muted: boolean;
  volume: number;
}

function loadStoredPrefs(): StoredSfxPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<StoredSfxPrefs>;
    return {
      muted: typeof parsed.muted === "boolean" ? parsed.muted : DEFAULT_PREFS.muted,
      volume: normalizeVolume(parsed.volume),
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs(prefs: StoredSfxPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Preferences are optional; blocked/quota-limited storage must not break UI.
  }
}

function normalizeVolume(volume: unknown): number {
  return typeof volume === "number" && Number.isFinite(volume)
    ? Math.min(1, Math.max(0, volume))
    : DEFAULT_PREFS.volume;
}

interface SfxState {
  muted: boolean;
  volume: number;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
}

const initial = loadStoredPrefs();

export const useSfxStore = create<SfxState>((set) => ({
  muted: initial.muted,
  volume: initial.volume,
  setMuted: (muted) => {
    set({ muted });
    savePrefs({ muted, volume: useSfxStore.getState().volume });
  },
  setVolume: (volume) => {
    const clamped = normalizeVolume(volume);
    set({ volume: clamped });
    savePrefs({ muted: useSfxStore.getState().muted, volume: clamped });
  },
}));
