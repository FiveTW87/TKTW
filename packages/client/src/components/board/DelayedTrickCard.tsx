import { useState } from "react";
import type { CardView } from "@tktw/shared";
import { cardDisplay, cardInfo } from "../../data/cardNames";
import { CardTooltip } from "../HandCard";
import { ModalOverlay, ModalPanel } from "../Modal";
import { cardArtUrl } from "../../data/cardArt";

const CARD_BOX: React.CSSProperties = {
  width: 30,
  height: 40,
  borderRadius: 5,
  background: "linear-gradient(#3a2a52,#241734)",
  border: "1px solid var(--purple)",
  boxShadow: "0 0 8px rgba(129,97,168,.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  flexShrink: 0,
  overflow: "hidden",
};

function OrderBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        position: "absolute",
        bottom: -2,
        right: -2,
        width: 13,
        height: 13,
        borderRadius: "50%",
        background: "var(--purple)",
        color: "#f0e4cc",
        fontSize: 8,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,.5)",
      }}
    >
      {children}
    </span>
  );
}

// A single delayed trick — hover reveals its name + effect text right away,
// same as a hand card (SeatTile.dc.html draws these as small purple cards).
function SingleTrickCard({ card }: { card: CardView }) {
  const d = cardDisplay(card.typeKey);
  const info = cardInfo(card.typeKey);
  const artUrl = cardArtUrl(card.typeKey);
  const [hovered, setHovered] = useState(false);
  const [failedArtKey, setFailedArtKey] = useState<string | null>(null);
  const showArt = !!artUrl && failedArtKey !== card.typeKey;
  return (
    <div
      className="card-art-frame"
      aria-label={`อุบายรอเวลา: ${d.name}`}
      style={CARD_BOX}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {showArt && <img className="card-surface-art" src={artUrl} alt="" aria-hidden="true" onError={() => setFailedArtKey(card.typeKey)} />}
      {!showArt && <span style={{ fontFamily: "var(--font-glyph)", fontSize: 17, color: "var(--purple-light)" }}>{d.glyph}</span>}
      <OrderBadge>1</OrderBadge>
      {hovered && info && <CardTooltip name={d.name} info={info} />}
    </div>
  );
}

// 2+ delayed tricks collapse into one clickable stack — stacking N separate
// hover targets both eats vertical space and makes each one hard to hover
// precisely, so instead tap to browse the full list with descriptions.
function TrickStack({ cards }: { cards: CardView[] }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const topCard = cards[cards.length - 1]!;
  const topDisplay = cardDisplay(topCard.typeKey);
  const topGlyph = topDisplay.glyph;
  const topInfo = cardInfo(topCard.typeKey);
  const topArtUrl = cardArtUrl(topCard.typeKey);
  const [failedArtKey, setFailedArtKey] = useState<string | null>(null);
  const showTopArt = !!topArtUrl && failedArtKey !== topCard.typeKey;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={`อุบายรอเวลา ${cards.length} ใบ; ใบบนสุด ${topDisplay.name}`}
        style={{ all: "unset", cursor: "pointer", position: "relative", width: 30, height: 40, display: "block" }}
      >
        <div style={{ ...CARD_BOX, position: "absolute", top: 4, left: 3, opacity: 0.5 }} />
        <div style={{ ...CARD_BOX, position: "absolute", top: 2, left: 1.5, opacity: 0.75 }} />
        <div className="card-art-frame" style={{ ...CARD_BOX, position: "absolute", top: 0, left: 0 }}>
          {showTopArt && <img className="card-surface-art" src={topArtUrl} alt="" aria-hidden="true" onError={() => setFailedArtKey(topCard.typeKey)} />}
          {!showTopArt && <span style={{ fontFamily: "var(--font-glyph)", fontSize: 15, color: "var(--purple-light)" }}>{topGlyph}</span>}
        </div>
        <span
          style={{
            position: "absolute",
            bottom: -4,
            right: -4,
            minWidth: 15,
            height: 15,
            borderRadius: 8,
            background: "var(--purple)",
            color: "#f0e4cc",
            fontSize: 9,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,.5)",
            padding: "0 3px",
          }}
        >
          {cards.length}
        </span>
        {hovered && topInfo && <CardTooltip name={`${topDisplay.name} · ${cards.length} ใบ`} info={topInfo} />}
      </button>
      {open && (
        <ModalOverlay onClose={() => setOpen(false)}>
          <ModalPanel width={340}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
                position: "sticky",
                top: -26,
                background: "linear-gradient(#241a11,#160f09)",
                paddingTop: 26,
                marginTop: -26,
                zIndex: 1,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>การ์ดอุบายที่ติดอยู่ · {cards.length} ใบ</span>
              <button onClick={() => setOpen(false)} className="btn-secondary" style={{ padding: "6px 14px", fontSize: 13 }}>
                ปิด
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
              {cards.map((c, i) => {
                const d = cardDisplay(c.typeKey);
                const info = cardInfo(c.typeKey);
                return (
                  <div
                    key={c.id}
                    style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "rgba(58,42,82,.25)", border: "1px solid var(--purple)", borderRadius: 8, padding: "8px 10px" }}
                  >
                    <span style={{ fontFamily: "var(--font-glyph)", fontSize: 20, color: "var(--purple-light)", flexShrink: 0 }}>{d.glyph}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                        {i + 1}. {d.name}
                      </div>
                      {info && <div style={{ fontSize: 11.5, color: "var(--ink-muted)", marginTop: 2, lineHeight: 1.5 }}>{info}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </ModalPanel>
        </ModalOverlay>
      )}
    </>
  );
}

// SeatTile.dc.html — delayed tricks (judgment zone) render BESIDE the seat
// tile, not as chips inside it. With exactly one, hover shows its name +
// description; with more than one, they collapse to a single clickable
// stack (see TrickStack) so browsing doesn't require hovering N tiny cards.
export function DelayedTrickList({ cards }: { cards: CardView[] }) {
  if (cards.length === 0) return null;
  return (
    <div style={{ paddingTop: 2, flexShrink: 0 }}>
      {cards.length === 1 ? <SingleTrickCard card={cards[0]!} /> : <TrickStack cards={cards} />}
    </div>
  );
}
