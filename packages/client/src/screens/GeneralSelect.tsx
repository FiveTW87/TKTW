import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import { generalDisplay, generalFaction, factionColor } from "../data/generalNames";
import { generalSkills } from "../data/generalSkills";
import { useCountdown } from "../lib/useCountdown";
import { useDeviceMode } from "../lib/useDeviceMode";
import { GeneralPortrait } from "../components/GeneralPortrait";

export function GeneralSelect() {
  const gameView = useGameStore((s) => s.gameView);
  const answer = useGameStore((s) => s.answer);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pending = gameView?.pendingDecision;
  // Hooks must run unconditionally — compute the countdown before any early
  // return below (SPEC §7.3's "Timer" requirement for the selector's screen).
  const remaining = useCountdown(pending?.expiresAt, gameView?.serverNow ?? 0);
  const { compact } = useDeviceMode();
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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: compact ? 10 : 24, overflowY: "auto" }}>
      <div className="panel-plain anim-fade" style={{ width: 1040, maxWidth: "100%", maxHeight: compact ? "96vh" : undefined, overflowY: compact ? "auto" : undefined, padding: compact ? "16px 14px 18px" : "36px 40px 40px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: compact ? 3 : 6, flexWrap: "wrap", gap: 6 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: compact ? 16 : 26, color: "var(--ink)", display: "flex", alignItems: "center", gap: compact ? 6 : 10 }}>
            <span style={{ fontFamily: "var(--font-glyph)", color: "var(--red)", fontSize: compact ? 19 : 32 }}>將</span>
            {isMine ? "เลือกนายพลของคุณ" : `รอ ${waitingName} เลือกนายพล...`}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: compact ? 8 : 14 }}>
            {isMine && isLord && (
              <div style={{ fontSize: compact ? 10.5 : 13, color: "var(--red)", display: "flex", alignItems: "center", gap: compact ? 4 : 8 }}>
                <span style={{ fontFamily: "var(--font-glyph)", fontSize: compact ? 13 : 18 }}>主</span>
                คุณคือเจ้าเมือง — พลังชีวิต +1
              </div>
            )}
            {remaining !== null && (
              <span
                style={{
                  fontSize: compact ? 10.5 : 13,
                  fontWeight: 700,
                  color: remaining <= 5 ? "var(--target-red)" : "var(--ink-muted)",
                  background: "rgba(0,0,0,.3)",
                  borderRadius: 8,
                  padding: "3px 10px",
                }}
              >
                เหลือ {remaining} วินาที
              </span>
            )}
          </div>
        </div>

        {isMine && (
          <div style={{ fontSize: compact ? 10.5 : 13, color: "var(--ink-faint)", marginBottom: compact ? 10 : 20 }}>
            แตะการ์ดเพื่อเลือก ดูสกิลได้บนการ์ด แล้วกดยืนยัน — หรือ "สุ่มให้เลย"
          </div>
        )}

        <div style={{ display: "flex", gap: compact ? 8 : 14, justifyContent: "center", alignItems: "flex-start", flexWrap: "wrap", opacity: isMine ? 1 : 0.6 }}>
          {options.map((generalId) => {
            const d = generalDisplay(generalId);
            const faction = generalFaction(generalId);
            const color = factionColor(faction);
            const skills = generalSkills(generalId);
            const isSelected = selected === generalId;
            // Effective HP the player actually gets, not the printed base
            // stat — includes the lord's +1 (already called out separately
            // by the "เจ้าเมือง — พลังชีวิต +1" banner above).
            const effectiveHp = d.maxHp + (isLord ? 1 : 0);
            return (
              <div
                key={generalId}
                onClick={isMine ? () => setSelected(generalId) : undefined}
                style={{
                  width: compact ? 130 : 196,
                  borderRadius: 9,
                  background: "linear-gradient(#241a11,#160f09)",
                  border: `2px solid ${isSelected ? "var(--gold)" : "var(--panel-border-2)"}`,
                  boxShadow: isSelected ? "0 0 16px rgba(217,165,49,.55)" : "0 4px 10px rgba(0,0,0,.4)",
                  overflow: "hidden",
                  cursor: isMine ? "pointer" : "default",
                  position: "relative",
                  transition: "transform .12s, box-shadow .12s",
                  transform: isSelected ? "translateY(-4px)" : "none",
                }}
              >
                <div style={{ height: compact ? 26 : 36, background: color, display: "flex", alignItems: "center", gap: compact ? 5 : 8, padding: compact ? "0 8px" : "0 11px" }}>
                  <span style={{ fontFamily: "var(--font-glyph)", fontSize: compact ? 13 : 20, color: "rgba(255,255,255,.95)" }}>{d.glyph}</span>
                  <span style={{ color: "#fff", fontWeight: 700, fontSize: compact ? 11.5 : 15, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    {Array.from({ length: effectiveHp }).map((_, i) => (
                      <span key={i} className="hp-dot" style={{ width: compact ? 6 : 8, height: compact ? 6 : 8, background: "radial-gradient(circle at 40% 35%, var(--hp-green-light), var(--hp-green))" }} />
                    ))}
                  </div>
                </div>
                <GeneralPortrait
                  generalId={generalId}
                  faction={faction}
                  style={{
                    height: compact ? 72 : 118,
                    borderBottom: "1px solid var(--card-border-2)",
                  }}
                />
                <div className="general-select-card-skills" style={{ padding: compact ? 7 : 11 }}>
                  {skills.map((s) => (
                    <div className="general-select-card-skill" key={s.id} style={{ marginBottom: compact ? 5 : 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontWeight: 700, fontSize: compact ? 10.5 : 12.5, color }}>{s.name}</span>
                        {s.lordOnly && <span style={{ fontSize: 8, background: "var(--gold)", color: "#3a2708", borderRadius: 6, padding: "0 5px" }}>主公</span>}
                        {s.active && <span style={{ fontSize: 8, background: "var(--red)", color: "#f6ecd2", borderRadius: 6, padding: "0 5px" }}>技</span>}
                      </div>
                      <div style={{ fontSize: compact ? 9 : 10.5, color: "var(--ink-muted)", lineHeight: 1.3 }}>{s.description}</div>
                    </div>
                  ))}
                </div>
                {isSelected && (
                  <div
                    style={{
                      position: "absolute",
                      top: compact ? 32 : 44,
                      right: compact ? 8 : 11,
                      width: compact ? 26 : 36,
                      height: compact ? 26 : 36,
                      borderRadius: "50%",
                      background: "radial-gradient(circle at 38% 34%, var(--gold-deep), var(--gold-bronze))",
                      border: "2px solid var(--gold-light)",
                      boxShadow: "0 3px 10px rgba(0,0,0,.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-glyph)", fontSize: compact ? 12 : 17, color: "#2e1f08" }}>選</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {isMine && (
          <div style={{ display: "flex", gap: compact ? 8 : 12, justifyContent: "center", marginTop: compact ? 14 : 26 }}>
            <button onClick={() => confirm(selected)} disabled={!selected || busy} className="btn-primary" style={{ padding: compact ? "9px 26px" : "14px 40px", fontSize: compact ? 12.5 : 16 }}>
              ยืนยัน
            </button>
            <button onClick={() => confirm(null)} disabled={busy} className="btn-secondary" style={{ padding: compact ? "9px 18px" : "14px 26px", fontSize: compact ? 11.5 : 15 }}>
              สุ่มให้เลย
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
