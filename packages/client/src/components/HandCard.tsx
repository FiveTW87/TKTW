import { useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { createPortal } from "react-dom";
import type { Card } from "@tktw/shared";
import { cardDisplay, cardInfo, suitGlyph, rankLabel } from "../data/cardNames";
import { cardArtUrl } from "../data/cardArt";

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
  onInspect,
  compact,
}: {
  card: Card;
  selected: boolean;
  dimmed?: boolean;
  animateIn?: boolean;
  onClick?: (() => void) | undefined;
  onInspect?: (() => void) | undefined;
  /** Phase 8 mobile-landscape sizing — a smaller card for short viewports. */
  compact?: boolean;
}) {
  const d = cardDisplay(card.typeKey);
  const info = cardInfo(card.typeKey);
  const artUrl = cardArtUrl(card.typeKey);
  const [failedArtKey, setFailedArtKey] = useState<string | null>(null);
  const showArt = !!artUrl && failedArtKey !== card.typeKey;
  const color = SUIT_COLOR[card.suit] ?? "#2e2519";
  const [hovered, setHovered] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
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
      ref={cardRef}
      onClick={onClick ?? onInspect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={startHold}
      onTouchEnd={endHold}
      onTouchCancel={endHold}
      className={`hand-card${selected ? " hand-card-selected" : ""}${animateIn ? " anim-draw" : ""}`}
      style={{
        position: "relative",
        width: compact ? 44 : 76,
        height: compact ? 62 : 108,
        borderRadius: 6,
        background: "var(--card-bg)",
        border: `2px solid ${selected ? "var(--gold)" : "var(--card-border)"}`,
        boxShadow: selected ? "0 0 14px rgba(217,165,49,.75), 0 4px 10px rgba(60,40,15,.18)" : "0 4px 10px rgba(60,40,15,.18)",
        padding: compact ? 3 : 6,
        cursor: onClick || onInspect ? "pointer" : "default",
        transform: selected ? `translateY(${compact ? -8 : -14}px)` : "translateY(0)",
        zIndex: selected ? 4 : 1,
        transition: "transform .14s ease, box-shadow .14s, border-color .14s, filter .14s",
        opacity: dimmed ? 0.42 : 1,
        flexShrink: 0,
      }}
    >
      {showArt && <img className="hand-card-art" src={artUrl} alt="" aria-hidden="true" onError={() => setFailedArtKey(card.typeKey)} />}
      {onInspect && (
        <button
          type="button"
          className="card-inspect-trigger"
          aria-label={`ดูรายละเอียด ${d.name}`}
          title="ดูรายละเอียดการ์ด"
          onClick={(event) => {
            event.stopPropagation();
            onInspect();
          }}
        >
          ⤢
        </button>
      )}
      <div style={{ position: "absolute", top: compact ? 3 : 4, left: compact ? 4 : 6, lineHeight: 1, textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: compact ? 7.5 : 11, color }}>{rankLabel(card.rank)}</div>
        <div style={{ fontSize: compact ? 7.5 : 11, color }}>{suitGlyph(card.suit)}</div>
      </div>
      {!showArt && (
        <div style={{ marginTop: compact ? 10 : 20, textAlign: "center", position: "relative" }}>
          <span style={{ fontFamily: "var(--font-glyph)", fontSize: compact ? 15 : 28, color: "var(--card-ink-muted)" }}>{d.glyph}</span>
        </div>
      )}
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
      {hovered && info && <CardTooltipPortal anchorRef={cardRef} name={d.name} info={info} />}
    </div>
  );
}

// The tooltip content, shared by both render modes below.
function TooltipBody({ name, info }: { name: string; info: string }) {
  return (
    <>
      <div style={{ fontWeight: 700, fontSize: 12.5, color: "#f0d68a", marginBottom: 3 }}>{name}</div>
      <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>{info}</div>
    </>
  );
}

const TOOLTIP_BOX_STYLE: CSSProperties = {
  width: 200,
  background: "rgba(28,22,14,.96)",
  color: "#f0e6cc",
  border: "1px solid var(--gold)",
  borderRadius: 8,
  padding: "9px 11px",
  boxShadow: "0 10px 26px rgba(0,0,0,.45)",
  pointerEvents: "none",
  textAlign: "left",
};

// A floating explainer above its trigger — appears on hover so the effect is
// readable without a rulebook. Positioned as a normal absolutely-positioned
// child of a `position:relative` trigger; only safe when that trigger isn't
// inside a scrolling container (see CardTooltipPortal below for that case).
export function CardTooltip({ name, info }: { name: string; info: string }) {
  return (
    <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", zIndex: 80, ...TOOLTIP_BOX_STYLE }}>
      <TooltipBody name={name} info={info} />
    </div>
  );
}

// Same tooltip, but rendered via a portal to document.body with a viewport-
// fixed position computed from the trigger's own bounding rect. Needed for
// triggers that live inside a horizontally-scrolling row (like the hand):
// browsers force overflow-y to behave like "auto" (clipping) whenever
// overflow-x is "auto" and overflow-y is left "visible" on the same element
// — an absolutely-positioned tooltip that pops up out of that row gets
// silently clipped no matter what overflow-y is literally set to. Escaping
// to a portal sidesteps that ancestor-overflow chain entirely.
export function CardTooltipPortal({ anchorRef, name, info }: { anchorRef: RefObject<HTMLElement | null>; name: string; info: string }) {
  const rect = anchorRef.current?.getBoundingClientRect();
  if (!rect) return null;
  return createPortal(
    <div
      style={{
        position: "fixed",
        left: rect.left + rect.width / 2,
        top: rect.top - 8,
        transform: "translate(-50%, -100%)",
        zIndex: 200,
        ...TOOLTIP_BOX_STYLE,
      }}
    >
      <TooltipBody name={name} info={info} />
    </div>,
    document.body,
  );
}
