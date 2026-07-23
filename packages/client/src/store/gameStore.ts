import { create } from "zustand";
import { socket, emitAck } from "../lib/socket";
import {
  ClientEvents,
  ServerEvents,
  type RoomStatePayload,
  type CreateRoomAck,
  type JoinRoomAck,
  type RejoinRoomAck,
  type QuickstartWithBotsAck,
  type SimpleAck,
  type GameView,
  type PlayerAnswer,
  type MatchResult,
} from "@tktw/shared";

const STORAGE_KEY = "tktw_session";

interface StoredSession {
  roomCode: string;
  sessionToken: string;
}

function loadStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof parsed.roomCode === "string" && typeof parsed.sessionToken === "string") {
      return { roomCode: parsed.roomCode, sessionToken: parsed.sessionToken };
    }
  } catch {
    // malformed storage — treat as absent
  }
  return null;
}

function saveStoredSession(s: StoredSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function clearStoredSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// SPEC §9.1: one clientActionId per decisionId, reused across retries of the
// same logical answer (so a lost-ack resend is recognized server-side as the
// same action rather than re-applied or rejected as stale).
const actionIdByDecision = new Map<string, string>();
function getOrCreateActionId(decisionId: string): string {
  let id = actionIdByDecision.get(decisionId);
  if (!id) {
    id = crypto.randomUUID();
    actionIdByDecision.set(decisionId, id);
  }
  return id;
}

interface GameStoreState {
  connected: boolean;
  /** True once the initial auto-rejoin attempt (or the decision that there
   *  was nothing to rejoin) has resolved — gates the first render so the
   *  lobby form doesn't flash before a stored session gets re-attached. */
  initialized: boolean;
  roomCode: string | null;
  sessionToken: string | null;
  seatIndex: number | null;
  matchId: string | null;
  roomState: RoomStatePayload | null;
  gameView: GameView | null;
  /** SPEC 8.4 — set once the current match finishes; re-sent on a rejoin
   *  into an already-"ended" room. Cleared on returnToLobby/leaveRoom. */
  matchResult: MatchResult | null;
  error: string | null;
  /** Set when an auto-rejoin fails despite a stored session (grace expired /
   *  token revoked) — the UI shows "can't return" then sends the user home. */
  sessionExpired: boolean;
  /** The decisionId we currently have an answer in-flight for (or have
   *  already successfully answered). Guards against double-submitting the
   *  same decision — the class of bug behind "clicked หลบ twice → froze".
   *  Cleared when the next game:view arrives, or immediately on a rejected
   *  answer (so the player can retry the same decision). */
  answeringId: string | null;
  /** Rolling diagnostic trace (last ~60 events) for the on-screen debug panel
   *  — every view/decision/answer/error, so a freeze can be reported exactly. */
  debug: string[];

  createRoom: (playerName: string) => Promise<void>;
  joinRoom: (roomCode: string, playerName: string) => Promise<void>;
  quickstartWithBots: (playerName: string, botCount: number) => Promise<void>;
  startGame: () => Promise<void>;
  answer: (fields: Omit<PlayerAnswer, "playerId">) => Promise<void>;
  leaveRoom: () => Promise<void>;
  returnToLobby: () => Promise<void>;
  clearError: () => void;
  dismissSessionExpired: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => {
  const clock = () => {
    const d = new Date();
    return `${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}.${String(d.getMilliseconds()).padStart(3, "0")}`;
  };
  const pushDebug = (msg: string) =>
    set((s) => ({ debug: [...s.debug.slice(-59), `[${clock()}] ${msg}`] }));

  // Runs on EVERY (re)connect: re-bind this (possibly brand-new) socket to our
  // seat via the session token. Handles both the initial page load (from
  // localStorage) and a live mid-game socket reconnect (from in-memory state).
  async function attemptRejoin(): Promise<void> {
    const state = get();
    const stored = loadStoredSession();
    const roomCode = state.roomCode ?? stored?.roomCode;
    const sessionToken = state.sessionToken ?? stored?.sessionToken;
    if (!roomCode || !sessionToken) {
      set({ initialized: true });
      return;
    }
    const ack = await emitAck<RejoinRoomAck>(ClientEvents.RoomRejoin, { roomCode, sessionToken });
    if (ack.ok) {
      set({
        roomCode,
        sessionToken,
        seatIndex: ack.seatIndex,
        matchId: ack.matchId ?? null,
        initialized: true,
        sessionExpired: false,
      });
    } else {
      // The server rejected the token (grace expired / revoked / room gone) →
      // tell the user before dropping them home.
      clearStoredSession();
      set({
        roomCode: null,
        sessionToken: null,
        seatIndex: null,
        matchId: null,
        roomState: null,
        gameView: null,
        initialized: true,
        sessionExpired: true,
      });
    }
  }

  socket.on("connect", () => {
    set({ connected: true });
    void attemptRejoin();
  });
  socket.on("disconnect", () => set({ connected: false }));
  socket.on(ServerEvents.RoomState, (payload: RoomStatePayload) =>
    set((s) => ({
      roomState: payload,
      // yourSeatIndex is authoritative — it survives a lobby re-index.
      ...(payload.yourSeatIndex !== undefined ? { seatIndex: payload.yourSeatIndex } : {}),
      ...(payload.matchId ? { matchId: payload.matchId } : {}),
      // A rematch's return-to-lobby moves the room off "ended" for everyone,
      // not just whoever triggered it — drop the stale result along with it.
      matchResult: payload.phase === "ended" ? s.matchResult : null,
    })),
  );
  // A fresh view means the previous decision has advanced — release the
  // double-submit guard so the next decision can be answered.
  socket.on(ServerEvents.GameView, (payload: GameView) => {
    const pd = payload.pendingDecision;
    pushDebug(`view → pending: ${pd ? `${pd.kind} @${pd.playerId}` : "none"}${payload.finished ? " (FINISHED)" : ""}`);
    set({ gameView: payload, answeringId: null });
  });
  socket.on(ServerEvents.MatchResult, (payload: MatchResult) => {
    pushDebug(`result → ${payload.endReason} (matchId ${payload.matchId})`);
    set({ matchResult: payload });
  });
  if (socket.connected) void attemptRejoin();

  return {
    connected: socket.connected,
    initialized: false,
    roomCode: null,
    sessionToken: null,
    seatIndex: null,
    matchId: null,
    roomState: null,
    gameView: null,
    matchResult: null,
    error: null,
    sessionExpired: false,
    answeringId: null,
    debug: [],

    createRoom: async (playerName) => {
      const ack = await emitAck<CreateRoomAck>(ClientEvents.RoomCreate, { playerName });
      if (!ack.ok) {
        set({ error: ack.error });
        return;
      }
      saveStoredSession({ roomCode: ack.roomCode, sessionToken: ack.sessionToken });
      set({ roomCode: ack.roomCode, sessionToken: ack.sessionToken, seatIndex: ack.seatIndex, error: null });
    },

    joinRoom: async (roomCode, playerName) => {
      const ack = await emitAck<JoinRoomAck>(ClientEvents.RoomJoin, { roomCode, playerName });
      if (!ack.ok) {
        set({ error: ack.error });
        return;
      }
      saveStoredSession({ roomCode, sessionToken: ack.sessionToken });
      set({ roomCode, sessionToken: ack.sessionToken, seatIndex: ack.seatIndex, error: null });
    },

    quickstartWithBots: async (playerName, botCount) => {
      const ack = await emitAck<QuickstartWithBotsAck>(ClientEvents.RoomQuickstartWithBots, {
        playerName,
        botCount,
      });
      if (!ack.ok) {
        set({ error: ack.error });
        return;
      }
      saveStoredSession({ roomCode: ack.roomCode, sessionToken: ack.sessionToken });
      set({ roomCode: ack.roomCode, sessionToken: ack.sessionToken, seatIndex: ack.seatIndex, error: null });
    },

    startGame: async () => {
      const { roomCode } = get();
      if (!roomCode) return;
      const ack = await emitAck<SimpleAck>(ClientEvents.RoomStart, { roomCode });
      if (!ack.ok) set({ error: ack.error });
    },

    answer: async (fields) => {
      const { roomCode, matchId, answeringId } = get();
      if (!roomCode || !matchId) return;
      const tag = `${fields.decisionId} ${fields.choice ?? (fields.pass ? "pass" : fields.cardIds ? `cards[${fields.cardIds.length}]` : "?")}`;
      // Already answering (or done with) this exact decision → drop the
      // duplicate. Without this a fast double-click sends two answers for one
      // decision: the first resolves it, the second is stale → error + a
      // confused, sometimes-stuck UI.
      if (answeringId === fields.decisionId) {
        pushDebug(`⨯ dropped duplicate answer (${tag})`);
        return;
      }
      set({ answeringId: fields.decisionId });
      pushDebug(`→ answer ${tag}`);
      // SPEC 8.3: stamped with matchId so the server can reject a stale
      // answer from a previous match (decisionIds restart at dec_1 each match).
      // SPEC §9.1: a fresh clientActionId per logical answer — if the ack
      // gets lost and this exact call is retried, reusing the id lets the
      // server replay the original success instead of re-applying it.
      const clientActionId = getOrCreateActionId(fields.decisionId);
      const ack = await emitAck<SimpleAck>(ClientEvents.GameAnswer, {
        roomCode,
        matchId,
        clientActionId,
        ...fields,
      });
      if (!ack.ok) {
        // Rejected — the decision is still pending, so clear the guard to
        // allow a corrected retry.
        pushDebug(`✗ rejected: ${ack.error}`);
        set({ error: ack.error, answeringId: null });
      } else {
        pushDebug(`✓ accepted ${fields.decisionId}`);
      }
      // On success we keep answeringId set; the next game:view clears it once
      // the decision has actually advanced.
    },

    leaveRoom: async () => {
      const { roomCode } = get();
      // Tell the server first (revoke token / free the seat / forfeit) and wait
      // for its confirmation before dropping any local state (SPEC 6.3).
      if (roomCode) {
        await emitAck<SimpleAck>(ClientEvents.RoomLeave, { roomCode });
      }
      clearStoredSession();
      actionIdByDecision.clear();
      set({
        roomCode: null,
        sessionToken: null,
        seatIndex: null,
        matchId: null,
        roomState: null,
        gameView: null,
        matchResult: null,
        error: null,
        sessionExpired: false,
      });
    },

    returnToLobby: async () => {
      // SPEC 8.5: from the result screen, back to this room's own lobby for
      // a rematch — same room/socket/session, just a fresh match to come.
      const { roomCode } = get();
      if (!roomCode) return;
      const ack = await emitAck<SimpleAck>(ClientEvents.RoomReturnToLobby, { roomCode });
      if (!ack.ok) {
        set({ error: ack.error });
        return;
      }
      actionIdByDecision.clear();
      set({ gameView: null, matchResult: null, matchId: null, error: null });
    },

    clearError: () => set({ error: null }),
    dismissSessionExpired: () => set({ sessionExpired: false }),
  };
});
