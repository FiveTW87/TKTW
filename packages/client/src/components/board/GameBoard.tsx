import type { ReactNode } from "react";
import type { GameView, PlayerView } from "@tktw/shared";
import { OpponentPanel } from "./OpponentPanel";
import { CentralZone } from "./CentralZone";
import { TurnPanel } from "./TurnPanel";
import { relativeSeat, densityMode, tableRingPosition } from "../../lib/seatLayout";
import { generalDisplay } from "../../data/generalNames";
import { useDeviceMode } from "../../lib/useDeviceMode";
import { PlayerTile } from "../PlayerTile";

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
  onOpenDiscard: () => void;
  selfDock: ReactNode;
}) {
  const playerCount = gameView.players.length;
  const density = densityMode(playerCount);
  const currentTurnPlayer = gameView.players.find((p) => p.id === currentTurnPlayerId);
  const { compact } = useDeviceMode();
  const ringMinHeight = compact
    ? density === "head" ? 130 : density === "compact" ? 145 : 160
    : density === "head" ? 380 : density === "compact" ? 420 : 460;

  return (
    <div className="table-game-board" style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: compact ? "38px 6px 4px" : "56px 12px 8px", position: "relative" }}>
      <TurnPanel
        turnNumber={gameView.turnNumber}
        phaseLabel={phaseLabel}
        currentTurnPlayerName={currentTurnPlayer?.name}
        currentTurnPlayerSeat={currentTurnPlayer?.seat}
        currentTurnGeneralGlyph={currentTurnPlayer ? generalDisplay(currentTurnPlayer.generalId).glyph : undefined}
        currentTurnGeneralId={currentTurnPlayer?.generalId}
        currentTurnFaction={currentTurnPlayer?.faction}
        responderLabel={responderLabel}
        actionPrompt={actionPrompt}
        expiresAt={gameView.pendingDecision?.expiresAt}
        serverNow={gameView.serverNow}
      />

      {/* the ring: opponents on the arc + central zone, sharing one relative
          container so arc percentages resolve against the same box. Flex-grows
          to fill whatever vertical/horizontal space the viewport has, instead
          of a small fixed box that leaves the rest of the screen blank. */}
      <div className="panel-plain table-board-ring" style={{ position: "relative", width: "100%", maxWidth: 1400, flex: "1 1 auto", minHeight: ringMinHeight, marginBottom: compact ? 6 : 14 }}>
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

        {(() => {
          const selfPos = tableRingPosition(0, playerCount);
          return (
            <div className="table-self-ring-seat" style={{ position: "absolute", left: `${selfPos.leftPct}%`, top: `${selfPos.topPct}%`, transform: "translate(-50%, -50%)", width: compact ? 105 : 150 }}>
              <PlayerTile
                player={me}
                isCurrentTurn={currentTurnPlayerId === me.id}
                targetable={targetableFor(me)}
                selected={selectedTargetIds.includes(me.id)}
                density="compact"
                compact={compact}
                onClick={() => onTapTarget(me.id)}
                onInspect={() => onInspect(me)}
              />
            </div>
          );
        })()}

        <div className="table-central-anchor" style={{ position: "absolute", left: "50%", top: compact ? "58%" : "62%", transform: "translate(-50%, -50%)", width: "100%", maxWidth: compact ? 210 : 300 }}>
          <CentralZone
            drawPileCount={gameView.drawPileCount}
            pendingReveal={pendingReveal}
            revealTitle={revealTitle}
            onReveal={onReveal}
            busy={busy}
            discardCount={gameView.discardPile.length}
            discardTop={gameView.discardPile.at(-1)}
            onOpenDiscard={onOpenDiscard}
          />
        </div>
      </div>

      {/* self dock — bottom-center, always the local player (SPEC §11.3).
          Desktop reserves a right-side gutter so the fixed bottom-right
          action cluster (Table.tsx) never overlaps the equipment column,
          regardless of window width — mirrors how compact mode already
          keeps the hand area clear of that same button, just via padding
          instead of shrinking dock content. */}
      <div className="table-self-dock-wrap" style={{ display: "flex", justifyContent: "center", width: "100%", paddingRight: compact ? 0 : 200 }}>{selfDock}</div>
    </div>
  );
}
