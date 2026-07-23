import { useGameStore } from "../store/gameStore";
import { roleDisplay } from "../data/roles";
import { generalDisplay, generalFaction, factionColor, factionLabel } from "../data/generalNames";
import type { MatchResult } from "@tktw/shared";

// SPEC 8.4: functional result screen — every Role/General revealed, winner
// or no-winner, end reason, turn count, duration, death order, and the
// most-kills/most-damage-taken leaders (with ties shown together). Visual
// polish/animation/final layout is Phase 7; this just needs to be correct.
function fmtDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m} นาที ${s} วินาที`;
}

function nameFor(result: MatchResult, playerId: string): string {
  return result.players.find((p) => p.id === playerId)?.name ?? playerId;
}

export function Result() {
  const result = useGameStore((s) => s.matchResult);
  const gameView = useGameStore((s) => s.gameView);
  const returnToLobby = useGameStore((s) => s.returnToLobby);
  const leaveRoom = useGameStore((s) => s.leaveRoom);

  if (!result) return null;

  const myId = gameView?.viewerPlayerId;
  const myRole = myId ? result.players.find((p) => p.id === myId)?.role : undefined;
  const noWinner = result.endReason === "no_winner";
  const won = !noWinner && myRole ? result.winners.includes(myRole) : false;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="panel-plain anim-pop" style={{ width: 640, maxWidth: "100%", padding: "36px 40px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              margin: "0 auto 12px",
              background: "radial-gradient(circle at 38% 34%, #c0463a, #8f2a22)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #f2e7cf",
            }}
          >
            <span style={{ fontFamily: "var(--font-glyph)", fontSize: 36, color: "#f6ecd2" }}>{won ? "勝" : "終"}</span>
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--red)" }}>
            {noWinner ? "เกมยุติ — ไม่มีผู้ชนะ" : won ? "ชัยชนะ!" : "จบเกม"}
          </div>
          <div style={{ marginTop: 6, color: "var(--ink-muted)", fontSize: 13 }}>
            {noWinner ? "เจ้าเมืองหลุดการเชื่อมต่อหรือออกจากเกม" : `ฝ่ายชนะ: ${result.winners.map((r) => roleDisplay(r)?.name ?? r).join(", ")}`}
          </div>
          <div style={{ marginTop: 4, color: "var(--ink-faint)", fontSize: 12 }}>
            เทิร์นที่ {result.turnNumber} · ใช้เวลา {fmtDuration(result.durationMs)}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          {result.players.map((p) => {
            const role = roleDisplay(p.role);
            const general = generalDisplay(p.generalId);
            const faction = generalFaction(p.generalId);
            const isWinner = !noWinner && result.winners.includes(p.role);
            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: isWinner ? "rgba(217,165,49,.15)" : "var(--panel-bg-2)",
                  border: `1px solid ${isWinner ? "var(--gold)" : "var(--panel-border)"}`,
                  opacity: p.alive ? 1 : 0.6,
                }}
              >
                <span style={{ fontFamily: "var(--font-glyph)", fontSize: 18, color: factionColor(faction) }}>
                  {general.glyph}
                </span>
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", minWidth: 90 }}>{p.name}</span>
                <span style={{ fontSize: 12.5, color: "var(--ink-muted)" }}>
                  {role?.name ?? p.role} · {general.name} ({factionLabel(faction)})
                </span>
                {!p.alive && <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-faint)" }}>เสียชีวิต</span>}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginBottom: 22, fontSize: 13 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "var(--ink-faint)", fontSize: 11 }}>สังหารมากที่สุด</div>
            <div style={{ color: "var(--ink)", fontWeight: 700 }}>
              {result.mostKills.length ? result.mostKills.map((id) => nameFor(result, id)).join(", ") : "—"}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "var(--ink-faint)", fontSize: 11 }}>รับความเสียหายมากที่สุด</div>
            <div style={{ color: "var(--ink)", fontWeight: 700 }}>
              {result.mostDamageTaken.length ? result.mostDamageTaken.map((id) => nameFor(result, id)).join(", ") : "—"}
            </div>
          </div>
        </div>

        {result.deathOrder.length > 0 && (
          <div style={{ fontSize: 12.5, color: "var(--ink-muted)", textAlign: "center", marginBottom: 22 }}>
            ลำดับการเสียชีวิต: {result.deathOrder.map((id) => nameFor(result, id)).join(" → ")}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={() => void returnToLobby()} className="btn-primary" style={{ padding: "13px 32px", fontSize: 15 }}>
            กลับห้องเพื่อเล่นต่อ
          </button>
          <button onClick={() => void leaveRoom()} className="btn-secondary" style={{ padding: "13px 26px", fontSize: 15 }}>
            ออกจากห้อง
          </button>
        </div>
      </div>
    </div>
  );
}
