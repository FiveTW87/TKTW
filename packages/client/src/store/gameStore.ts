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

interface GameStoreState {
  connected: boolean;
  /** True once the initial auto-rejoin attempt (or the decision that there
   *  was nothing to rejoin) has resolved — gates the first render so the
   *  lobby form doesn't flash before a stored session gets re-attached. */
  initialized: boolean;
  roomCode: string | null;
  sessionToken: string | null;
  seatIndex: number | null;
  roomState: RoomStatePayload | null;
  gameView: GameView | null;
  error: string | null;
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
  leaveRoom: () => void;
  clearError: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => {
  const clock = () => {
    const d = new Date();
    return `${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}.${String(d.getMilliseconds()).padStart(3, "0")}`;
  };
  const pushDebug = (msg: string) =>
    set((s) => ({ debug: [...s.debug.slice(-59), `[${clock()}] ${msg}`] }));

  async function attemptAutoRejoin(): Promise<void> {
    if (get().initialized || get().roomCode) return;
    const stored = loadStoredSession();
    if (!stored) {
      set({ initialized: true });
      return;
    }
    const ack = await emitAck<RejoinRoomAck>(ClientEvents.RoomRejoin, stored);
    if (ack.ok) {
      set({
        roomCode: stored.roomCode,
        sessionToken: stored.sessionToken,
        seatIndex: ack.seatIndex,
        initialized: true,
      });
    } else {
      clearStoredSession();
      set({ initialized: true });
    }
  }

  socket.on("connect", () => {
    set({ connected: true });
    void attemptAutoRejoin();
  });
  socket.on("disconnect", () => set({ connected: false }));
  socket.on(ServerEvents.RoomState, (payload: RoomStatePayload) => set({ roomState: payload }));
  // A fresh view means the previous decision has advanced — release the
  // double-submit guard so the next decision can be answered.
  socket.on(ServerEvents.GameView, (payload: GameView) => {
    const pd = payload.pendingDecision;
    pushDebug(`view → pending: ${pd ? `${pd.kind} @${pd.playerId}` : "none"}${payload.finished ? " (FINISHED)" : ""}`);
    set({ gameView: payload, answeringId: null });
  });
  if (socket.connected) void attemptAutoRejoin();

  return {
    connected: socket.connected,
    initialized: false,
    roomCode: null,
    sessionToken: null,
    seatIndex: null,
    roomState: null,
    gameView: null,
    error: null,
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
      const { roomCode, answeringId } = get();
      if (!roomCode) return;
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
      const ack = await emitAck<SimpleAck>(ClientEvents.GameAnswer, { roomCode, ...fields });
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

    leaveRoom: () => {
      clearStoredSession();
      set({
        roomCode: null,
        sessionToken: null,
        seatIndex: null,
        roomState: null,
        gameView: null,
        error: null,
      });
    },

    clearError: () => set({ error: null }),
  };
});
