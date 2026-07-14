import type { GameEvent, GameState } from "../types";

// IDs are derived from state.seq (not a module-level counter) so that two
// independently-created sessions with the same seed + replayed answers are
// byte-identical — see the comment on GameState.seq in types.ts.
function nextSeq(state: GameState): number {
  state.seq += 1;
  return state.seq;
}

export function newEventId(state: GameState): string {
  return `evt_${nextSeq(state)}`;
}

export function pushEvent(state: GameState, event: GameEvent): void {
  state.eventStack.push(event);
}

export function popEvent(state: GameState): GameEvent | undefined {
  return state.eventStack.pop();
}

export function currentEvent(state: GameState): GameEvent | undefined {
  return state.eventStack.at(-1);
}

export function makeEvent(
  state: GameState,
  type: string,
  source: string | undefined,
  targets: string[],
  data: Record<string, unknown> = {},
): GameEvent {
  return {
    id: newEventId(state),
    type,
    ...(source !== undefined ? { source } : {}),
    targets,
    cancelled: false,
    data,
  };
}
