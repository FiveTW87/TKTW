import { useRef, useState } from "react";
import type { CardView } from "@tktw/shared";
import { CardTooltip } from "../HandCard";
import { cardDisplay, cardInfo, suitGlyph, rankLabel } from "../../data/cardNames";
import { useDeviceMode } from "../../lib/useDeviceMode";

const SUIT_COLOR: Record<string, string> = { heart: "#8a2f22", diamond: "#8a2f22", spade: "#2e2013", club: "#2e2013" };

// A face-up card visual for the discard pile top. Cards currently resolving
// are presented transiently by CombatEffectLayer instead of occupying a
// permanent third zone in the middle of the table.
function CardFace({ card, rotate, compact }: { card: CardView; rotate: number; compact: boolean }) {
  const [hovered, setHovered] = useState(false);
  const info = cardInfo(card.typeKey);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      className="anim-pop"
      key={card.id}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={startHold}
      onTouchEnd={endHold}
      onTouchCancel={endHold}
      style={{
        width: compact ? 42 : 72,
        height: compact ? 58 : 100,
        margin: "0 auto",
        borderRadius: 6,
        background: "var(--card-bg)",
        border: "1px solid var(--card-border-2)",
        boxShadow: "0 6px 16px rgba(60,40,15,.22)",
        padding: compact ? 3 : 6,
        position: "relative",
        transform: `rotate(${rotate}deg)`,
        cursor: info ? "help" : "default",
      }}
    >
      <div style={{ position: "absolute", top: compact ? 3 : 4, left: compact ? 4 : 6, lineHeight: 1, textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: compact ? 8 : 11, color: SUIT_COLOR[card.suit] }}>{rankLabel(card.rank)}</div>
        <div style={{ fontSize: compact ? 8 : 11, color: SUIT_COLOR[card.suit] }}>{suitGlyph(card.suit)}</div>
      </div>
      <div style={{ marginTop: compact ? 9 : 20, textAlign: "center" }}>
        <span style={{ fontFamily: "var(--font-glyph)", fontSize: compact ? 16 : 30, color: "var(--card-ink-muted)" }}>{cardDisplay(card.typeKey).glyph}</span>
      </div>
      <div style={{ position: "absolute", bottom: compact ? 3 : 5, left: 0, right: 0, textAlign: "center", fontWeight: 700, fontSize: compact ? 7 : 9, color: "var(--card-ink)" }}>
        {cardDisplay(card.typeKey).name}
      </div>
      {/* pointer-events: none on the tooltip itself (CardTooltip) so it never
          blocks a click on whatever sits beneath/behind it (bug list: "preview
          overlays do not block pointer events"). */}
      {hovered && info && <CardTooltip name={cardDisplay(card.typeKey).name} info={info} />}
    </div>
  );
}

// RT's centralZone label pill — a small badge above each zone's card visual.
function ZoneLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        display: "inline-block",
        fontSize: 10,
        fontWeight: 600,
        color: "var(--ink-muted)",
        background: "rgba(60,44,24,.7)",
        border: "1px solid var(--panel-border-2)",
        borderRadius: 4,
        padding: "1px 8px",
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

