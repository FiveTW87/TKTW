import { Fragment, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { CombatEffect } from "../../hooks/useCombatPresentation";

function effectLabel(effect: CombatEffect): string {
  const source = effect.sourceLabel ?? "ผู้โจมตี";
  const target = effect.targetLabel ?? "เป้าหมาย";
  switch (effect.kind) {
    case "travel": return `${source} โจมตี ${target}`;
    case "hit": return `${target} ได้รับความเสียหาย${effect.amount === undefined ? "" : ` ${effect.amount}`}`;
    case "dodge": return `${target} หลบการโจมตีจาก ${source}`;
    case "heal": return `${target} ฟื้นพลังชีวิต ${effect.amount ?? 1}`;
    case "skill": return `${source} ใช้สกิล ${effect.label}`;
    case "death": return `${target} พ่ายแพ้`;
  }
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
        <Fragment key={e.id}>
          {e.poseArt && (
            <img
              className={`combat-character-pose combat-character-pose-${e.kind}`}
              src={e.poseArt}
              alt=""
              aria-hidden="true"
              decoding="sync"
              data-fallback-src={e.poseFallbackArt}
              onError={(event) => {
                const image = event.currentTarget;
                const fallback = image.dataset.fallbackSrc;
                if (fallback && image.src !== new URL(fallback, window.location.href).href) {
                  image.src = fallback;
                  return;
                }
                image.hidden = true;
              }}
              style={{
                left: e.poseLeft ?? e.left,
                top: e.poseTop ?? e.top,
                "--pose-scale": String(e.poseScale ?? 1),
                "--pose-offset-x": `${e.poseOffsetX ?? 0}px`,
                "--pose-offset-y": `${e.poseOffsetY ?? 0}px`,
              } as CSSProperties}
            />
          )}
          <div
            className={`combat-effect-node combat-effect-${e.kind}`}
            aria-label={effectLabel(e)}
            style={{
              position: "fixed",
              left: e.left,
              top: e.top,
              zIndex: 150,
              pointerEvents: "none",
              ...(e.kind === "travel" ? {
                width: e.distance,
                "--travel-angle": `${e.angleDeg}deg`,
                "--route-counter-angle": `${-e.angleDeg}deg`,
              } : {}),
            } as CSSProperties}
          >
          {e.kind === "travel" ? (
            <>
              <div className="combat-source-pulse" />
              <div className="combat-travel-token">殺</div>
              {e.sourceLabel && e.targetLabel && <div className="combat-route-label">{e.sourceLabel} → {e.targetLabel}</div>}
            </>
          ) : e.kind === "hit" ? (
            <>
              <div className="combat-flash" />
              <div className="combat-impact-ring" />
              <div className="combat-slash" style={{ "--slash-angle": `${e.angleDeg}deg` } as CSSProperties} />
              <div className="combat-slash combat-slash-secondary" style={{ "--slash-angle": `${e.angleDeg + 74}deg` } as CSSProperties} />
              <div className="combat-sparks" aria-hidden="true">
                {Array.from({ length: 7 }, (_, index) => (
                  <i key={index} style={{ "--spark-angle": `${index * 51}deg`, "--spark-distance": `${32 + (index % 3) * 8}px` } as CSSProperties} />
                ))}
              </div>
              {e.amount !== undefined && <div className="combat-dmg-number">-{e.amount}</div>}
            </>
          ) : e.kind === "dodge" ? (
            <>
              <div className="combat-dodge-afterimage" />
              <div className="combat-dodge-arc" />
              <div className="combat-dodge-text">หลบ!</div>
            </>
          ) : e.kind === "heal" ? (
            <>
              <div className="combat-heal-ring" />
              <div className="combat-heal-cross">✦</div>
              <div className="combat-heal-number">+{e.amount ?? 1}</div>
            </>
          ) : e.kind === "skill" ? (
            <>
              <div className="combat-skill-seal">技</div>
              <div className="combat-skill-name">{e.label}</div>
            </>
          ) : (
            <>
              <div className="combat-death-smoke" />
              <div className="combat-death-seal">敗</div>
              <div className="combat-death-text">พ่าย</div>
            </>
          )}
          </div>
        </Fragment>
      ))}
    </>,
    document.body,
  );
}
