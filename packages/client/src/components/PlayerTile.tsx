import type { PlayerView } from "@tktw/shared";
import { generalDisplay, factionColor } from "../data/generalNames";
import { cardDisplay } from "../data/cardNames";

const ROLE_SEAL: Record<string, { cn: string; cls: string }> = {
  lord: { cn: "主", cls: "seal-lord" },
  loyalist: { cn: "忠", cls: "seal-loyalist" },
  rebel: { cn: "反", cls: "seal-rebel" },
  traitor: { cn: "内", cls: "seal-traitor" },
};

export function PlayerTile({
  player,
  isCurrentTurn,
  targetable,
  selected,
  distance,
  inRange,
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
  onClick?: () => void;
  onInspect?: () => void;
}) {
  const d = generalDisplay(player.generalId);
  const color = factionColor(player.faction);
  const handCount = Array.isArray(player.hand) ? player.hand.length : player.hand.count;
  const equipEntries = Object.entries(player.equipment).filter(([, c]) => c);
  // Role seal shows only when publicly known (lord, or a revealed/dead player).
  const seal = player.role && (player.roleRevealed || player.role === "lord") ? ROLE_SEAL[player.role] : undefined;

  return (
    <div
      onClick={targetable ? onClick : undefined}
      style={{
        position: "relative",
        flex: 1,
        minWidth: 150,
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
        {seal ? <span className={`seal ${seal.cls}`}>{seal.cn}</span> : <span className="seal seal-unknown">?</span>}
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
              <span
                key={slot}
                title={cardDisplay(card!.typeKey).name}
                style={{
                  width: 15,
                  height: 15,
                  borderRadius: 2,
                  background: "#efe4c8",
                  border: "1px solid var(--panel-border-2)",
                  fontFamily: "var(--font-glyph-2)",
                  fontSize: 9,
                  color: "#7a5f27",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {cardDisplay(card!.typeKey).glyph}
              </span>
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
          {player.role && <span style={{ fontSize: 10, color: "rgba(246,236,210,.85)" }}>{ROLE_SEAL[player.role]?.cn}</span>}
        </div>
      )}
    </div>
  );
}
