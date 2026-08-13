import { useState } from "react";
import type { Card, PlayerView, ConnectionStatus } from "@tktw/shared";
import { generalDisplay, factionColor, factionLabel } from "../data/generalNames";
import { cardDisplay, cardInfo } from "../data/cardNames";
import { CardTooltip } from "./HandCard";
import { roleDisplay } from "../data/roles";
import { DelayedTrickList } from "./board/DelayedTrickCard";
import { GeneralPortrait } from "./GeneralPortrait";
import { FactionBadge } from "./FactionBadge";

// A recognizable icon per equipment slot — clearer at a glance than the card's
// Chinese glyph (and the two horse slots share 馬, so this also tells − from +).
const SLOT_ICON: Record<string, string> = {
  weapon: "⚔️",
  armor: "🛡️",
  horseMinus: "🐎−",
  horsePlus: "🐎+",
};

export function PlayerTile({
  player,
  isCurrentTurn,
  targetable,
  selected,
  distance,
  inRange,
  compact,
  density,
  connectionStatus,
  onClick,
  onInspect,
}: {
  player: PlayerView;
  isCurrentTurn: boolean;
  targetable?: boolean | undefined;
  selected?: boolean | undefined;
  /** สังหาร reach from the viewer to this player (undefined = don't show). */
  distance?: number | undefined;
  /** True if within the viewer's current weapon range. */
  inRange?: boolean | undefined;
  /** Narrow layout (mobile) — tighter min width. */
  compact?: boolean;
  /** SPEC §11.3 density mode from playerCount — "head" shrinks to a portrait
   *  chip for 9–10 players. Falls back to `compact`/full when omitted. */
  density?: "medium" | "compact" | "head";
  /** Socket connection status of this seat (from RoomState). */
  connectionStatus?: ConnectionStatus | undefined;
  onClick?: (() => void) | undefined;
  onInspect?: (() => void) | undefined;
}) {
  const d = generalDisplay(player.generalId);
  const color = factionColor(player.faction);
  const handCount = Array.isArray(player.hand) ? player.hand.length : player.hand.count;
  const equipEntries = Object.entries(player.equipment).filter(([, c]) => c) as [string, Card][];
  // projectFor only includes a hidden role for its owner. If role is present
  // here, it is therefore safe to render (public lord/dead roles are included too).
  const role = roleDisplay(player.role);
  const fullFactionLabel = factionLabel(player.faction);
  const shortFactionLabel = player.faction === "qun" ? "อิสระ" : fullFactionLabel;
  const isHead = density === "head";
  const isCompact = compact || density === "compact";

  if (isHead) {
    const headPortrait = compact ? 30 : 40;
    return (
      <div
        className="table-player-tile table-player-tile-head"
        data-player-anchor={player.id}
        onClick={targetable ? onClick : undefined}
        role={targetable ? "button" : undefined}
        aria-label={targetable ? player.name : undefined}
        style={{
          position: "relative",
          width: "100%",
          background: "linear-gradient(#241a11,#180f09)",
          border: "1px solid var(--panel-border-2)",
          borderRadius: 6,
          overflow: "hidden",
          boxShadow: "0 4px 12px rgba(0,0,0,.5)",
          opacity: player.alive ? 1 : 0.6,
          cursor: targetable ? "pointer" : "default",
          textAlign: "center",
        }}
      >
        <div aria-label={`ฝ่าย${fullFactionLabel}`} style={{ height: compact ? 14 : 18, background: color, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
          {role && <span className={`seal ${role.cls}`} title={role.name} style={{ width: 12, height: 12, fontSize: 8 }}>{role.cn}</span>}
          <span style={{ fontSize: compact ? 7 : 8.5, fontWeight: 800, color: "rgba(255,255,255,.95)", textShadow: "0 1px 2px rgba(0,0,0,.55)" }}>{shortFactionLabel}</span>
        </div>
        <div className="card-back" style={{ width: headPortrait, height: headPortrait, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: compact ? "4px auto 2px" : "6px auto 4px", overflow: "hidden" }}>
          <GeneralPortrait generalId={player.generalId} faction={player.faction} />
        </div>
        <div style={{ fontSize: compact ? 9 : 10, fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "0 4px" }}>{player.name}</div>
        <div style={{ display: "flex", gap: 1, justifyContent: "center", margin: compact ? "2px 0 4px" : "3px 0 6px", flexWrap: "wrap" }}>
          {Array.from({ length: player.maxHp }).map((_, i) => (
            <span key={i} className="hp-dot" style={{ width: 6, height: 6, background: i < player.hp ? "radial-gradient(circle at 40% 35%, var(--hp-green-light), var(--hp-green))" : "transparent" }} />
          ))}
        </div>
        {isCurrentTurn && <div className="glow-turn" />}
        {targetable && <div className={selected ? "glow-target-selected" : "glow-target"} />}
        {targetable && selected && (
          <div aria-label="เลือกแล้ว" style={{ position: "absolute", top: 2, right: 2, zIndex: 2, width: 12, height: 12, borderRadius: "50%", background: "var(--gold)", color: "#2e1f08", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 900, boxShadow: "0 1px 3px rgba(0,0,0,.5)" }}>
            ✓
          </div>
        )}
        {onInspect && (
          <button
            onClick={(e) => { e.stopPropagation(); onInspect(); }}
            title="ดูอุปกรณ์/รายละเอียด"
            style={{ position: "absolute", bottom: 2, right: 2, zIndex: 3, width: 16, height: 16, borderRadius: "50%", background: "rgba(20,14,9,.85)", border: "1px solid var(--panel-border-2)", cursor: "pointer", fontSize: 8, lineHeight: 1, padding: 0 }}
          >
            🔍
          </button>
        )}
        {!player.alive && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(12,8,5,.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--font-glyph-2)", fontSize: 12, color: "#e0917a", fontWeight: 900 }}>陣亡</span>
          </div>
        )}
      </div>
    );
  }

  // SeatTile.dc.html composition: portrait (seat-number badge) + info column
  // + a faction ribbon on the right edge, all inside one bordered box; delayed
  // tricks render as separate purple cards BESIDE the box, not chips inside it.
  const boxW = isCompact ? 168 : 208;
  const portW = isCompact ? 52 : 62;
  const portH = isCompact ? 60 : 72;

  return (
    <div className="table-player-cluster" style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: 6 }}>
      <div
        className={`table-player-tile${inRange === false && player.alive ? " table-player-out-of-range" : ""}`}
        data-player-anchor={player.id}
        onClick={targetable ? onClick : undefined}
        role={targetable ? "button" : undefined}
        aria-label={targetable ? player.name : undefined}
        style={{
          position: "relative",
          width: boxW,
          flexShrink: 0,
          background: "linear-gradient(#241a11,#180f09)",
          border: "1px solid var(--panel-border-2)",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 6px 16px rgba(0,0,0,.5)",
          opacity: player.alive ? 1 : 0.6,
          cursor: targetable ? "pointer" : "default",
          padding: 8,
          display: "flex",
          gap: 8,
        }}
      >
        {isCurrentTurn && <div className="glow-turn" style={{ borderRadius: 12 }} />}

        {/* portrait, with the seat number badge (SeatTile's seatBadgeBg/Fg) */}
        <div
          className="card-back table-player-portrait"
          style={{
            width: portW,
            height: portH,
            borderRadius: 8,
            overflow: "hidden",
            border: "2px solid var(--panel-border-2)",
            flexShrink: 0,
            position: "relative",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <GeneralPortrait generalId={player.generalId} faction={player.faction} />
          <span
            style={{
              position: "absolute",
              top: 3,
              left: 3,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "rgba(20,14,9,.85)",
              color: "var(--gold-light)",
              fontFamily: "var(--font-glyph-2)",
              fontWeight: 900,
              fontSize: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,.5)",
            }}
          >
            {player.seat + 1}
          </span>
        </div>

        {/* info column */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", paddingTop: 2, paddingRight: isCompact ? 34 : 44 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</span>
            <span style={{ fontSize: 10.5, color: "var(--ink-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{player.name}</span>
            {role ? <span className={`seal ${role.cls}`} title={role.name} style={{ width: 14, height: 14, fontSize: 8, flexShrink: 0 }}>{role.cn}</span> : <span className="seal seal-unknown" style={{ width: 14, height: 14, fontSize: 8, flexShrink: 0 }}>?</span>}
          </div>
          {connectionStatus === "reconnecting" && (
            <div style={{ fontSize: 9, color: "var(--gold)", whiteSpace: "nowrap" }}>🔌 กำลังเชื่อมต่อกลับ...</div>
          )}
          {connectionStatus === "gone" && (
            <div style={{ fontSize: 9, color: "var(--target-red)", whiteSpace: "nowrap" }}>⚠ เสียชีวิต (หลุดการเชื่อมต่อ)</div>
          )}
          <div style={{ display: "flex", gap: 3, marginTop: 6, flexWrap: "wrap" }}>
            {Array.from({ length: player.maxHp }).map((_, i) => (
              <span
                key={i}
                className="hp-dot"
                style={{ width: 9, height: 9, background: i < player.hp ? "radial-gradient(circle at 40% 35%, var(--hp-green-light), var(--hp-green))" : "transparent" }}
              />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "auto", paddingTop: 6, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--ink-muted)" }}>
              <span style={{ width: 9, height: 12, borderRadius: 2, background: "linear-gradient(var(--gold-deep),var(--gold-bronze))", display: "inline-block" }} />
              {handCount}
            </span>
            {equipEntries.map(([slot, card]) => (
              <EquipChip key={slot} slot={slot} card={card} />
            ))}
          </div>
        </div>

        <FactionBadge faction={player.faction} compact={isCompact} />

        {inRange === false && player.alive && <div className="table-range-fog" aria-label="อยู่นอกระยะ" />}

        {distance !== undefined && player.alive && (
          <span
            title={inRange ? "อยู่ในระยะโจมตีของคุณ" : "เกินระยะโจมตีปกติ"}
            style={{
              position: "absolute",
              bottom: 5,
              left: 5,
              zIndex: 3,
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
              fontSize: 10,
              fontWeight: 700,
              lineHeight: 1,
              padding: "2px 6px",
              borderRadius: 8,
              background: inRange ? "rgba(60,125,82,.92)" : "rgba(60,44,24,.75)",
              color: "#f6ecd2",
            }}
          >
            ⟷ {distance}
          </span>
        )}

        {targetable && <div className={selected ? "glow-target-selected" : "glow-target"} style={{ borderRadius: 12 }} />}
        {targetable && selected && (
          <div
            aria-label="เลือกแล้ว"
            style={{
              position: "absolute",
              top: isCompact ? 28 : 31,
              right: 7,
              zIndex: 2,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "var(--gold)",
              color: "#2e1f08",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 900,
              boxShadow: "0 1px 4px rgba(0,0,0,.5)",
            }}
          >
            ✓
          </div>
        )}
        {onInspect && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInspect();
            }}
            title="ดูอุปกรณ์/รายละเอียด"
            style={{
              position: "absolute",
              bottom: 5,
              right: 7,
              zIndex: 3,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "rgba(20,14,9,.85)",
              border: "1px solid var(--panel-border-2)",
              cursor: "pointer",
              fontSize: 10,
              lineHeight: 1,
              color: "var(--ink-muted)",
              padding: 0,
            }}
          >
            🔍
          </button>
        )}
        {!player.alive && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(12,8,5,.65)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontFamily: "var(--font-glyph-2)", fontSize: 22, color: "#e0917a", fontWeight: 900 }}>陣亡</span>
            {roleDisplay(player.role) && <span style={{ fontSize: 11, color: "#f0e4cc", fontWeight: 700 }}>{roleDisplay(player.role)!.name}</span>}
          </div>
        )}
      </div>

      <DelayedTrickList cards={player.judgmentZone} />
    </div>
  );
}

// One equipped item on an opponent's tile: a slot icon, with a hover tooltip
// naming the actual card and what it does.
function EquipChip({ slot, card }: { slot: string; card: Card }) {
  const [hovered, setHovered] = useState(false);
  const info = cardInfo(card.typeKey);
  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={cardDisplay(card.typeKey).name}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: 16,
        padding: "0 3px",
        borderRadius: 3,
        background: "#2a2016",
        border: "1px solid var(--panel-border-3)",
        fontSize: 10,
        lineHeight: 1,
        cursor: "help",
      }}
    >
      {SLOT_ICON[slot] ?? cardDisplay(card.typeKey).glyph}
      {hovered && info && <CardTooltip name={cardDisplay(card.typeKey).name} info={info} />}
    </span>
  );
}
