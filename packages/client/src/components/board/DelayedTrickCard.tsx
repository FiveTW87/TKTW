import type { CardView } from "@tktw/shared";
import { cardDisplay } from "../../data/cardNames";

// SeatTile.dc.html — delayed tricks (judgment zone) render as small purple
// cards BESIDE the seat tile, not as chips inside it. `order` is 1-based
// (LIFO — the last-attached trick judges first, per the engine's own rule).
export function DelayedTrickCard({ card, order }: { card: CardView; order: number }) {
  const d = cardDisplay(card.typeKey);
  return (
    <div
      title={d.name}
      style={{
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
      }}
    >
      <span style={{ fontFamily: "var(--font-glyph)", fontSize: 17, color: "var(--purple-light)" }}>{d.glyph}</span>
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
        {order}
      </span>
    </div>
  );
}

export function DelayedTrickList({ cards }: { cards: CardView[] }) {
  if (cards.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 2, flexShrink: 0 }}>
      {cards.map((c, i) => (
        <DelayedTrickCard key={c.id} card={c} order={i + 1} />
      ))}
    </div>
  );
}
