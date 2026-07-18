// Bare http.createServer() + Socket.IO — no Express, nothing else needed.
// Exported as a factory (not run at import time) so tests can spin up their
// own instance on an ephemeral port without touching the CLI entrypoint.
import { createServer, type Server as HttpServer } from "node:http";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sirv from "sirv";
import { Server as SocketIOServer } from "socket.io";
import { RoomManager } from "./rooms/RoomManager";
import { registerSocketHandlers } from "./socketHandlers";

// Single-service deploy: if the client has been built, serve its static files
// from this same server (Socket.IO already intercepts /socket.io/ before this
// handler ever runs). CLIENT_DIST wins; otherwise look next to this package.
// When there's no build (local dev), this stays off and dev uses Vite.
function resolveClientDist(): string | undefined {
  const dir =
    process.env.CLIENT_DIST ?? fileURLToPath(new URL("../../client/dist", import.meta.url));
  return existsSync(dir) ? dir : undefined;
}

export interface TktwServerOptions {
  corsOrigin?: string;
  /** How long a room may sit with nobody connected before GC deletes it. */
  roomGcGraceMs?: number;
  roomGcSweepIntervalMs?: number;
  /** How long a pending decision waits before the default answer fires.
   *  Overridable so tests don't have to wait out the real 30s default. */
  decisionTimeoutMs?: number;
}

export interface TktwServer {
  httpServer: HttpServer;
  io: SocketIOServer;
  rooms: RoomManager;
  close: () => Promise<void>;
}

const DEFAULT_GC_GRACE_MS = 30 * 60 * 1000; // 30 minutes since anyone was last connected
const DEFAULT_GC_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

export function createTktwServer(opts: TktwServerOptions = {}): TktwServer {
  const clientDist = resolveClientDist();
  const serveStatic = clientDist ? sirv(clientDist, { single: true }) : undefined;
  if (clientDist) console.log(`serving client from ${clientDist}`);

  const httpServer = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (serveStatic) {
      serveStatic(req, res, () => {
        res.writeHead(404);
        res.end();
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const io = new SocketIOServer(httpServer, {
    cors: { origin: opts.corsOrigin ?? "*" },
  });

  const rooms = new RoomManager();
  registerSocketHandlers(
    io,
    rooms,
    opts.decisionTimeoutMs === undefined ? {} : { decisionTimeoutMs: opts.decisionTimeoutMs },
  );

  const graceMs = opts.roomGcGraceMs ?? DEFAULT_GC_GRACE_MS;
  const sweepMs = opts.roomGcSweepIntervalMs ?? DEFAULT_GC_SWEEP_INTERVAL_MS;
  const gcInterval = setInterval(() => {
    const removed = rooms.sweep(graceMs);
    for (const code of removed) console.log(`[gc] removed empty room ${code}`);
  }, sweepMs);
  gcInterval.unref();

  return {
    httpServer,
    io,
    rooms,
    close: () =>
      new Promise((resolve) => {
        clearInterval(gcInterval);
        io.close(() => {
          httpServer.close(() => resolve());
        });
      }),
  };
}
