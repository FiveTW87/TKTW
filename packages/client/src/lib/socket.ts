import { io, type Socket } from "socket.io-client";

// Priority: an explicit VITE_SERVER_URL (split hosting), else same-origin in a
// production build (single-service: the server serves this page too), else the
// local dev server. So a single-service deploy needs no env at all.
const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ??
  (import.meta.env.PROD ? window.location.origin : "http://localhost:3001");

export const socket: Socket = io(SERVER_URL, { autoConnect: true });

/** Wraps a socket.io ack-callback emit in a Promise — every client->server
 *  event in this protocol replies with a single ack, never a separate event. */
export function emitAck<T>(event: string, payload: unknown): Promise<T> {
  return new Promise((resolve) => {
    socket.emit(event, payload, (response: T) => resolve(response));
  });
}
