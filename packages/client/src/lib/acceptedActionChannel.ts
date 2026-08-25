import type { LegalActionView, PlayerAnswer } from "@tktw/shared";

export interface AcceptedActionEvent {
  readonly acceptedAnswer: Omit<PlayerAnswer, "playerId">;
  readonly legalActions: readonly LegalActionView[];
}

export interface AcceptedActionChannel {
  subscribe(listener: (event: AcceptedActionEvent) => void): () => void;
  publish(event: AcceptedActionEvent): void;
}

export function createAcceptedActionChannel(): AcceptedActionChannel {
  const listeners = new Set<(event: AcceptedActionEvent) => void>();
  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    publish: (event) => {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch {
          // Presentation/coaching observers must never turn an accepted game
          // answer into a client-visible failure or strand the next decision.
        }
      }
    },
  };
}

export const acceptedActionChannel = createAcceptedActionChannel();
