import { useEffect } from "react";
import type { PlayerView } from "@tktw/shared";
import { gameErrorCopy } from "../data/gameErrorCopy";

const AUTO_DISMISS_MS = 6500;

export function GameErrorPopup({
  error,
  players,
  onDismiss,
}: {
  error: string;
  players: PlayerView[] | undefined;
  onDismiss: () => void;
}) {
  const copy = gameErrorCopy(error, players);

  useEffect(() => {
    const timer = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [error, onDismiss]);

  return (
    <div className="game-error-popup-layer" aria-live="assertive">
      <section className="game-error-popup" role="alert" aria-label={copy.title}>
        <div className="game-error-popup-seal" aria-hidden="true">{copy.glyph}</div>
        <div className="game-error-popup-copy">
          <div className="game-error-popup-kicker">คำสั่งไม่สำเร็จ</div>
          <div className="game-error-popup-title">{copy.title}</div>
          <div className="game-error-popup-message">{copy.message}</div>
          {copy.hint && <div className="game-error-popup-hint"><span aria-hidden="true">◆</span>{copy.hint}</div>}
        </div>
        <button className="game-error-popup-close" type="button" onClick={onDismiss} aria-label="ปิดข้อความแจ้งเตือน">×</button>
        <div className="game-error-popup-timer" aria-hidden="true" />
      </section>
    </div>
  );
}
