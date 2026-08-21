import { useEffect, useRef, useState } from "react";
import type { Card, PlayerView } from "@tktw/shared";
import type { ToastData } from "../components/SkillToast";
import type { PlayChoice } from "./mainActionController";

export interface InspectedCard {
  card: Card;
  canChoose: boolean;
}

/** Owns transient table UI by lifetime: decision-scoped card/play choices and
 * notices, table-scoped browsers/confirms, timed cross-decision skill toast,
 * and match-scoped death dismissal. Markup remains in Table. */
export function useTableTransientUi({
  decisionKey,
  matchId,
  viewerAlive,
}: {
  decisionKey: string | null;
  matchId: string | undefined;
  viewerAlive: boolean | undefined;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [inspectingPlayer, setInspectingPlayer] = useState<PlayerView | null>(null);
  const [inspectingCard, setInspectingCard] = useState<InspectedCard | null>(null);
  const [playChoice, setPlayChoice] = useState<PlayChoice | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [deathDismissedFor, setDeathDismissedFor] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearNoticeTimer = () => {
    if (noticeTimer.current !== null) clearTimeout(noticeTimer.current);
    noticeTimer.current = null;
  };
  const clearToastTimer = () => {
    if (toastTimer.current !== null) clearTimeout(toastTimer.current);
    toastTimer.current = null;
  };

  useEffect(() => {
    clearNoticeTimer();
    setNotice(null);
    setInspectingCard(null);
    setPlayChoice(null);
  }, [decisionKey]);

  useEffect(() => () => {
    clearNoticeTimer();
    clearToastTimer();
  }, []);

  const showNotice = (message: string) => {
    clearNoticeTimer();
    setNotice(message);
    noticeTimer.current = setTimeout(() => {
      noticeTimer.current = null;
      setNotice(null);
    }, 1900);
  };

  const showToast = (data: ToastData) => {
    clearToastTimer();
    setToast(data);
    toastTimer.current = setTimeout(() => {
      toastTimer.current = null;
      setToast(null);
    }, 1600);
  };

  return {
    state: {
      notice,
      toast,
      inspectingPlayer,
      inspectingCard,
      playChoice,
      discardOpen,
      leaveConfirmOpen,
      showDeathDialog: viewerAlive === false && !!matchId && deathDismissedFor !== matchId,
    },
    notice: { show: showNotice },
    toast: { show: showToast },
    inspection: {
      openPlayer: setInspectingPlayer,
      closePlayer: () => setInspectingPlayer(null),
      openCard: (card: Card, canChoose = false) => setInspectingCard({ card, canChoose }),
      closeCard: () => setInspectingCard(null),
    },
    playChoice: { open: setPlayChoice, close: () => setPlayChoice(null) },
    discard: { open: () => setDiscardOpen(true), close: () => setDiscardOpen(false) },
    leaveConfirm: { open: () => setLeaveConfirmOpen(true), close: () => setLeaveConfirmOpen(false) },
    death: { dismiss: () => matchId && setDeathDismissedFor(matchId) },
  };
}
