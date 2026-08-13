// SPEC §11.3 — circular war-table layout. Pure functions only (no DOM/React)
// so density/position math is unit-testable without rendering anything.

export type DensityMode = "medium" | "compact" | "head";

/** Seat position relative to the viewer, going clockwise (SPEC §11.3). */
export function relativeSeat(targetSeat: number, viewerSeat: number, playerCount: number): number {
  return ((targetSeat - viewerSeat) % playerCount + playerCount) % playerCount;
}

/** 3–5 players get a roomier panel, 6–8 a compact one, 9–10 a head portrait
 *  only — chosen purely from player count (desktop-first; Phase 8 covers
 *  mobile-landscape sizing on top of this). */
export function densityMode(playerCount: number): DensityMode {
  if (playerCount <= 5) return "medium";
  return "compact";
}

/** Full table ring. Seat 0 (the viewer) sits at the bottom, and every other
 * seat continues clockwise around the same ellipse. */
export function tableRingPosition(relSeat: number, playerCount: number): { leftPct: number; topPct: number } {
  if (playerCount <= 0) return { leftPct: 50, topPct: 50 };
  const angle = Math.PI / 2 + relSeat * ((2 * Math.PI) / playerCount);
  return {
    // Leave a 10% horizontal gutter for the half-width of edge seat tiles.
    // A 45% radius put 4-player side seats at 5/95%, so medium (170px)
    // tiles could extend beyond the viewport on narrower desktop windows.
    leftPct: 50 + 40 * Math.cos(angle),
    topPct: 49 + 38 * Math.sin(angle),
  };
}

/** Percentage position (of the board container) for an opponent at the given
 *  relative seat. relSeat 0 is the viewer (never passed in — self renders as
 *  the bottom-center dock, not a ring slot). The other N-1 seats are spread
 *  across a top arc, going left→right in clockwise seat order. */
export function arcPosition(relSeat: number, playerCount: number): { leftPct: number; topPct: number } {
  const others = playerCount - 1;
  if (others <= 0) return { leftPct: 50, topPct: 50 };
  // relSeat runs 1..N-1 clockwise from the viewer; map that to an angle
  // sweeping across the top half of the ellipse, left (near 180°) to right
  // (near 0°), so seat order reads left-to-right around the back of the table.
  const index = relSeat - 1; // 0-based among the "others"
  const t = others === 1 ? 0.5 : index / (others - 1); // 0..1 across the arc
  // Sweep from 200° to -20° (i.e. slightly past horizontal on both ends) so
  // even a wide game doesn't look dead-center-stacked. With exactly 2
  // opponents that sweep degenerates to just its two low-lying endpoints
  // (both near the horizontal), leaving the whole upper half of the ring
  // empty — so a 2-opponent game uses a narrower, higher sweep instead.
  const totalSweep = others <= 2 ? 100 : 220;
  const startDeg = 90 + totalSweep / 2;
  const endDeg = 90 - totalSweep / 2;
  const deg = startDeg + (endDeg - startDeg) * t;
  const rad = (deg * Math.PI) / 180;
  const cx = 50;
  const cy = 38; // pulled up so the arc sits above the central zone
  const rx = 44;
  const ry = 30;
  const leftPct = cx + rx * Math.cos(rad);
  const topPct = cy - ry * Math.sin(rad);
  return { leftPct, topPct };
}

/** Lobby's waiting-room ring (SPEC §11.2 mockup) — unlike `arcPosition`, self
 *  IS one of the N ring slots (fixed at the bottom), since there's no hand/
 *  dock to reserve room for yet. Spreads all N seats evenly around a full
 *  ellipse, starting at the bottom and going clockwise. */
export function lobbyRingPosition(relSeat: number, playerCount: number): { leftPct: number; topPct: number } {
  if (playerCount <= 0) return { leftPct: 50, topPct: 50 };
  const angleStep = (2 * Math.PI) / playerCount;
  const angle = Math.PI / 2 + relSeat * angleStep; // start at bottom (90°), clockwise
  const cx = 50;
  const cy = 50;
  const rx = 44;
  const ry = 42;
  return {
    leftPct: cx + rx * Math.cos(angle),
    topPct: cy + ry * Math.sin(angle),
  };
}
