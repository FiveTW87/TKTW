import type { CSSProperties } from "react";
import { factionColor, factionLabel } from "../data/generalNames";

const FACTION_GLYPH: Record<string, string> = {
  wei: "魏",
  shu: "蜀",
  wu: "吳",
  qun: "群",
};

export function FactionBadge({ faction, compact = false }: { faction: string; compact?: boolean }) {
  const fullLabel = factionLabel(faction);
  const shortLabel = faction === "qun" ? "อิสระ" : fullLabel;

  return (
    <span
      className={`faction-badge${compact ? " is-compact" : ""}`}
      aria-label={`ฝ่าย${fullLabel}`}
      style={{ "--faction-badge-color": factionColor(faction) } as CSSProperties}
    >
      <span className="faction-badge-glyph" aria-hidden="true">{FACTION_GLYPH[faction] ?? "群"}</span>
      <span className="faction-badge-label">{shortLabel}</span>
    </span>
  );
}
