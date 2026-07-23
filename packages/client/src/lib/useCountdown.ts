import { useEffect, useState } from "react";

/** Whole seconds remaining until `expiresAt` (server epoch ms), ticking once
 *  a second. `serverNow` anchors the client's clock to the server's so a
 *  skewed local clock doesn't misreport the deadline (SPEC §9.4). Returns
 *  null when there's no live deadline to show. */
export function useCountdown(expiresAt: number | undefined, serverNow: number): number | null {
  const [nowOffset] = useState(() => Date.now() - serverNow);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (expiresAt === undefined) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (expiresAt === undefined) return null;
  void tick; // re-render trigger only
  const remainingMs = expiresAt - (Date.now() - nowOffset);
  return Math.max(0, Math.ceil(remainingMs / 1000));
}
