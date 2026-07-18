import type { PlayerView } from "@tktw/shared";
import { ModalOverlay } from "./Modal";
import { generalDisplay, factionColor, factionLabel } from "../data/generalNames";
import { cardDisplay } from "../data/cardNames";

export function InspectModal({ player, onClose }: { player: PlayerView; onClose: () => void }) {
  const d = generalDisplay(player.generalId);
  const color = factionColor(player.faction);
  const handCount = Array.isArray(player.hand) ? player.hand.length : player.hand.count;
  const equipEntries = Object.entries(player.equipment).filter(([, c]) => c);

  return (
    <ModalOverlay onClose={onClose}>
      <div
        className="anim-pop"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 360,
          maxWidth: "90vw",
          background: "radial-gradient(120% 90% at 50% 0%, #f7f0dc, #efe3c6)",
          border: `2px solid ${color}`,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 22px 60px rgba(40,25,10,.55)",
        }}
      >
        <div style={{ height: 38, background: color, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff", fontWeight: 700, fontSize: 16 }}>
            <span style={{ fontFamily: "var(--font-glyph)", fontSize: 20 }}>{d.glyph}</span>
            {player.name}
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,.9)" }}>
            {player.roleRevealed && player.role ? player.role : "?"}
          </span>
        </div>
        <div style={{ padding: "18px 20px" }}>
          <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 12 }}>
            {d.name} · {factionLabel(player.faction)}
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1, background: "var(--panel-bg)", border: "1px solid var(--panel-border)", borderRadius: 7, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--red)" }}>{handCount}</div>
              <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>การ์ดในมือ (คว่ำ)</div>
            </div>
            <div style={{ flex: 1, background: "var(--panel-bg)", border: "1px solid var(--panel-border)", borderRadius: 7, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>
                {player.hp}/{player.maxHp}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>พลังชีวิต</div>
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 7 }}>เขตอุปกรณ์</div>
          {equipEntries.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {equipEntries.map(([slot, card]) => (
                <div
                  key={slot}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    background: "var(--panel-bg)",
                    border: "1px solid var(--panel-border)",
                    borderRadius: 6,
                    padding: "7px 10px",
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      background: "var(--red)",
                      color: "#f6ecd2",
                      fontFamily: "var(--font-glyph-2)",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {cardDisplay(card!.typeKey).glyph}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                    {cardDisplay(card!.typeKey).name}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--ink-faint)", fontStyle: "italic", background: "var(--panel-bg)", border: "1px dashed var(--panel-border)", borderRadius: 6, padding: 9, textAlign: "center" }}>
              ไม่มีอุปกรณ์
            </div>
          )}

          {player.judgmentZone.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", margin: "12px 0 7px" }}>เขตไพ่ตัดสิน</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {player.judgmentZone.map((c) => (
                  <span
                    key={c.id}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 12,
                      background: "var(--target-red)",
                      color: "#f6ecd2",
                      borderRadius: 5,
                      padding: "4px 9px",
                    }}
                  >
                    <b>{cardDisplay(c.typeKey).glyph}</b>
                    {cardDisplay(c.typeKey).name}
                  </span>
                ))}
              </div>
            </>
          )}

          <button
            onClick={onClose}
            style={{
              width: "100%",
              marginTop: 16,
              background: "var(--card-bg-2)",
              color: "var(--ink-muted)",
              border: "1px solid var(--panel-border-2)",
              borderRadius: 6,
              padding: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ปิด
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