// Draw pile + discard pile only. Delayed Tricks remain attached to their
// target's panel (OpponentPanel / SelfDock judgmentZone), and played cards use
// the transient combat presentation layer.
export function CentralZone({
  drawPileCount,
  pendingReveal,
  revealTitle,
  onReveal,
  busy,
  discardCount,
  discardTop,
  onOpenDiscard,
}: {
  drawPileCount: number;
  pendingReveal: boolean;
  revealTitle?: string | undefined;
  onReveal: () => void;
  busy: boolean;
  discardCount: number;
  discardTop: CardView | undefined;
  onOpenDiscard: () => void;
}) {
  const { compact } = useDeviceMode();
  const CORNER_BRACKET: React.CSSProperties = { position: "absolute", width: 16, height: 16, opacity: 0.5, pointerEvents: "none" };
  const DIVIDER = (
    <div style={{ alignSelf: "stretch", width: 1, background: "linear-gradient(180deg,transparent,rgba(217,165,49,.28),transparent)", flexShrink: 0 }} />
  );

  return (
    <div className="mat" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: compact ? 9 : 34, padding: compact ? 6 : 20, minHeight: compact ? 62 : 132, position: "relative" }}>
      <div style={{ position: "absolute", top: 8, left: 0, right: 0, textAlign: "center", fontFamily: "var(--font-glyph)", fontSize: 40, color: "rgba(120,90,40,.1)", letterSpacing: 8 }}>
        三國鼎立
      </div>
      {/* corner brackets — a light picture-frame accent matching the mockup's
          more ornate panel edges, subtler than a full border. */}
      <div style={{ ...CORNER_BRACKET, top: 6, left: 6, borderTop: "1px solid var(--gold)", borderLeft: "1px solid var(--gold)" }} />
      <div style={{ ...CORNER_BRACKET, top: 6, right: 6, borderTop: "1px solid var(--gold)", borderRight: "1px solid var(--gold)" }} />
      <div style={{ ...CORNER_BRACKET, bottom: 6, left: 6, borderBottom: "1px solid var(--gold)", borderLeft: "1px solid var(--gold)" }} />
      <div style={{ ...CORNER_BRACKET, bottom: 6, right: 6, borderBottom: "1px solid var(--gold)", borderRight: "1px solid var(--gold)" }} />

      {/* draw pile — also the "flip your judgment card" affordance */}
      <div style={{ textAlign: "center", zIndex: 1, position: "relative" }}>
        <ZoneLabel>กองจั่ว</ZoneLabel>
        {pendingReveal && (
          <div className="anim-rise" style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", background: "var(--target-red)", color: "#f6ecd2", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8, boxShadow: "0 6px 16px rgba(0,0,0,.3)", zIndex: 5 }}>
            {revealTitle ?? "แตะเปิดการ์ดตัดสิน"} ▼
          </div>
        )}
        <div
          className={pendingReveal ? "pile-pulse" : undefined}
          onClick={pendingReveal && !busy ? onReveal : undefined}
          role={pendingReveal ? "button" : undefined}
          aria-label={pendingReveal ? "เปิดการ์ดตัดสิน" : undefined}
          style={{
            position: "relative",
            width: compact ? 38 : 62,
            height: compact ? 52 : 88,
            borderRadius: 6,
            background: "linear-gradient(150deg,#2a1d12,#1a110a)",
            border: "1px solid var(--panel-border-3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto",
            cursor: pendingReveal ? "pointer" : "default",
          }}
        >
          <span style={{ fontFamily: "var(--font-glyph)", fontSize: compact ? 16 : 30, color: "var(--gold-light)" }}>國</span>
          {pendingReveal && <div className="glow-target" />}
        </div>
        <div style={{ marginTop: compact ? 5 : 8, fontSize: compact ? 9.5 : 11, color: "var(--ink-muted)" }}>กองจั่ว · <b>{drawPileCount}</b></div>
      </div>

      {DIVIDER}

      {/* discard pile — its own top card face; click to browse the full pile */}
      <div style={{ textAlign: "center", zIndex: 1, minWidth: compact ? 52 : 96 }}>
        <ZoneLabel>กองทิ้ง</ZoneLabel>
        <button
          onClick={() => discardCount > 0 && onOpenDiscard()}
          title="ดูกองทิ้งทั้งหมด"
          style={{ all: "unset", cursor: discardCount > 0 ? "pointer" : "default", display: "block" }}
        >
          {discardTop ? (
            <CardFace card={discardTop} rotate={4} compact={compact} />
          ) : (
            <div style={{ width: compact ? 42 : 62, height: compact ? 58 : 88, borderRadius: 6, background: "#e9dcbc", border: "1px dashed var(--card-border-2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
              <span style={{ fontFamily: "var(--font-glyph)", fontSize: compact ? 14 : 22, color: "rgba(120,90,40,.4)" }}>棄</span>
            </div>
          )}
          <div style={{ marginTop: compact ? 5 : 8, fontSize: compact ? 9.5 : 11, color: "var(--ink-muted)" }}>กองทิ้ง · <b>{discardCount}</b> {discardCount > 0 && <span style={{ color: "var(--red)" }}>· ดู</span>}</div>
        </button>
      </div>
    </div>
  );
}
