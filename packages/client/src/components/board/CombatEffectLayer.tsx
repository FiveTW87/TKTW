import type { CSSProperties } from "react";
import { createPortal } from "react-dom";

export interface CombatEffect {
  id: string;
  kind: "hit" | "dodge";
  /** Viewport-fixed coordinates of the target's anchor, at the moment the
   *  event was seen — computed once via getBoundingClientRect, not tracked
   *  live, since the effect only lives on screen for well under a second. */
  left: number;
  top: number;
  /** Slash orientation, in degrees — the direction from attacker to target
   *  when both anchors were found, otherwise a fixed diagonal default. */
  angleDeg: number;
  amount?: number | undefined;
}

// A brief impact (red flash + gold slash streak + floating "-N" number, TFT-
// style) or dodge (a small "หลบ!" pop) at a player's on-screen position.
// Portaled to document.body with position:fixed so it renders above every
// other layer regardless of which container the anchor tile lives inside.
export function CombatEffectLayer({ effects }: { effects: CombatEffect[] }) {
  if (effects.length === 0) return null;
  return createPortal(
    <>
      {effects.map((e) => (
        <div key={e.id} style={{ position: "fixed", left: e.left, top: e.top, zIndex: 150, pointerEvents: "none" }}>
          {e.kind === "hit" ? (
            <>
              <div className="combat-flash" />
              <div className="combat-slash" style={{ "--slash-angle": `${e.angleDeg}deg` } as CSSProperties} />
              {e.amount !== undefined && <div className="combat-dmg-number">-{e.amount}</div>}
            </>
          ) : (
            <div className="combat-dodge-text">หลบ!</div>
          )}
        </div>
      ))}
    </>,
    document.body,
  );
}
