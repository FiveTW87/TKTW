import { useEffect, useReducer } from "react";

export interface InteractionState {
  selectedCardIds: string[];
  selectedTargetIds: string[];
  skillMode: string | null;
  zhangbaMode: boolean;
  selectedAsType: string | null;
}

export interface SelectionCommands {
  reset(): void;
  setCards(ids: string[]): void;
  setTargets(ids: string[]): void;
  toggleIndependentTarget(id: string, max: number): void;
  stepDependentTarget(id: string): void;
  beginPlay(cardIds: string[], asType: string | null, initialTargetIds?: string[]): void;
  beginSkill(skillId: string): void;
  beginZhangba(): void;
}

export interface SelectionController {
  state: Readonly<InteractionState>;
  commands: SelectionCommands;
}

interface StoredState extends InteractionState {
  decisionKey: string | null;
}

type Action =
  | { type: "SYNC_DECISION"; decisionKey: string | null }
  | { type: "RESET" }
  | { type: "SET_CARDS"; ids: string[] }
  | { type: "SET_TARGETS"; ids: string[] }
  | { type: "TOGGLE_INDEPENDENT_TARGET"; id: string; max: number }
  | { type: "STEP_DEPENDENT_TARGET"; id: string }
  | { type: "BEGIN_PLAY"; cardIds: string[]; asType: string | null; initialTargetIds: string[] }
  | { type: "BEGIN_SKILL"; skillId: string }
  | { type: "BEGIN_ZHANGBA" };

const emptySelection: InteractionState = {
  selectedCardIds: [],
  selectedTargetIds: [],
  skillMode: null,
  zhangbaMode: false,
  selectedAsType: null,
};

function fresh(decisionKey: string | null): StoredState {
  return { ...emptySelection, decisionKey };
}

function assertNever(value: never): never {
  throw new Error(`interaction reducer received an unhandled action: ${JSON.stringify(value)}`);
}

function reducer(state: StoredState, action: Action): StoredState {
  switch (action.type) {
    case "SYNC_DECISION":
      return state.decisionKey === action.decisionKey ? state : fresh(action.decisionKey);
    case "RESET":
      return fresh(state.decisionKey);
    case "SET_CARDS":
      return { ...state, selectedCardIds: action.ids };
    case "SET_TARGETS":
      return { ...state, selectedTargetIds: action.ids };
    case "TOGGLE_INDEPENDENT_TARGET": {
      const previous = state.selectedTargetIds;
      const selectedTargetIds = previous.includes(action.id)
        ? previous.filter((id) => id !== action.id)
        : previous.length < action.max
          ? [...previous, action.id]
          : [...previous.slice(1), action.id];
      return { ...state, selectedTargetIds };
    }
    case "STEP_DEPENDENT_TARGET": {
      const previous = state.selectedTargetIds;
      const selectedTargetIds = previous[0] === action.id
        ? []
        : previous[1] === action.id
          ? [previous[0]!]
          : previous.length === 0
            ? [action.id]
            : [previous[0]!, action.id];
      return { ...state, selectedTargetIds };
    }
    case "BEGIN_PLAY":
      return { ...state, selectedCardIds: action.cardIds, selectedTargetIds: action.initialTargetIds, skillMode: null, zhangbaMode: false, selectedAsType: action.asType };
    case "BEGIN_SKILL":
      return { ...fresh(state.decisionKey), skillMode: action.skillId };
    case "BEGIN_ZHANGBA":
      return { ...fresh(state.decisionKey), zhangbaMode: true };
    default:
      return assertNever(action);
  }
}

/** Owns all local card/target/mode transitions. A new authoritative decision
 * exposes an empty selection immediately, before the synchronizing effect,
 * so stale ids can never be interpreted against the next legalActions view. */
export function useInteraction(decisionKey: string | null): SelectionController {
  const [stored, dispatch] = useReducer(reducer, decisionKey, fresh);
  const current = stored.decisionKey === decisionKey ? stored : fresh(decisionKey);
  const state: InteractionState = {
    selectedCardIds: current.selectedCardIds,
    selectedTargetIds: current.selectedTargetIds,
    skillMode: current.skillMode,
    zhangbaMode: current.zhangbaMode,
    selectedAsType: current.selectedAsType,
  };

  useEffect(() => {
    dispatch({ type: "SYNC_DECISION", decisionKey });
  }, [decisionKey]);

  return {
    state,
    commands: {
      reset: () => dispatch({ type: "RESET" }),
      setCards: (ids) => dispatch({ type: "SET_CARDS", ids }),
      setTargets: (ids) => dispatch({ type: "SET_TARGETS", ids }),
      toggleIndependentTarget: (id, max) => dispatch({ type: "TOGGLE_INDEPENDENT_TARGET", id, max }),
      stepDependentTarget: (id) => dispatch({ type: "STEP_DEPENDENT_TARGET", id }),
      beginPlay: (cardIds, asType, initialTargetIds = []) => dispatch({ type: "BEGIN_PLAY", cardIds, asType, initialTargetIds }),
      beginSkill: (skillId) => dispatch({ type: "BEGIN_SKILL", skillId }),
      beginZhangba: () => dispatch({ type: "BEGIN_ZHANGBA" }),
    },
  };
}
