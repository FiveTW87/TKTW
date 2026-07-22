import { useState } from "react";
import type { Card, PlayerView, ConnectionStatus } from "@tktw/shared";
import { generalDisplay, factionColor } from "../data/generalNames";
import { cardDisplay, cardInfo } from "../data/cardNames";
import { CardTooltip } from "./HandCard";
import { roleDisplay } from "../data/roles";

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
  connectionStatus,
  onClick,
  onInspect,
}: {
  player: PlayerView;
  isCurrentTurn: boolean;
  targetable?: boolean;
  selected?: boolean;
  /** สังหาร reach from the viewer to this player (undefined = don't show). */
  distance?: number;
  /** True if within the viewer's current weapon range. */
  inRange?: boolean;
  /** Narrow layout (mobile) — tighter min width. */
  compact?: boolean;
  /** Socket connection status of this seat (from RoomState). */
  connectionStatus?: ConnectionStatus | undefined;
  onClick?: () => void;
  onInspect?: () => void;
}) {
  const d = generalDisplay(player.generalId);
  const color = factionColor(player.faction);
  const handCount = Array.isArray(player.hand) ? player.hand.length : player.hand.count;
  const equipEntries = Object.entries(player.equipment).filter(([, c]) => c) as [string, Card][];
  // Role seal shows only when publicly known (lord, or a revealed/dead player).
  const role = player.role && (player.roleRevealed || player.role === "lord") ? roleDisplay(player.role) : undefined;

  return (
    <div
      onClick={targetable ? onClick : undefined}
      style={{
        position: "relative",
        flex: 1,
        minWidth: compact ? 118 : 150,
        background: "var(--card-bg-2)",
        border: "1px solid var(--card-border-2)",
        borderRadius: 6,
        overflow: "hidden",
        boxShadow: "0 3px 10px rgba(60,40,15,.14)",
        opacity: player.alive ? 1 : 0.6,
        cursor: targetable ? "pointer" : "default",
      }}
    >
      <div style={{ height: 24, background: color, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 7px" }}>
        <span style={{ fontFamily: "var(--font-glyph)", fontSize: 14, color: "rgba(255,255,255,.92)" }}>{d.glyph}</span>
        {role ? <span className={`seal ${role.cls}`} title={role.name}>{role.cn}</span> : <span className="seal seal-unknown">?</span>}
      </div>
      <div style={{ display: "flex", gap: 8, padding: 8 }}>
        <div
          className="card-back"
          style={{
            width: 44,
            height: 56,
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontFamily: "var(--font-glyph)", fontSize: 17, color: "#5c4a2d" }}>{d.glyph}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {player.name}
          </div>
          <div style={{ fontSize: 10, color: "var(--ink-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</div>
          {connectionStatus === "reconnecting" && (
            <div style={{ fontSize: 9, color: "var(--gold)", whiteSpace: "nowrap" }}>🔌 กำลังเชื่อมต่อกลับ...</div>
          )}
          {connectionStatus === "gone" && (
            <div style={{ fontSize: 9, color: "var(--target-red)", whiteSpace: "nowrap" }}>⚠ เสียชีวิต (หลุดการเชื่อมต่อ)</div>
          )}
          <div style={{ display: "flex", gap: 2, marginTop: 5, flexWrap: "wrap" }}>
            {Array.from({ length: player.maxHp }).map((_, i) => (
              <span
                key={i}
                className="hp-dot"
                style={{ width: 8, height: 8, background: i < player.hp ? "var(--red)" : "transparent" }}
              />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--ink-muted)" }}>
              <span style={{ width: 9, height: 12, borderRadius: 2, background: "linear-gradient(#c0463a,#9a3128)", display: "inline-block" }} />
              {handCount}
            </span>
            {equipEntries.map(([slot, card]) => (
              <EquipChip key={slot} slot={slot} card={card} />
            ))}
          </div>
          {player.judgmentZone.length > 0 && (
            <div style={{ display: "flex", gap: 3, marginTop: 5, flexWrap: "wrap" }}>
              {player.judgmentZone.map((j) => (
                <span key={j.id} style={{ fontSize: 9, background: "#b0442f", color: "#f6ecd2", borderRadius: 2, padding: "1px 4px" }}>
                  {cardDisplay(j.typeKey).glyph}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

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
            background: inRange ? "rgba(60,125,82,.92)" : "rgba(120,90,40,.5)",
            color: "#f6ecd2",
          }}
        >
          ⟷ {distance}
        </span>
      )}

      {isCurrentTurn && <div className="glow-turn" />}
      {targetable && (
        <>
          <div className="glow-target" />
          <div
            style={{
              position: "absolute",
              top: 4,
              left: "50%",
              transform: "translateX(-50%)",
              background: "var(--target-red)",
              color: "#f6ecd2",
              fontSize: 9,
              padding: "1px 8px",
              borderRadius: 10,
              zIndex: 2,
            }}
          >
            {selected ? "เลือกแล้ว" : "เลือก"}
          </div>
        </>
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
            right: 5,
            zIndex: 3,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "rgba(246,236,210,.9)",
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
            background: "rgba(46,37,25,.55)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontFamily: "var(--font-glyph-2)", fontSize: 22, color: "rgba(246,236,210,.9)", fontWeight: 900 }}>陣亡</span>
          {roleDisplay(player.role) && <span style={{ fontSize: 11, color: "rgba(246,236,210,.9)", fontWeight: 700 }}>{roleDisplay(player.role)!.name}</span>}
        </div>
      )}
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
        background: "#efe4c8",
        border: "1px solid var(--panel-border-2)",
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
