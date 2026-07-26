import { useRef } from "react";
import { useCountdown } from "../../lib/useCountdown";
import { useDeviceMode } from "../../lib/useDeviceMode";

// SPEC §11.4 — turn/phase/timer, pinned top-center and above any dialog
// (z-index 90 > ModalOverlay's 40) so it's readable even mid-decision.
// Portrait-card style with a circular countdown ring, per the reference
// mockup — the ring's "full" length is captured from whatever `remaining`
// was the first time a given `expiresAt` was seen, so the drain is accurate
// without the server needing to send a separate total-duration field.
export function TurnPanel({
  turnNumber,
  phaseLabel,
  currentTurnPlayerName,
  currentTurnPlayerSeat,
  currentTurnGeneralGlyph,
  responderLabel,
  actionPrompt,
  expiresAt,
  serverNow,
}: {
  turnNumber: number;
  phaseLabel: string;
  currentTurnPlayerName?: string | undefined;
  currentTurnPlayerSeat?: number | undefined;
  currentTurnGeneralGlyph?: string | undefined;
  /** e.g. "กำลังรอ Nont ใช้ หลบคม" — set when someone else must respond. */
  responderLabel?: string | null | undefined;
  /** Short hint for the viewer's own pending action. */
  actionPrompt?: string | null | undefined;
  expiresAt: number | undefined;
  serverNow: number;
}) {
  const remaining = useCountdown(expiresAt, serverNow);
  const totalRef = useRef<{ key: number; total: number } | null>(null);
  if (expiresAt !== undefined && remaining !== null && totalRef.current?.key !== expiresAt) {
    totalRef.current = { key: expiresAt, total: Math.max(remaining, 1) };
  }
  const total = expiresAt !== undefined ? (totalRef.current?.total ?? remaining ?? 1) : null;
  const pct = total && remaining !== null ? Math.max(0, Math.min(1, remaining / total)) : 1;
  const urgent = remaining !== null && remaining <= 5;
  const { compact } = useDeviceMode();
  const ringSize = compact ? 40 : 60;
  const ringR = compact ? 17 : 26;
  const ringC = 2 * Math.PI * ringR;
  const ringCenter = ringSize / 2;

  return (
    <div
      style={{
        position: "fixed",
        top: "calc(12px + env(safe-area-inset-top, 0px))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 90,
        display: "flex",
        alignItems: "center",
        gap: compact ? 8 : 12,
        background: "linear-gradient(#241811,#180f09)",
        border: "1px solid var(--panel-border-3)",
        borderRadius: 14,
        padding: compact ? "5px 10px 5px 5px" : "8px 16px 8px 8px",
        boxShadow: "0 8px 24px rgba(0,0,0,.5), inset 0 0 0 1px rgba(217,165,49,.1)",
        maxWidth: "94vw",
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      <div className="glow-turn" style={{ borderRadius: 14 }} />

      {/* portrait — same card-back placeholder treatment as every seat tile */}
      <div className="card-back" style={{ position: "relative", width: compact ? 32 : 44, height: compact ? 38 : 52, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--panel-border-2)" }}>
        <span style={{ fontFamily: "var(--font-glyph)", fontSize: compact ? 16 : 22, color: "rgba(240,220,180,.5)" }}>{currentTurnGeneralGlyph ?? "?"}</span>
        {currentTurnPlayerSeat !== undefined && (
          <span style={{ position: "absolute", top: -4, left: -4, width: 16, height: 16, borderRadius: "50%", background: "var(--gold)", color: "#2e1f08", fontFamily: "var(--font-glyph-2)", fontWeight: 900, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(0,0,0,.5)" }}>
            {currentTurnPlayerSeat + 1}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: compact ? 12 : 13, fontWeight: 700, color: "var(--ink)" }}>{currentTurnPlayerName ?? "-"}</span>
          <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>{phaseLabel}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: "var(--ink-faint)", background: "rgba(0,0,0,.3)", borderRadius: 6, padding: "1px 6px" }}>รอบ {turnNumber}</span>
          {responderLabel && <span style={{ fontSize: 11, color: "var(--target-red)" }}>{responderLabel}</span>}
          {actionPrompt && <span style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600 }}>{actionPrompt}</span>}
        </div>
      </div>

      {remaining !== null && (
        <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} style={{ flexShrink: 0 }}>
          <circle cx={ringCenter} cy={ringCenter} r={ringR} fill="rgba(0,0,0,.3)" stroke="rgba(255,255,255,.08)" strokeWidth={5} />
          <circle
            cx={ringCenter}
            cy={ringCenter}
            r={ringR}
            fill="none"
            stroke={urgent ? "var(--target-red)" : "var(--green)"}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={ringC}
            strokeDashoffset={ringC * (1 - pct)}
            transform={`rotate(-90 ${ringCenter} ${ringCenter})`}
            style={{ transition: "stroke-dashoffset .3s linear" }}
          />
          <text x={ringCenter} y={ringCenter + 4} textAnchor="middle" fontSize={compact ? 12 : 16} fontWeight={900} fill={urgent ? "var(--target-red)" : "var(--ink)"}>
            {remaining}
          </text>
        </svg>
      )}
    </div>
  );
}
