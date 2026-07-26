import { requestLandscape } from "../lib/requestLandscape";

// SPEC §12.1 — Character Select / the Table screen require landscape; a
// phone still held in portrait sees this instead (interaction underneath is
// blocked since this sits on top, but the real screen stays mounted so its
// state isn't lost — same pattern as App.tsx's ReconnectingOverlay).
export function RotateOverlay() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(10,7,4,.96)",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div>
        <div style={{ fontSize: 46, marginBottom: 14 }}>📱↻</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--ink)", marginBottom: 8 }}>
          กรุณาหมุนอุปกรณ์เป็นแนวนอน
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.6, marginBottom: 20 }}>
          เกมนี้ออกแบบมาสำหรับการเล่นในแนวนอน
        </div>
        <button className="btn-secondary" style={{ padding: "9px 22px", fontSize: 13 }} onClick={requestLandscape}>
          ลองอีกครั้ง
        </button>
      </div>
    </div>
  );
}
