export interface ToastData {
  glyph: string;
  name: string;
  owner: string;
}

// A brief floating banner shown when an AUTO skill fires (there's no log
// panel yet, so this is how the player learns their skill did something).
export function SkillToast({ toast }: { toast: ToastData }) {
  return (
    <div
      className="anim-rise"
      style={{
        position: "fixed",
        top: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "radial-gradient(120% 120% at 50% 0%, #fbf5e3, #f1e7ca)",
        border: "1px solid var(--panel-border-2)",
        borderRadius: 10,
        padding: "10px 18px",
        boxShadow: "0 12px 34px rgba(40,25,10,.35), inset 0 0 0 4px rgba(255,255,255,.3), inset 0 0 0 5px rgba(166,129,47,.35)",
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "radial-gradient(circle at 38% 34%, #c0463a, #8f2a22)",
          border: "2px solid #f2e7cf",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: "var(--font-glyph)", fontSize: 18, color: "#f6ecd2" }}>{toast.glyph}</span>
      </span>
      <div style={{ textAlign: "left" }}>
        <div style={{ fontSize: 11, color: "var(--ink-faint)", lineHeight: 1 }}>{toast.owner}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--red)" }}>{toast.name}</div>
      </div>
    </div>
  );
}
