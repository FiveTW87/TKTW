import type { TutorialProgress } from "./tutorialController";

export interface TutorialProgressStoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface TutorialProgressStorage {
  load(scenarioId: string): unknown;
  save(progress: TutorialProgress): void;
  clear(scenarioId: string): void;
}

const KEY_PREFIX = "tktw_tutorial_progress:";

export function createTutorialProgressStorage(port: TutorialProgressStoragePort): TutorialProgressStorage {
  return {
    load: (scenarioId) => {
      try {
        const value = port.getItem(storageKey(scenarioId));
        return value === null ? undefined : JSON.parse(value) as unknown;
      } catch {
        return undefined;
      }
    },
    save: (progress) => {
      try {
        port.setItem(storageKey(progress.scenarioId), JSON.stringify(progress));
      } catch {
        // Tutorial remains playable when storage is blocked, private, or full.
      }
    },
    clear: (scenarioId) => {
      try {
        port.removeItem(storageKey(scenarioId));
      } catch {
        // Reset still applies to the in-memory controller when storage is unavailable.
      }
    },
  };
}

function storageKey(scenarioId: string): string {
  return `${KEY_PREFIX}${scenarioId}`;
}
