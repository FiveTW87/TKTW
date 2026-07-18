import type { ReactNode } from "react";

export function ModalOverlay({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div
      onClick={onClose}
      className="anim-fade"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(46,37,25,.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 40,
      }}
    >
      {children}
    </div>
  );
}

export function ModalPanel({
  children,
  width = 420,
  onClick,
}: {
  children: ReactNode;
  width?: number;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="anim-pop"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      style={{
        width,
        maxWidth: "90vw",
        background: "radial-gradient(120% 90% at 50% 0%, #f7f0dc, #efe3c6)",
        border: "1px solid var(--panel-border-2)",
        borderRadius: 12,
        padding: "26px 30px",
        boxShadow:
          "0 22px 60px rgba(40,25,10,.55), inset 0 0 0 5px rgba(255,255,255,.28), inset 0 0 0 6px rgba(166,129,47,.35)",
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

export function ModalGlyph({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: "var(--font-glyph)", fontSize: 30, color: "var(--red)", marginBottom: 6 }}>
      {children}
    </div>
  );
}
