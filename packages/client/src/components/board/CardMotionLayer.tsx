import { type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { cardArtUrl } from "../../data/cardArt";
import { cardDisplay } from "../../data/cardNames";
import type { CardMotionEffect } from "../../hooks/useCardMotionPresentation";

export function CardMotionLayer({ effects }: { effects: CardMotionEffect[] }) {
  if (effects.length === 0) return null;
  return createPortal(
    <div className="card-motion-layer" data-testid="card-motion-layer" style={{ pointerEvents: "none" }} aria-hidden="false">
      {effects.map((effect) => {
        const display = effect.cardType ? cardDisplay(effect.cardType) : null;
        const art = effect.cardType ? cardArtUrl(effect.cardType) : undefined;
        const label = effect.anonymous
          ? `การ์ดไม่เปิดเผยเคลื่อนที่ ${effect.amount ?? 1} ใบ`
          : `การ์ดเคลื่อนที่ ${display?.name ?? "ไม่ทราบชื่อ"}`;
        return (
          <div
            key={effect.id}
            className={`card-motion-token card-motion-token-${effect.motion}${effect.anonymous ? " card-motion-anonymous" : ""}${effect.reduced ? " card-motion-reduced" : ""}`}
            aria-label={label}
            style={{
              "--motion-from-x": `${effect.fromX}px`,
              "--motion-from-y": `${effect.fromY}px`,
              "--motion-to-x": `${effect.toX}px`,
              "--motion-to-y": `${effect.toY}px`,
            } as CSSProperties}
          >
            <span className="card-motion-back">牌</span>
            {art && !effect.anonymous && <img src={art} alt="" aria-hidden="true" onError={(event) => { event.currentTarget.hidden = true; }} />}
            {effect.amount !== undefined && effect.amount > 1 && <b className="card-motion-count">×{effect.amount}</b>}
            <span className="card-motion-destination-mark">✦</span>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
