// Socket.IO event names, shared so client and server can't drift on a typo'd
// string literal. Client -> server events all use an ack callback; server ->
// client events are plain broadcasts.
export const ClientEvents = {
  RoomCreate: "room:create",
  RoomJoin: "room:join",
  RoomRejoin: "room:rejoin",
  RoomLeave: "room:leave",
  RoomStart: "room:start",
  RoomQuickstartWithBots: "room:quickstartWithBots",
  RoomReturnToLobby: "room:returnToLobby",
  GameAnswer: "game:answer",
} as const;

export const ServerEvents = {
  RoomState: "room:state",
  GameView: "game:view",
  MatchResult: "game:result",
} as const;
