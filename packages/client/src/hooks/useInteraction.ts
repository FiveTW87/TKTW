import { useEffect, useReducer } from "react";

// SPEC §11.1 — client-local interaction state, kept separate from server
// state (gameStore) and from dialog/animation state (plain useState in
// Table.tsx). Reset whenever the authoritative decision changes (a fresh
// game:view means any in-progress local selection is stale — SPEC §6.3
// "ห้าม restore selected card/target").
export type InteractionMode =
  | "idle"
  | "selectingCard"
  | "selectingTargets"
  | "selectingDiscard"
  | "orderingCards"
  | "responding"
  | "viewingDetails";

export interface InteractionState {
  mode: InteractionMode;
  selectedCardIds: string[];
  selectedTargetIds: string[];
  /** Active skill id, when the player is mid-skill-selection. */
  skillMode: string | null;
  /** ทวนงูจั้งปา (zhangba): 2 hand cards substitute for a สังหาร play. */
  zhangbaMode: boolean;
  /** Conversion play type (e.g. Guan Yu red→สังหาร), null = literal play. */
  selectedAsType: string | null;
}

type Action =
  | { type: "RESET" }
  | { type: "SELECT_CARDS"; ids: string[] }
  | { type: "TOGGLE_CARD"; id: string }
  | { type: "SELECT_TARGETS"; ids: string[] }
  | { type: "TOGGLE_TARGET"; id: string; max: number }
  | { type: "SET_SKILL_MODE"; skillId: string | null }
  | { type: "SET_ZHANGBA_MODE"; on: boolean }
  | { type: "SET_AS_TYPE"; asType: string | null };

const initialState: InteractionState = {
  mode: "idle",
  selectedCardIds: [],
  selectedTargetIds: [],
  skillMode: null,
  zhangbaMode: false,
  selectedAsType: null,
};

function reducer(state: InteractionState, action: Action): InteractionState {
  switch (action.type) {
    case "RESET":
      return initialState;
    case "SELECT_CARDS":
      return { ...state, selectedCardIds: action.ids };
    case "TOGGLE_CARD": {
      const has = state.selectedCardIds.includes(action.id);
      return { ...state, selectedCardIds: has ? state.selectedCardIds.filter((id) => id !== action.id) : [...state.selectedCardIds, action.id] };
    }
    case "SELECT_TARGETS":
      return { ...state, selectedTargetIds: action.ids };
    case "TOGGLE_TARGET": {
      const prev = state.selectedTargetIds;
      if (prev.includes(action.id)) return { ...state, selectedTargetIds: prev.filter((id) => id !== action.id) };
      if (prev.length < action.max) return { ...state, selectedTargetIds: [...prev, action.id] };
      return { ...state, selectedTargetIds: [...prev.slice(1), action.id] }; // at cap → drop oldest
    }
    case "SET_SKILL_MODE":
      return { ...state, skillMode: action.skillId };
    case "SET_ZHANGBA_MODE":
      return { ...state, zhangbaMode: action.on };
    case "SET_AS_TYPE":
      return { ...state, selectedAsType: action.asType };
    default:
      return state;
  }
}

/** Resets to idle whenever `decisionKey` changes (the pending decision's id
 *  advancing, or going null→something on a fresh game:view). */
export function useInteraction(decisionKey: string | null) {
  const [state, dispatch] = useReducer(reducer, initialState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    dispatch({ type: "RESET" });
  }, [decisionKey]);
  return [state, dispatch] as const;
}
