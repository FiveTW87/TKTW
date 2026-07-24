import type { ReactNode } from "react";
import type { GameView, PlayerView } from "@tktw/shared";
import { OpponentPanel } from "./OpponentPanel";
import { CentralZone } from "./CentralZone";
import { TurnPanel } from "./TurnPanel";
import { relativeSeat, densityMode } from "../../lib/seatLayout";

// SPEC §11.3 — the circular war-table: opponents on an arc above a central
// zone, local player pinned as a bottom-center dock (rendered by the caller
// as `selfDock`, since it owns Table.tsx's selection/hand logic). This
// component only handles seating geometry + the pieces that don't need that
// logic (turn panel, central zone).
export function GameBoard({
  gameView,
  me,
  others,
  currentTurnPlayerId,
  targetableFor,
  selectedTargetIds,
  onTapTarget,
  onInspect,
  attackDistanceFor,
  weaponRangeSelf,
  phaseLabel,
  responderLabel,
  actionPrompt,
  pendingReveal,
  revealTitle,
  onReveal,
  busy,
  lastPlay,
  onOpenDiscard,
  selfDock,
}: {
  gameView: GameView;
  me: PlayerView;
  others: PlayerView[];
  currentTurnPlayerId: string | undefined;
  targetableFor: (p: PlayerView) => boolean;
  selectedTargetIds: string[];
  onTapTarget: (playerId: string) => void;
  onInspect: (p: PlayerView) => void;
  attackDistanceFor: (p: PlayerView) => number;
  weaponRangeSelf: number;
  phaseLabel: string;
  responderLabel: string | null;
  actionPrompt: string | null;
  pendingReveal: boolean;
  revealTitle?: string | undefined;
  onReveal: () => void;
  busy: boolean;
  lastPlay: GameView["discardPileTop"];
  onOpenDiscard: () => void;
  selfDock: ReactNode;
}) {
  const playerCount = gameView.players.length;
  const density = densityMode(playerCount);
  const currentTurnPlayer = gameView.players.find((p) => p.id === currentTurnPlayerId);
  const ringHeight = density === "head" ? 380 : density === "compact" ? 420 : 460;

  return (
    <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "70px 12px 24px", position: "relative" }}>
      <TurnPanel
        turnNumber={gameView.turnNumber}
        phaseLabel={phaseLabel}
        currentTurnPlayerName={currentTurnPlayer?.name}
        responderLabel={responderLabel}
        actionPrompt={actionPrompt}
        expiresAt={gameView.pendingDecision?.expiresAt}
        serverNow={gameView.serverNow}
      />

      {/* the ring: opponents on the arc + central zone, sharing one relative
          container so arc percentages resolve against the same box */}
      <div className="panel-plain" style={{ position: "relative", width: "100%", maxWidth: 1040, height: ringHeight, marginBottom: 14 }}>
        {others.map((p) => {
          const dist = attackDistanceFor(p);
          return (
            <OpponentPanel
              key={p.id}
              player={p}
              relSeat={relativeSeat(p.seat, me.seat, playerCount)}
              playerCount={playerCount}
              density={density}
              isCurrentTurn={currentTurnPlayerId === p.id}
              targetable={targetableFor(p)}
              selected={selectedTargetIds.includes(p.id)}
              distance={dist}
              inRange={dist <= weaponRangeSelf}
              connectionStatus={p.connectionStatus}
              onClick={() => onTapTarget(p.id)}
              onInspect={() => onInspect(p)}
            />
          );
        })}

        <div style={{ position: "absolute", left: "50%", top: "78%", transform: "translate(-50%, -50%)", width: "100%", maxWidth: 420 }}>
          <CentralZone
            drawPileCount={gameView.drawPileCount}
            pendingReveal={pendingReveal}
            revealTitle={revealTitle}
            onReveal={onReveal}
            busy={busy}
            lastPlay={lastPlay}
            discardCount={gameView.discardPile.length}
            onOpenDiscard={onOpenDiscard}
          />
        </div>
      </div>

      {/* self dock — bottom-center, always the local player (SPEC §11.3) */}
      <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>{selfDock}</div>
    </div>
  );
}
