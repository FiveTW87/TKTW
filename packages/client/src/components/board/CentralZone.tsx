import { useState } from "react";
import type { CardView } from "@tktw/shared";
import { CardTooltip } from "../HandCard";
import { cardDisplay, cardInfo, suitGlyph, rankLabel } from "../../data/cardNames";

const SUIT_COLOR: Record<string, string> = { heart: "#a8322a", diamond: "#a8322a", spade: "#2e2519", club: "#2e2519" };

// SPEC §11.5 — draw pile / latest played card / discard pile, centered on the
// board. Delayed Tricks are intentionally NOT rendered here — they attach to
// the target's panel (see OpponentPanel / SelfDock's judgmentZone chips).
export function CentralZone({
  drawPileCount,
  pendingReveal,
  revealTitle,
  onReveal,
  busy,
  lastPlay,
  discardCount,
  onOpenDiscard,
}: {
  drawPileCount: number;
  pendingReveal: boolean;
  revealTitle?: string | undefined;
  onReveal: () => void;
  busy: boolean;
  lastPlay: CardView | undefined;
  discardCount: number;
  onOpenDiscard: () => void;
}) {
  const [hoveredLast, setHoveredLast] = useState(false);
  const lastInfo = lastPlay ? cardInfo(lastPlay.typeKey) : undefined;

  return (
    <div className="mat" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 34, padding: 20, minHeight: 132, position: "relative" }}>
      <div style={{ position: "absolute", top: 8, left: 0, right: 0, textAlign: "center", fontFamily: "var(--font-glyph)", fontSize: 40, color: "rgba(120,90,40,.1)", letterSpacing: 8 }}>
        三國鼎立
      </div>

      {/* draw pile — also the "flip your judgment card" affordance */}
      <div style={{ textAlign: "center", zIndex: 1, position: "relative" }}>
        {pendingReveal && (
          <div className="anim-rise" style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", background: "var(--target-red)", color: "#f6ecd2", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8, boxShadow: "0 6px 16px rgba(0,0,0,.3)", zIndex: 5 }}>
            {revealTitle ?? "แตะเปิดการ์ดตัดสิน"} ▼
          </div>
        )}
        <div
          className="pile-pulse"
          onClick={pendingReveal && !busy ? onReveal : undefined}
          role={pendingReveal ? "button" : undefined}
          aria-label={pendingReveal ? "เปิดการ์ดตัดสิน" : undefined}
          style={{
            position: "relative",
            width: 62,
            height: 88,
            borderRadius: 6,
            background: "radial-gradient(circle at 50% 45%, #b23a2e, #8f2a22)",
            border: "1px solid var(--gold-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto",
            cursor: pendingReveal ? "pointer" : "default",
          }}
        >
          <span style={{ fontFamily: "var(--font-glyph)", fontSize: 30, color: "#f0d68a" }}>國</span>
          {pendingReveal && <div className="glow-target" />}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--ink-muted)" }}>กองจั่ว · <b>{drawPileCount}</b></div>
      </div>

      {/* last played card — hover/tap to preview its effect text */}
      <div
        style={{ textAlign: "center", zIndex: 1, minWidth: 96 }}
        onMouseEnter={() => setHoveredLast(true)}
        onMouseLeave={() => setHoveredLast(false)}
        onClick={() => setHoveredLast((v) => !v)}
      >
        {lastPlay ? (
          <div
            className="anim-pop"
            key={lastPlay.id}
            style={{
              width: 72,
              height: 100,
              margin: "0 auto",
              borderRadius: 6,
              background: "var(--card-bg)",
              border: "1px solid var(--card-border-2)",
              boxShadow: "0 6px 16px rgba(60,40,15,.22)",
              padding: 6,
              position: "relative",
              transform: "rotate(-4deg)",
              cursor: lastInfo ? "help" : "default",
            }}
          >
            <div style={{ position: "absolute", top: 4, left: 6, lineHeight: 1, textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 11, color: SUIT_COLOR[lastPlay.suit] }}>{rankLabel(lastPlay.rank)}</div>
              <div style={{ fontSize: 11, color: SUIT_COLOR[lastPlay.suit] }}>{suitGlyph(lastPlay.suit)}</div>
            </div>
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <span style={{ fontFamily: "var(--font-glyph)", fontSize: 30, color: "#4a3c28" }}>{cardDisplay(lastPlay.typeKey).glyph}</span>
            </div>
            <div style={{ position: "absolute", bottom: 5, left: 0, right: 0, textAlign: "center", fontWeight: 700, fontSize: 9, color: "var(--ink)" }}>
              {cardDisplay(lastPlay.typeKey).name}
            </div>
            {/* pointer-events: none on the tooltip itself (CardTooltip) so it
                never blocks a click on whatever sits beneath/behind it (bug list:
                "preview overlays do not block pointer events"). */}
            {hoveredLast && lastInfo && <CardTooltip name={cardDisplay(lastPlay.typeKey).name} info={lastInfo} />}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>—</div>
        )}
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--ink-faint)" }}>ใบล่าสุด</div>
      </div>

      {/* discard pile — click to browse the full pile */}
      <div style={{ textAlign: "center", zIndex: 1 }}>
        <button
          onClick={() => discardCount > 0 && onOpenDiscard()}
          title="ดูกองทิ้งทั้งหมด"
          style={{ all: "unset", cursor: discardCount > 0 ? "pointer" : "default" }}
        >
          <div style={{ width: 62, height: 88, borderRadius: 6, background: "#e9dcbc", border: "1px dashed var(--card-border-2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
            <span style={{ fontFamily: "var(--font-glyph)", fontSize: 22, color: "rgba(120,90,40,.4)" }}>棄</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--ink-muted)" }}>กองทิ้ง · <b>{discardCount}</b> {discardCount > 0 && <span style={{ color: "var(--red)" }}>· ดู</span>}</div>
        </button>
      </div>
    </div>
  );
}
