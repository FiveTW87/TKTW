import { useEffect, useRef } from "react";
import type { GameLogView } from "@tktw/shared";
import {
  mapGameLogsToPresentationEvents,
  type PresentationEvent,
} from "../presentation/presentationEvents";

interface SnapshotBaseline {
  matchId: string;
  rawLogIds: readonly string[];
}

export interface PresentationQueueOptions {
  matchId: string | undefined;
  logs: readonly GameLogView[] | undefined;
  present: (event: PresentationEvent) => void | Promise<void>;
  onReset?: () => void;
  onError?: (error: unknown, event: PresentationEvent) => void;
  intervalMs?: number;
}

function isExactPrefix(previous: readonly string[], next: readonly string[]): boolean {
  return previous.length <= next.length && previous.every((id, index) => next[index] === id);
}

/** Owns log-snapshot lifecycle and non-blocking presentation dispatch.
 * Presenter promises are observed for errors but never awaited before the
 * cadence advances, so presentation cannot delay gameplay or networking. */
export function usePresentationQueue({
  matchId,
  logs,
  present,
  onReset,
  onError,
  intervalMs = 90,
}: PresentationQueueOptions): void {
  const baselineRef = useRef<SnapshotBaseline | null>(null);
  const seenRef = useRef(new Set<string>());
  const pendingRef = useRef<PresentationEvent[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const presentRef = useRef(present);
  const onResetRef = useRef(onReset);
  const onErrorRef = useRef(onError);
  const intervalRef = useRef(intervalMs);
  presentRef.current = present;
  onResetRef.current = onReset;
  onErrorRef.current = onError;
  intervalRef.current = intervalMs;

  const clearPending = () => {
    pendingRef.current = [];
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const reportError = (error: unknown, event: PresentationEvent) => {
    try {
      onErrorRef.current?.(error, event);
    } catch {
      // Presentation diagnostics are best-effort and cannot own control flow.
    }
  };

  const dispatchNext = () => {
    timerRef.current = null;
    if (!mountedRef.current) return;
    const event = pendingRef.current.shift();
    if (!event) return;
    try {
      const outcome = presentRef.current(event);
      if (outcome && typeof outcome.then === "function") {
        void outcome.catch((error) => reportError(error, event));
      }
    } catch (error) {
      reportError(error, event);
    }
    if (pendingRef.current.length > 0) {
      timerRef.current = setTimeout(dispatchNext, intervalRef.current);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearPending();
    };
  }, []);

  useEffect(() => {
    if (!matchId || !logs) {
      const hadBaseline = baselineRef.current !== null;
      baselineRef.current = null;
      seenRef.current.clear();
      clearPending();
      if (hadBaseline) {
        try {
          onResetRef.current?.();
        } catch {
          // Reset presentation is best-effort.
        }
      }
      return;
    }

    const rawLogIds = logs.map((entry) => entry.id);
    const previous = baselineRef.current;
    const rebaseline = () => {
      clearPending();
      seenRef.current = new Set(mapGameLogsToPresentationEvents(matchId, logs).map((event) => event.id));
      baselineRef.current = { matchId, rawLogIds };
    };

    if (!previous) {
      rebaseline();
      return;
    }

    if (previous.matchId !== matchId || !isExactPrefix(previous.rawLogIds, rawLogIds)) {
      rebaseline();
      try {
        onResetRef.current?.();
      } catch {
        // Reset presentation is also best-effort.
      }
      return;
    }

    const appendedLogs = logs.slice(previous.rawLogIds.length);
    baselineRef.current = { matchId, rawLogIds };
    const appendedEvents = mapGameLogsToPresentationEvents(matchId, appendedLogs).filter((event) => {
      if (seenRef.current.has(event.id)) return false;
      seenRef.current.add(event.id);
      return true;
    });
    if (appendedEvents.length === 0) return;
    pendingRef.current.push(...appendedEvents);
    if (timerRef.current === null) dispatchNext();
  }, [logs, matchId]);
}
