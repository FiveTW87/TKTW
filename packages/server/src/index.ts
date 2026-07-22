// CLI entrypoint. `pnpm --filter @tktw/server start` / `pnpm dev`.
// Deploy target: a long-running host (Fly.io, Railway, a plain VM) — this
// keeps GameSessions and WebSocket connections alive in-process, which
// rules out serverless platforms like Vercel/Netlify.
import { createTktwServer } from "./server";

const PORT = Number(process.env.PORT ?? 3001);

const serverOpts: Parameters<typeof createTktwServer>[0] = {};
if (process.env.CLIENT_ORIGIN) serverOpts.corsOrigin = process.env.CLIENT_ORIGIN;
if (process.env.GRACE_PERIOD_MS) serverOpts.gracePeriodMs = Number(process.env.GRACE_PERIOD_MS);

const { httpServer } = createTktwServer(serverOpts);

httpServer.listen(PORT, () => {
  console.log(`TKTW server listening on :${PORT}`);
});
