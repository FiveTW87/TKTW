import { useCallback, useEffect, useRef, useState } from "react";
import type { GameLogView } from "@tktw/shared";
import { usePresentationQueue } from "./usePresentationQueue";
import type { PresentationEvent } from "../presentation/presentationEvents";

export type TableFeedbackCue =
  | { id: string; kind: "judgmentReveal"; playerId: string; cardType?: string; suit?: string; rank?: number; reason?: string }
  | { id: string; kind: "judgmentReplace"; actorId: string; playerId: string; cardType?: string; suit?: string; rank?: number }
  | { id: string; kind: "judgmentResult"; playerId: string; cardType?: string; suit?: string; rank?: number; outcome?: string; amount?: number }
  | { id: string; kind: "wuxieCounter"; actorId: string; targetType?: string; depth: number }
  | { id: string; kind: "wuxieResult"; actorId: string; targetType?: string; effective: boolean }
  | { id: string; kind: "turn"; turnNumber: number; playerName: string }
  | { id: string; kind: "phase"; turnNumber: number; phase: string };

interface Options {
  connected: boolean;
  matchId: string | undefined;
  logs: readonly GameLogView[] | undefined;
  turnNumber: number | undefined;
  phase: string | undefined;
  currentTurnPlayerName: string | undefined;
}

const MAX_CUES = 4;

function feedbackCue(event: PresentationEvent): TableFeedbackCue | null {
  switch (event.kind) {
    case "judgmentReveal":
      return { id: event.id, kind: event.kind, playerId: event.playerId, ...(event.cardType ? { cardType: event.cardType } : {}), ...(event.suit ? { suit: event.suit } : {}), ...(event.rank !== undefined ? { rank: event.rank } : {}), ...(event.reason ? { reason: event.reason } : {}) };
    case "judgmentReplace":
      return { id: event.id, kind: event.kind, actorId: event.actorId, playerId: event.playerId, ...(event.cardType ? { cardType: event.cardType } : {}), ...(event.suit ? { suit: event.suit } : {}), ...(event.rank !== undefined ? { rank: event.rank } : {}) };
    case "judgmentResult":
      return { id: event.id, kind: event.kind, playerId: event.playerId, ...(event.cardType ? { cardType: event.cardType } : {}), ...(event.suit ? { suit: event.suit } : {}), ...(event.rank !== undefined ? { rank: event.rank } : {}), ...(event.outcome ? { outcome: event.outcome } : {}), ...(event.amount !== undefined ? { amount: event.amount } : {}) };
    case "wuxieCounter":
      return { id: event.id, kind: event.kind, actorId: event.actorId, ...(event.targetType ? { targetType: event.targetType } : {}), depth: event.depth };
    case "wuxieResult":
      return { id: event.id, kind: event.kind, actorId: event.actorId, ...(event.targetType ? { targetType: event.targetType } : {}), effective: event.effective };
    default:
      return null;
  }
}

export function useTableFeedbackPresentation(options: Options): TableFeedbackCue[] {
  const [cues, setCues] = useState<TableFeedbackCue[]>([]);
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const snapshotRef = useRef<{ matchId: string; turnNumber: number; phase: string; logs: readonly GameLogView[] | undefined } | null>(null);
  const awaitingFreshRef = useRef(false);
  const disconnectedLogsRef = useRef<readonly GameLogView[] | undefined>(undefined);

  const clear = useCallback(() => {
    for (const timer of timersRef.current.values()) clearTimeout(timer);
    timersRef.current.clear();
    setCues([]);
  }, []);

  const show = useCallback((cue: TableFeedbackCue) => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    setCues((current) => [...current.filter((item) => item.id !== cue.id), cue].slice(-MAX_CUES));
    const previous = timersRef.current.get(cue.id);
    if (previous) clearTimeout(previous);
    timersRef.current.set(cue.id, setTimeout(() => {
      timersRef.current.delete(cue.id);
      setCues((current) => current.filter((item) => item.id !== cue.id));
    }, reduced ? 650 : 1500));
  }, []);

  usePresentationQueue({
    connected: options.connected,
    matchId: options.matchId,
    logs: options.logs,
    intervalMs: 90,
    onReset: clear,
    present: (event) => {
      const cue = feedbackCue(event);
      if (cue) show(cue);
    },
  });

  useEffect(() => clear, [clear]);

  useEffect(() => {
    const { connected, matchId, logs, turnNumber, phase, currentTurnPlayerName } = options;
    if (!connected) {
      if (!awaitingFreshRef.current) clear();
      awaitingFreshRef.current = true;
      disconnectedLogsRef.current = logs;
      return;
    }
    if (!matchId || turnNumber === undefined || !phase) return;
    if (awaitingFreshRef.current) {
      if (logs === disconnectedLogsRef.current) return;
      awaitingFreshRef.current = false;
      disconnectedLogsRef.current = undefined;
      snapshotRef.current = { matchId, turnNumber, phase, logs };
      return;
    }
    const previous = snapshotRef.current;
    snapshotRef.current = { matchId, turnNumber, phase, logs };
    if (!previous || previous.matchId !== matchId) return;
    if (previous.turnNumber !== turnNumber) {
      show({ id: `${matchId}:turn:${turnNumber}`, kind: "turn", turnNumber, playerName: currentTurnPlayerName ?? "ผู้เล่นปัจจุบัน" });
      return;
    }
    if (previous.phase !== phase) {
      show({ id: `${matchId}:phase:${turnNumber}:${phase}`, kind: "phase", turnNumber, phase });
    }
  }, [options.connected, options.matchId, options.logs, options.turnNumber, options.phase, options.currentTurnPlayerName, clear, show]);

  return cues;
}
