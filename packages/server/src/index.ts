// CLI entrypoint. `pnpm --filter @tktw/server start` / `pnpm dev`.
// Deploy target: a long-running host (Fly.io, Railway, a plain VM) — this
// keeps GameSessions and WebSocket connections alive in-process, which
// rules out serverless platforms like Vercel/Netlify.
import { createTktwServer } from "./server";

const PORT = Number(process.env.PORT ?? 3001);

const { httpServer } = createTktwServer(
  process.env.CLIENT_ORIGIN ? { corsOrigin: process.env.CLIENT_ORIGIN } : {},
);

httpServer.listen(PORT, () => {
  console.log(`TKTW server listening on :${PORT}`);
});
