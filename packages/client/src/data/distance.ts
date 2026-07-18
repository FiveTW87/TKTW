// Client mirror of the engine's attack-distance math (packages/engine/src/
// bots/simplePolicy.ts + core/distance.ts) — purely to SHOW the reach number
// on each opponent. The engine remains authoritative for legality.
import type { PlayerView } from "@tktw/shared";
import { cardMeta } from "./cardMeta";

/** Ring distance between two seats, counting only living players. */
function seatDistance(players: PlayerView[], aId: string, bId: string): number {
  const alive = players.filter((p) => p.alive).sort((x, y) => x.seat - y.seat);
  const ids = alive.map((p) => p.id);
  const i = ids.indexOf(aId);
  const j = ids.indexOf(bId);
  if (i < 0 || j < 0 || i === j) return 0;
  const n = ids.length;
  return Math.min((j - i + n) % n, (i - j + n) % n);
}

/** How far `from` must reach to hit `to`: base ring distance, minus the
 *  attacker's −1 horse and Ma Chao's qima, plus the target's +1 horse; min 1.
 *  (Ma Chao's qima is the one skill modifier not surfaced in the view, so it's
 *  mirrored here by generalId — the accepted client-mirror pattern.) */
export function attackDistance(from: PlayerView, to: PlayerView, players: PlayerView[]): number {
  const base = seatDistance(players, from.id, to.id);
  const minusHorse = from.equipment.horseMinus ? 1 : 0;
  const qima = from.generalId === "machao" ? 1 : 0;
  const plusHorse = to.equipment.horsePlus ? 1 : 0;
  return Math.max(1, base - minusHorse - qima + plusHorse);
}

/** The attacker's สังหาร reach: their weapon's range, or 1 unarmed. */
export function weaponRange(p: PlayerView): number {
  const weapon = p.equipment.weapon;
  return weapon ? cardMeta(weapon.typeKey).attackRange ?? 1 : 1;
}
