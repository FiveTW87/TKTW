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
        background: "linear-gradient(#241a11,#160f09)",
        border: "1px solid var(--panel-border-3)",
        borderRadius: 10,
        padding: "10px 18px",
        boxShadow: "0 12px 34px rgba(0,0,0,.5)",
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "radial-gradient(circle at 38% 34%, var(--gold-deep), var(--gold-bronze))",
          border: "2px solid var(--gold-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: "var(--font-glyph)", fontSize: 18, color: "#2e1f08" }}>{toast.glyph}</span>
      </span>
      <div style={{ textAlign: "left" }}>
        <div style={{ fontSize: 11, color: "var(--ink-faint)", lineHeight: 1 }}>{toast.owner}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--gold)" }}>{toast.name}</div>
      </div>
    </div>
  );
}
