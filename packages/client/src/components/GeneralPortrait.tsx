import type { CSSProperties } from "react";
import { generalArt } from "../data/generalArt";
import { factionColor, generalDisplay } from "../data/generalNames";

export function GeneralPortrait({
  generalId,
  faction,
  style,
  className,
}: {
  generalId: string;
  faction: string;
  style?: CSSProperties;
  className?: string;
}) {
  const display = generalDisplay(generalId);
  const art = generalArt(generalId, faction);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: `radial-gradient(circle at 50% 38%, ${factionColor(faction)}99, #171008 76%)`,
        ...style,
      }}
    >
      {art.portrait ? (
        <img
          src={art.portrait}
          alt={`ภาพตัวละคร ${display.name}`}
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
        />
      ) : (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-glyph)",
            fontSize: "42%",
            color: "rgba(240,220,180,.5)",
          }}
        >
          {display.glyph}
        </span>
      )}
      <span className="general-portrait-sheen" aria-hidden="true" />
    </div>
  );
}
