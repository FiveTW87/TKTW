import { useRef, useState } from "react";
import type { Card } from "@tktw/shared";
import { cardDisplay, cardInfo, suitGlyph, rankLabel } from "../data/cardNames";

const SUIT_COLOR: Record<string, string> = {
  heart: "#8a2f22",
  diamond: "#8a2f22",
  spade: "#2e2013",
  club: "#2e2013",
};

export function HandCard({
  card,
  selected,
  dimmed,
  animateIn,
  onClick,
  compact,
}: {
  card: Card;
  selected: boolean;
  dimmed?: boolean;
  animateIn?: boolean;
  onClick?: (() => void) | undefined;
  /** Phase 8 mobile-landscape sizing — a smaller card for short viewports. */
  compact?: boolean;
}) {
  const d = cardDisplay(card.typeKey);
  const info = cardInfo(card.typeKey);
  const color = SUIT_COLOR[card.suit] ?? "#2e2519";
  const [hovered, setHovered] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tooltips only trigger on hover, which doesn't exist on touch — a
  // tap-and-hold (long press) shows the same tooltip on mobile instead.
  const startHold = () => {
    holdTimer.current = setTimeout(() => setHovered(true), 400);
  };
  const endHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHovered(false);
  };
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={startHold}
      onTouchEnd={endHold}
      onTouchCancel={endHold}
      className={`hand-card${animateIn ? " anim-draw" : ""}`}
      style={{
        position: "relative",
        width: compact ? 44 : 76,
        height: compact ? 62 : 108,
        borderRadius: 6,
        background: "var(--card-bg)",
        border: `2px solid ${selected ? "var(--gold)" : "var(--card-border)"}`,
        boxShadow: selected ? "0 0 12px rgba(217,165,49,.6)" : "0 4px 10px rgba(60,40,15,.18)",
        padding: compact ? 3 : 6,
        cursor: onClick ? "pointer" : "default",
        transform: selected ? "translateY(-12px)" : "none",
        transition: "transform .12s, box-shadow .12s, border-color .12s",
        opacity: dimmed ? 0.42 : 1,
        flexShrink: 0,
      }}
    >
      <div style={{ position: "absolute", top: compact ? 3 : 4, left: compact ? 4 : 6, lineHeight: 1, textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: compact ? 7.5 : 11, color }}>{rankLabel(card.rank)}</div>
        <div style={{ fontSize: compact ? 7.5 : 11, color }}>{suitGlyph(card.suit)}</div>
      </div>
      <div style={{ marginTop: compact ? 10 : 20, textAlign: "center" }}>
        <span style={{ fontFamily: "var(--font-glyph)", fontSize: compact ? 15 : 28, color: "var(--card-ink-muted)" }}>{d.glyph}</span>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: compact ? 3 : 5,
          left: compact ? 2 : 0,
          right: compact ? 2 : 0,
          textAlign: "center",
          fontWeight: 700,
          fontSize: compact ? 6 : 10,
          color: "var(--card-ink)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {d.name}
      </div>
      {hovered && info && <CardTooltip name={d.name} info={info} />}
    </div>
  );
}

// A floating explainer above the card — appears on hover so the effect is
// readable without a rulebook.
export function CardTooltip({ name, info }: { name: string; info: string }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "calc(100% + 8px)",
        left: "50%",
        transform: "translateX(-50%)",
        width: 200,
        zIndex: 80,
        background: "rgba(28,22,14,.96)",
        color: "#f0e6cc",
        border: "1px solid var(--gold)",
        borderRadius: 8,
        padding: "9px 11px",
        boxShadow: "0 10px 26px rgba(0,0,0,.45)",
        pointerEvents: "none",
        textAlign: "left",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 12.5, color: "#f0d68a", marginBottom: 3 }}>{name}</div>
      <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>{info}</div>
    </div>
  );
}
