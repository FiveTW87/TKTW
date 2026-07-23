import { useCountdown } from "../../lib/useCountdown";

// SPEC §11.4 — turn/phase/timer, pinned top-center and above any dialog
// (z-index 90 > ModalOverlay's 40) so it's readable even mid-decision.
export function TurnPanel({
  turnNumber,
  phaseLabel,
  currentTurnPlayerName,
  currentTurnGeneralGlyph,
  responderLabel,
  actionPrompt,
  expiresAt,
  serverNow,
}: {
  turnNumber: number;
  phaseLabel: string;
  currentTurnPlayerName?: string | undefined;
  currentTurnGeneralGlyph?: string | undefined;
  /** e.g. "กำลังรอ Nont ใช้ หลบคม" — set when someone else must respond. */
  responderLabel?: string | null | undefined;
  /** Short hint for the viewer's own pending action. */
  actionPrompt?: string | null | undefined;
  expiresAt: number | undefined;
  serverNow: number;
}) {
  const remaining = useCountdown(expiresAt, serverNow);
  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 90,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "radial-gradient(120% 120% at 50% 0%, #fbf5e3, #f1e7ca)",
        border: "1px solid var(--panel-border-2)",
        borderRadius: 12,
        padding: "8px 18px",
        boxShadow: "0 10px 26px rgba(40,25,10,.3), inset 0 0 0 3px rgba(255,255,255,.28), inset 0 0 0 4px rgba(166,129,47,.32)",
        maxWidth: "92vw",
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      {currentTurnGeneralGlyph && (
        <span style={{ fontFamily: "var(--font-glyph)", fontSize: 18, color: "var(--red)" }}>{currentTurnGeneralGlyph}</span>
      )}
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
        เทิร์น {turnNumber} · {currentTurnPlayerName ?? "-"}
      </span>
      <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>{phaseLabel}</span>
      {responderLabel && <span style={{ fontSize: 12, color: "var(--target-red)" }}>{responderLabel}</span>}
      {actionPrompt && <span style={{ fontSize: 12, color: "var(--red)", fontWeight: 600 }}>{actionPrompt}</span>}
      {remaining !== null && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: remaining <= 5 ? "var(--target-red)" : "var(--ink-muted)",
            background: "rgba(0,0,0,.06)",
            borderRadius: 8,
            padding: "2px 8px",
          }}
        >
          เหลือ {remaining} วินาที
        </span>
      )}
    </div>
  );
}
