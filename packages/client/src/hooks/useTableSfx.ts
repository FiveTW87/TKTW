import { useEffect, useRef } from "react";
import type { GameView } from "@tktw/shared";
import { playSfx, type SfxName } from "../lib/sfx";

interface Baseline {
  matchId: string | undefined;
  discardTopId: string | null;
  logCount: number;
  turnPlayerId: string | null;
}

/** Sole owner of state/log snapshot-to-sound routing. The first snapshot,
 * log rollback, match change, and first fresh view after reconnect establish
 * a silent baseline so presentation can never replay historical events. */
export function useTableSfx({
  connected,
  gameView,
  viewerPlayerId,
  play = playSfx,
}: {
  connected: boolean;
  gameView: GameView | null;
  viewerPlayerId: string | undefined;
  play?: (name: SfxName) => void;
}): void {
  const baselineRef = useRef<Baseline | null>(null);
  const lastViewRef = useRef<GameView | null>(null);
  const awaitingFreshViewRef = useRef(false);

  useEffect(() => {
    if (!gameView) {
      baselineRef.current = null;
      lastViewRef.current = null;
      awaitingFreshViewRef.current = !connected;
      return;
    }

    if (!connected) {
      awaitingFreshViewRef.current = true;
      lastViewRef.current = gameView;
      return;
    }

    const prime = () => {
      baselineRef.current = {
        matchId: gameView.matchId,
        discardTopId: gameView.discardPileTop?.id ?? null,
        logCount: gameView.gameLogs.length,
        turnPlayerId: gameView.currentTurnPlayerId ?? null,
      };
      lastViewRef.current = gameView;
    };

    if (awaitingFreshViewRef.current) {
      if (lastViewRef.current === gameView) return;
      awaitingFreshViewRef.current = false;
      prime();
      return;
    }

    const previous = baselineRef.current;
    if (!previous || previous.matchId !== gameView.matchId || gameView.gameLogs.length < previous.logCount) {
      prime();
      return;
    }

    const discardTopId = gameView.discardPileTop?.id ?? null;
    if (discardTopId && discardTopId !== previous.discardTopId) play("cardPlay");

    for (const entry of gameView.gameLogs.slice(previous.logCount)) {
      // Combat/skill outcome sounds are owned by useCombatPresentation so
      // they land with the visible phase instead of bursting on snapshot
      // arrival. Table SFX retains snapshot-only draw/discard/turn cues.
      if (entry.eventType === "draw" && entry.actorId === viewerPlayerId) play("draw");
    }

    const turnPlayerId = gameView.currentTurnPlayerId ?? null;
    if (turnPlayerId && turnPlayerId !== previous.turnPlayerId && turnPlayerId === viewerPlayerId) play("turnStart");
    prime();
  }, [connected, gameView, play, viewerPlayerId]);
}
