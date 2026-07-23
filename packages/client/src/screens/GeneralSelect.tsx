import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import { generalDisplay, generalFaction, factionColor } from "../data/generalNames";
import { generalSkills } from "../data/generalSkills";

export function GeneralSelect() {
  const gameView = useGameStore((s) => s.gameView);
  const answer = useGameStore((s) => s.answer);
  const error = useGameStore((s) => s.error);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pending = gameView?.pendingDecision;
  if (!gameView || !pending) return null;

  const isMine = pending.playerId === gameView.viewerPlayerId;
  const options = (pending.data.options as string[] | undefined) ?? [];
  const me = gameView.players.find((p) => p.id === gameView.viewerPlayerId);
  const isLord = me?.role === "lord";
  const waitingName = gameView.players.find((p) => p.id === pending.playerId)?.name ?? pending.playerId;

  const confirm = async (choice: string | null) => {
    setBusy(true);
    await answer(choice ? { decisionId: pending.id, choice } : { decisionId: pending.id, pass: true });
    setSelected(null);
    setBusy(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="panel-plain anim-fade" style={{ width: 1040, maxWidth: "100%", padding: "36px 40px 40px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--ink)", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "var(--font-glyph)", color: "var(--red)", fontSize: 32 }}>將</span>
            {isMine ? "เลือกนายพลของคุณ" : `รอ ${waitingName} เลือกนายพล...`}
          </div>
          {isMine && isLord && (
            <div style={{ fontSize: 13, color: "var(--red)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "var(--font-glyph)", fontSize: 18 }}>主</span>
              คุณคือเจ้าเมือง — พลังชีวิต +1
            </div>
          )}
        </div>

        {isMine && (
          <div style={{ fontSize: 13, color: "var(--ink-faint)", marginBottom: 20 }}>
            แตะการ์ดเพื่อเลือก ดูสกิลได้บนการ์ด แล้วกดยืนยัน — หรือ "สุ่มให้เลย"
          </div>
        )}

        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", opacity: isMine ? 1 : 0.6 }}>
          {options.map((generalId) => {
            const d = generalDisplay(generalId);
            const color = factionColor(generalFaction(generalId));
            const skills = generalSkills(generalId);
            const isSelected = selected === generalId;
            return (
              <div
                key={generalId}
                onClick={isMine ? () => setSelected(generalId) : undefined}
                style={{
                  width: 196,
                  borderRadius: 9,
                  background: "linear-gradient(#f9f2db,#f1e7ca)",
                  border: `2px solid ${isSelected ? "var(--gold)" : "var(--card-border-2)"}`,
                  boxShadow: isSelected ? "0 0 16px rgba(217,165,49,.55)" : "0 4px 10px rgba(60,40,15,.15)",
                  overflow: "hidden",
                  cursor: isMine ? "pointer" : "default",
                  position: "relative",
                  transition: "transform .12s, box-shadow .12s",
                  transform: isSelected ? "translateY(-4px)" : "none",
                }}
              >
                <div style={{ height: 36, background: color, display: "flex", alignItems: "center", gap: 8, padding: "0 11px" }}>
                  <span style={{ fontFamily: "var(--font-glyph)", fontSize: 20, color: "rgba(255,255,255,.95)" }}>{d.glyph}</span>
                  <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{d.name}</span>
                </div>
                <div
                  className="card-back"
                  style={{ height: 92, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid var(--card-border-2)" }}
                >
                  <span style={{ fontFamily: "var(--font-glyph)", fontSize: 52, color: "#5c4a2d" }}>{d.glyph}</span>
                </div>
                <div style={{ padding: 11, minHeight: 92 }}>
                  {skills.map((s) => (
                    <div key={s.id} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontWeight: 700, fontSize: 12.5, color }}>{s.name}</span>
                        {s.lordOnly && <span style={{ fontSize: 9, background: "var(--gold)", color: "#5a3d0a", borderRadius: 6, padding: "0 5px" }}>主公</span>}
                        {s.active && <span style={{ fontSize: 9, background: "var(--red)", color: "#f6ecd2", borderRadius: 6, padding: "0 5px" }}>技</span>}
                      </div>
                      <div style={{ fontSize: 10.5, color: "var(--ink-muted)", lineHeight: 1.35 }}>{s.description}</div>
                    </div>
                  ))}
                </div>
                {isSelected && (
                  <div
                    style={{
                      position: "absolute",
                      top: 44,
                      right: 11,
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "radial-gradient(circle at 38% 34%, #c0463a, #8f2a22)",
                      border: "2px solid #f2e7cf",
                      boxShadow: "0 3px 10px rgba(90,30,20,.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-glyph)", fontSize: 17, color: "#f6ecd2" }}>選</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {isMine && (
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 26 }}>
            <button onClick={() => confirm(selected)} disabled={!selected || busy} className="btn-primary" style={{ padding: "14px 40px", fontSize: 16 }}>
              ยืนยัน
            </button>
            <button onClick={() => confirm(null)} disabled={busy} className="btn-secondary" style={{ padding: "14px 26px", fontSize: 15 }}>
              สุ่มให้เลย
            </button>
          </div>
        )}

        {error && <div style={{ color: "var(--target-red)", fontSize: 13, textAlign: "center", marginTop: 14 }}>{error}</div>}
      </div>
    </div>
  );
}
