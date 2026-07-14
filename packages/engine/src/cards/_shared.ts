// Shared helper for guohe/shunshou (SPEC 8.2): the acting player may choose
// a specific equipment/judgment card (both public) to take/discard, or fall
// back to a uniformly-random hand card (hand contents are hidden, so a real
// player physically can't choose one — picking blind is the correct model,
// not letting the actor specify a hand card id, which would leak info).
import type { Card, PlayerAnswer } from "../types";
import type { Decision } from "../core/decisions";
import type { Ctx } from "../core/ctx";
import { getPlayer } from "../core/state";
import { fireTrigger } from "../core/triggers";

type PickGenerator = Generator<Decision, Card | undefined, PlayerAnswer>;

export function* pickCardFrom(
  ctx: Ctx,
  actingId: string,
  targetId: string,
  reason: string,
): PickGenerator {
  const { state, rng } = ctx;
  const target = getPlayer(state, targetId);
  const visible: Card[] = [
    ...(Object.values(target.equipment).filter(Boolean) as Card[]),
    ...target.judgmentZone,
  ];

  const answer = yield {
    kind: "pickCardFromPlayer",
    playerId: actingId,
    data: { targetId, reason, handCount: target.hand.length, visibleIds: visible.map((c) => c.id) },
  };

  const chosenId = answer.cardIds?.[0];
  if (chosenId) {
    const slotEntry = (Object.entries(target.equipment) as [string, Card | undefined][]).find(
      ([, c]) => c?.id === chosenId,
    );
    if (slotEntry) {
      const [slot] = slotEntry;
      const c = target.equipment[slot as keyof typeof target.equipment];
      delete target.equipment[slot as keyof typeof target.equipment];
      yield* fireTrigger(ctx, "OnEquipmentLost", { playerId: targetId, card: c });
      return c;
    }
    const jIdx = target.judgmentZone.findIndex((c) => c.id === chosenId);
    if (jIdx >= 0) return target.judgmentZone.splice(jIdx, 1)[0];
  }

  if (target.hand.length === 0) return undefined;
  const idx = rng.nextInt(target.hand.length);
  const card = target.hand.splice(idx, 1)[0];
  if (target.hand.length === 0) {
    yield* fireTrigger(ctx, "OnHandEmpty", { playerId: targetId });
  }
  return card;
}
