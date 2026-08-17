import type { ReactNode } from "react";
import type { GameView, PlayerView } from "@tktw/shared";
import { OpponentPanel } from "./OpponentPanel";
import { CentralZone } from "./CentralZone";
import { TurnPanel } from "./TurnPanel";
import { relativeSeat, densityMode, tableRingPosition, orderByRelativeSeat } from "../../lib/seatLayout";
import { generalDisplay } from "../../data/generalNames";
import { useDeviceMode } from "../../lib/useDeviceMode";
import { PlayerTile } from "../PlayerTile";
import { GeneralPortrait } from "../GeneralPortrait";
import { useCountdown } from "../../lib/useCountdown";

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
  const mobileRemaining = useCountdown(gameView.pendingDecision?.expiresAt, gameView.serverNow);
  const orderedOthers = orderByRelativeSeat(others, me.seat, playerCount);
  const ringMinHeight = compact
    ? density === "head" ? 130 : density === "compact" ? 145 : 160
    : density === "head" ? 380 : density === "compact" ? 420 : 460;

  if (compact) {
    const focusedId = selectedTargetIds[0] ?? currentTurnPlayerId;
    const focused = orderedOthers.find((p) => p.id === focusedId) ?? orderedOthers[0];
    const focusedDistance = focused ? attackDistanceFor(focused) : null;
    const focusedInRange = focusedDistance === null || focusedDistance <= weaponRangeSelf;
    return (
      <div className={`mobile-landscape-board mobile-player-count-${playerCount}`}>
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

        <div className="mobile-opponent-rail" aria-label="ผู้เล่นอื่นตามลำดับที่นั่ง">
          {orderedOthers.map((p) => {
            const dist = attackDistanceFor(p);
            return (
              <div className="mobile-opponent-seat" key={p.id}>
                <PlayerTile
                  player={p}
                  isCurrentTurn={currentTurnPlayerId === p.id}
                  targetable={targetableFor(p)}
                  selected={selectedTargetIds.includes(p.id)}
                  distance={dist}
                  inRange={dist <= weaponRangeSelf}
                  density="head"
                  compact
                  connectionStatus={p.connectionStatus}
                  onClick={() => onTapTarget(p.id)}
                  onInspect={() => onInspect(p)}
                />
              </div>
            );
          })}
        </div>

        <section className="mobile-battle-arena">
          {focused && (
            <button
              className={`mobile-focus-card${selectedTargetIds.includes(focused.id) ? " is-selected" : ""}${!focusedInRange && focused.alive ? " table-player-out-of-range" : ""}`}
              data-player-anchor={focused.id}
              onClick={() => onTapTarget(focused.id)}
            >
              <GeneralPortrait generalId={focused.generalId} faction={focused.faction} />
              <span className="mobile-focus-shade" />
              <span className="mobile-focus-info">
                <small>{selectedTargetIds.includes(focused.id) ? "เป้าหมายที่เลือก" : currentTurnPlayerId === focused.id ? "ผู้เล่นปัจจุบัน" : "ผู้เล่น"}</small>
                <b>{generalDisplay(focused.generalId).name}</b>
                <em>{focused.name} · ไพ่ {Array.isArray(focused.hand) ? focused.hand.length : focused.hand.count} ใบ</em>
                <span className="mobile-focus-hp">
                  {Array.from({ length: focused.maxHp }, (_, i) => <i key={i} className={i < focused.hp ? "on" : ""} />)}
                </span>
              </span>
              <span
                className="mobile-focus-inspect"
                role="button"
                tabIndex={0}
                aria-label={`ดูรายละเอียด ${generalDisplay(focused.generalId).name}`}
                onClick={(event) => { event.stopPropagation(); onInspect(focused); }}
              >⤢</span>
              {!focusedInRange && focused.alive && <span className="table-range-fog" aria-label="อยู่นอกระยะ" />}
            </button>
          )}

          <div className="mobile-order-copy">
            <div className="mobile-order-heading">
              <small>{responderLabel ? "กำลังรอการตอบโต้" : "คำสั่งปัจจุบัน"}</small>
              {mobileRemaining !== null && (
                <span className={mobileRemaining <= 5 ? "is-urgent" : ""} aria-label={`เหลือเวลา ${mobileRemaining} วินาที`}>
                  {mobileRemaining}
                </span>
              )}
            </div>
            <b>{actionPrompt ?? responderLabel ?? (selectedTargetIds.length ? `เลือกแล้ว ${selectedTargetIds.length} เป้าหมาย` : "เลือกการ์ดเพื่อเล่น")}</b>
            <span>แตะผู้เล่นด้านบนเพื่อเลือกหรือดูระยะ</span>
          </div>

          <div className="mobile-central-zone">
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
        </section>

        <div className="mobile-command-dock">{selfDock}</div>
      </div>
    );
  }

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
        {orderedOthers.map((p) => {
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

        <div
          className="table-central-anchor"
          style={{
            position: "absolute",
            left: "50%",
            top: compact ? "50%" : "52%",
            transform: `translate(-50%, -50%) scale(${compact ? 0.76 : 0.74})`,
            transformOrigin: "center",
            width: "100%",
            maxWidth: compact ? 210 : 300,
          }}
        >
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
