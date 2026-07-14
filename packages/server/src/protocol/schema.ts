// All client->server socket payloads, validated at the door before anything
// touches a GameRoom or the engine. No shared `packages/shared` yet — there's
// no client package to justify the split, so these live directly here.
import { z } from "zod";

// 6 chars, uppercase, no 0/O/1/I — avoids the pairs people misread out loud.
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(6)
  .regex(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/, "invalid room code");

export const playerNameSchema = z.string().trim().min(1).max(24);

// Server-generated crypto.randomUUID(); validated loosely (any reasonably
// long opaque string) so the format is free to change server-side.
export const sessionTokenSchema = z.string().min(16).max(128);

export const createRoomSchema = z.object({
  playerName: playerNameSchema,
});

export const joinRoomSchema = z.object({
  roomCode: roomCodeSchema,
  playerName: playerNameSchema,
});

export const rejoinRoomSchema = z.object({
  roomCode: roomCodeSchema,
  sessionToken: sessionTokenSchema,
});

export const startGameSchema = z.object({
  roomCode: roomCodeSchema,
});

// Mirrors engine's PlayerAnswer (types.ts) minus playerId/decisionId, which
// the server fills in itself from the room seat / current pendingDecision —
// a client is never trusted to say who it's answering as.
export const answerSchema = z.object({
  roomCode: roomCodeSchema,
  decisionId: z.string().min(1),
  choice: z.string().max(64).optional(),
  cardIds: z.array(z.string().max(64)).max(10).optional(),
  targetIds: z.array(z.string().max(64)).max(10).optional(),
  skillId: z.string().max(64).optional(),
  asType: z.string().max(32).optional(),
  pass: z.boolean().optional(),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type RejoinRoomInput = z.infer<typeof rejoinRoomSchema>;
export type StartGameInput = z.infer<typeof startGameSchema>;
export type AnswerInput = z.infer<typeof answerSchema>;
