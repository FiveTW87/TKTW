import type { ConnectionStatus, PlayerView } from "@tktw/shared";
import { PlayerTile } from "../PlayerTile";
import { arcPosition, type DensityMode } from "../../lib/seatLayout";
import { useDeviceMode } from "../../lib/useDeviceMode";

// SPEC §11.3 — absolute-positions a single opponent on the arc above the
// central zone. Pure positioning wrapper; all content rendering stays in
// PlayerTile so hidden-information / hand-count / equipment behavior is
// untouched by the layout change.
export function OpponentPanel({
  player,
  relSeat,
  playerCount,
  density,
  isCurrentTurn,
  targetable,
  selected,
  distance,
  inRange,
  connectionStatus,
  onClick,
  onInspect,
}: {
  player: PlayerView;
  relSeat: number;
  playerCount: number;
  density: DensityMode;
  isCurrentTurn: boolean;
  targetable?: boolean | undefined;
  selected?: boolean | undefined;
  distance?: number | undefined;
  inRange?: boolean | undefined;
  connectionStatus?: ConnectionStatus | undefined;
  onClick?: (() => void) | undefined;
  onInspect?: (() => void) | undefined;
}) {
  const { leftPct, topPct } = arcPosition(relSeat, playerCount);
  const { compact } = useDeviceMode();
  const fullWidth = density === "head" ? 84 : density === "compact" ? 130 : 170;
  return (
    <div
      style={{
        position: "absolute",
        left: `${leftPct}%`,
        top: `${topPct}%`,
        transform: "translate(-50%, -50%)",
        width: compact ? Math.round(fullWidth * 0.7) : fullWidth,
      }}
    >
      <PlayerTile
        player={player}
        isCurrentTurn={isCurrentTurn}
        targetable={targetable}
        selected={selected}
        distance={distance}
        inRange={inRange}
        density={density}
        compact={compact}
        connectionStatus={connectionStatus}
        onClick={onClick}
        onInspect={onInspect}
      />
    </div>
  );
}
