export type AckFailure = { ok: false; error: string };

export interface AckTransport {
  emit(event: string, payload: unknown, callback: (response: unknown) => void): void;
}

export function emitAckWithTimeout<T extends { ok: boolean }>(
  transport: AckTransport,
  timeoutMs: number,
  event: string,
  payload: unknown,
): Promise<T | AckFailure> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ ok: false, error: "connection timeout" });
    }, timeoutMs);
    transport.emit(event, payload, (response) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(response as T);
    });
  });
}
