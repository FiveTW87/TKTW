// Pure room/session lifecycle tests — no socket.io, no real server (see
// RoomManager.ts's own header comment). Phase 4 (SPEC 8) additions: the
// player->seat permutation, fresh-seed-per-match, and the return-to-lobby
// rematch loop's seat pruning + host reassignment.
import { describe, it, expect } from "vitest";
import { RoomManager } from "../src/rooms/RoomManager";

function fillRoom(rooms: RoomManager, names: string[]): { roomCode: string; seatIndexes: number[] } {
  const { room, seatIndex: hostSeat } = rooms.createRoom(names[0]!);
  const seatIndexes = [hostSeat];
  for (let i = 1; i < names.length; i++) {
    const { seatIndex } = rooms.joinRoom(room.code, names[i]!);
    seatIndexes.push(seatIndex);
  }
  return { roomCode: room.code, seatIndexes };
}

describe("RoomManager.startGame (SPEC 8.2)", () => {
  it("mints a fresh seatAssignment that's a valid permutation of every engine seat", () => {
    const rooms = new RoomManager();
    const { roomCode } = fillRoom(rooms, ["Alice", "Bob", "Carol", "Dave"]);
    const room = rooms.getRoom(roomCode)!;
    rooms.startGame(room, 0);

    expect(room.seatAssignment).toHaveLength(4);
    expect([...room.seatAssignment!].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
  });

  it("never reuses a seed/matchId/seatAssignment across matches — every start is fresh", () => {
    const rooms = new RoomManager();
    const { roomCode } = fillRoom(rooms, ["Alice", "Bob", "Carol"]);
    const room = rooms.getRoom(roomCode)!;

    const seenMatchIds = new Set<string>();
    const seenAssignments = new Set<string>();
    for (let i = 0; i < 20; i++) {
      rooms.startGame(room, 0);
      expect(seenMatchIds.has(room.matchId!)).toBe(false);
      seenMatchIds.add(room.matchId!);
      seenAssignments.add(JSON.stringify(room.seatAssignment));
      room.phase = "ended"; // simulate a finish so returnToLobby is legal
      rooms.returnToLobby(room);
    }
    // Never guaranteed to differ every single time (finitely many
    // permutations for 3 seats), but 20 fresh starts should see more than
    // just the one — a stuck/reused permutation would fail this.
    expect(seenAssignments.size).toBeGreaterThan(1);
  });

  it("sets currentSeat to the lord's own (randomized) seat, not seat 0", () => {
    const rooms = new RoomManager();
    const { roomCode } = fillRoom(rooms, ["Alice", "Bob", "Carol", "Dave", "Eve"]);
    const room = rooms.getRoom(roomCode)!;
    rooms.startGame(room, 0);

    const lord = room.session!.state.players.find((p) => p.role === "lord")!;
    expect(room.session!.state.currentSeat).toBe(lord.seat);
  });
});

describe("RoomManager.returnToLobby (SPEC 8.5)", () => {
  it("throws unless the match has actually finished", () => {
    const rooms = new RoomManager();
    const { roomCode } = fillRoom(rooms, ["Alice", "Bob", "Carol"]);
    const room = rooms.getRoom(roomCode)!;
    rooms.startGame(room, 0);
    expect(() => rooms.returnToLobby(room)).toThrow(/not over/);

    room.phase = "ended";
    expect(() => rooms.returnToLobby(room)).not.toThrow();
  });

  it("prunes seats that are no longer connected, keeps connected ones", () => {
    const rooms = new RoomManager();
    const { roomCode } = fillRoom(rooms, ["Alice", "Bob", "Carol"]);
    const room = rooms.getRoom(roomCode)!;
    rooms.startGame(room, 0);
    room.seats[1]!.connected = false; // Bob dropped and never reconnected
    room.phase = "ended";

    rooms.returnToLobby(room);

    expect(room.phase).toBe("lobby");
    expect(room.seats.map((s) => s.name)).toEqual(["Alice", "Carol"]);
  });

  it("reassigns host if the host's own seat was pruned", () => {
    const rooms = new RoomManager();
    const { roomCode } = fillRoom(rooms, ["Alice", "Bob", "Carol"]);
    const room = rooms.getRoom(roomCode)!;
    rooms.startGame(room, 0);
    room.seats[0]!.connected = false; // the host (Alice) is the one who left
    room.phase = "ended";

    rooms.returnToLobby(room);

    expect(room.seats.map((s) => s.name)).toEqual(["Bob", "Carol"]);
    expect(room.seats[0]!.isHost).toBe(true);
  });

  it("clears session/result/matchId/seatAssignment/matchStartedAt for the next match", () => {
    const rooms = new RoomManager();
    const { roomCode } = fillRoom(rooms, ["Alice", "Bob", "Carol"]);
    const room = rooms.getRoom(roomCode)!;
    rooms.startGame(room, 0);
    room.phase = "ended";

    rooms.returnToLobby(room);

    expect(room.session).toBeUndefined();
    expect(room.matchId).toBeUndefined();
    expect(room.seatAssignment).toBeUndefined();
    expect(room.matchStartedAt).toBeUndefined();
    expect(room.result).toBeUndefined();
  });

  it("marks the room empty (GC-eligible) if every seat gets pruned", () => {
    const rooms = new RoomManager();
    const { roomCode } = fillRoom(rooms, ["Alice", "Bob", "Carol"]);
    const room = rooms.getRoom(roomCode)!;
    rooms.startGame(room, 0);
    for (const seat of room.seats) seat.connected = false;
    room.phase = "ended";

    rooms.returnToLobby(room);

    expect(room.seats).toHaveLength(0);
    expect(room.emptySince).not.toBeNull();
  });
});

describe("RoomManager.disconnectSocket host transfer (SPEC 8.6)", () => {
  it("transfers host on disconnect in the lobby", () => {
    const rooms = new RoomManager();
    const { roomCode } = fillRoom(rooms, ["Alice", "Bob"]);
    const room = rooms.getRoom(roomCode)!;
    rooms.attachSocket(room, 0, "sock-alice");
    rooms.attachSocket(room, 1, "sock-bob");

    rooms.disconnectSocket(room, "sock-alice");

    expect(room.seats[0]!.isHost).toBe(false);
    expect(room.seats[1]!.isHost).toBe(true);
  });

  it("transfers host on disconnect post-game (SPEC 8.6) but not mid-match", () => {
    const rooms = new RoomManager();
    const { roomCode } = fillRoom(rooms, ["Alice", "Bob", "Carol"]);
    const room = rooms.getRoom(roomCode)!;
    rooms.attachSocket(room, 0, "sock-alice");
    rooms.attachSocket(room, 1, "sock-bob");
    rooms.startGame(room, 0);

    room.phase = "playing";
    rooms.disconnectSocket(room, "sock-alice");
    expect(room.seats[0]!.isHost).toBe(true); // no hand-off mid-match

    rooms.attachSocket(room, 0, "sock-alice-2"); // reconnect
    room.phase = "ended";
    rooms.disconnectSocket(room, "sock-alice-2");
    expect(room.seats[0]!.isHost).toBe(false);
    expect(room.seats[1]!.isHost).toBe(true);
  });
});
