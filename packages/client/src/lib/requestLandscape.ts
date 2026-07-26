// SPEC §12.1 — best-effort Fullscreen + Orientation Lock after a user
// gesture. iOS Safari supports neither API; every call is wrapped so a
// rejection/missing-API is a silent no-op — the rotate overlay (always CSS,
// always works) is the real guarantee, this is just a nicety on top.
export function requestLandscape(): void {
  const root = document.documentElement as HTMLElement & {
    requestFullscreen?: () => Promise<void>;
  };
  const lockOrientation = () => {
    const orientation = screen.orientation as (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined;
    orientation?.lock?.("landscape").catch(() => {});
  };
  const fullscreenResult = root.requestFullscreen?.();
  if (fullscreenResult) fullscreenResult.then(lockOrientation).catch(lockOrientation);
  else lockOrientation();
}
