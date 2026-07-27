import { create } from "zustand";

const STORAGE_KEY = "tktw_sfx";

interface StoredSfxPrefs {
  muted: boolean;
  volume: number;
}

function loadStoredPrefs(): StoredSfxPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { muted: false, volume: 0.6 };
    const parsed = JSON.parse(raw) as Partial<StoredSfxPrefs>;
    return {
      muted: typeof parsed.muted === "boolean" ? parsed.muted : false,
      volume: typeof parsed.volume === "number" ? Math.min(1, Math.max(0, parsed.volume)) : 0.6,
    };
  } catch {
    return { muted: false, volume: 0.6 };
  }
}

function savePrefs(prefs: StoredSfxPrefs): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
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
    const clamped = Math.min(1, Math.max(0, volume));
    set({ volume: clamped });
    savePrefs({ muted: useSfxStore.getState().muted, volume: clamped });
  },
}));
