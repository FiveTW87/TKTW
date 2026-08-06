// Shared helper for guohe/shunshou (SPEC 8.2, with a house-rule deviation):
// the acting player may choose a specific EQUIPPED card (public) to
// take/discard, or fall back to a uniformly-random hand card (hand contents
// are hidden, so a real player physically can't choose one — picking blind
// is the correct model, not letting the actor specify a hand card id, which
// would leak info). Delayed-trick (judgment zone) cards are deliberately
// excluded from what can be targeted here — house rule, not canonical
// guo-he-chai-qiao/shun-shou-qian-yang rules.
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
  const visible: Card[] = Object.values(target.equipment).filter(Boolean) as Card[];

  const answer = yield {
    kind: "pickCardFromPlayer",
    playerId: actingId,
    data: { targetId, reason, handCount: target.hand.length, visibleIds: visible.map((c) => c.id) },
  };

  const chosenId = answer.cardIds?.[0];
  if (chosenId !== undefined) {
    // Only the target's own EQUIPMENT is nameable this way (hand cards are
    // hidden and taken blind, below). Naming anything else — a card the
    // target doesn't hold, or one of their hand cards by id — is an illegal
    // answer, not a silent fall-through to a random hand card.
    const slotEntry = (Object.entries(target.equipment) as [string, Card | undefined][]).find(
      ([, c]) => c?.id === chosenId,
    );
    if (!slotEntry) {
      throw new Error(`${actingId}: ${chosenId} is not selectable from ${targetId}`);
    }
    const [slot] = slotEntry;
    const c = target.equipment[slot as keyof typeof target.equipment];
    delete target.equipment[slot as keyof typeof target.equipment];
    yield* fireTrigger(ctx, "OnEquipmentLost", { playerId: targetId, card: c });
    return c;
  }

  if (target.hand.length === 0) return undefined;
  const idx = rng.nextInt(target.hand.length);
  const card = target.hand.splice(idx, 1)[0];
  if (target.hand.length === 0) {
    yield* fireTrigger(ctx, "OnHandEmpty", { playerId: targetId });
  }
  return card;
}
