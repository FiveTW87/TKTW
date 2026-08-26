import { useCallback, useEffect, useRef, useState } from "react";
import type { GameLogView } from "@tktw/shared";
import type { CardMotionKind, CardMotionPresentationEvent, CardMotionZone, DrawPresentationEvent, PresentationEvent } from "../presentation/presentationEvents";
import { playSfx, type SfxName } from "../lib/sfx";
import { usePresentationQueue } from "./usePresentationQueue";

export interface CardMotionEffect {
  id: string;
  motion: CardMotionKind;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  reduced: boolean;
  cardId?: string;
  cardType?: string;
  amount?: number;
  anonymous?: true;
}

export interface CardMotionPresentationOptions {
  connected: boolean;
  matchId: string | undefined;
  logs: readonly GameLogView[] | undefined;
  intervalMs?: number;
  play?: (name: SfxName) => void;
}

const RETRY_INTERVAL_MS = 50;
const RETRY_COUNT = 4;
const MAX_ACTIVE = 6;

function zoneKey(zone: CardMotionZone): string {
  return zone.kind === "pile" ? `pile:${zone.zone}` : `player:${zone.playerId}:${zone.zone}`;
}

function usableCenter(element: HTMLElement): { x: number; y: number } | null {
  if (!element.isConnected) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function anchorCenter(zone: CardMotionZone): { x: number; y: number } | null {
  const key = zoneKey(zone);
  for (const element of document.querySelectorAll<HTMLElement>("[data-card-motion-anchor]")) {
    if (element.dataset.cardMotionAnchor !== key) continue;
    const center = usableCenter(element);
    if (center) return center;
  }
  if (zone.kind === "player") {
    for (const element of document.querySelectorAll<HTMLElement>("[data-player-anchor]")) {
      if (element.dataset.playerAnchor !== zone.playerId) continue;
      const center = usableCenter(element);
      if (center) return center;
    }
  }
  return null;
}

function drawAsMotion(event: DrawPresentationEvent): CardMotionPresentationEvent {
  return {
    id: event.id.replace(/:draw$/, ":motion:draw"),
    logId: event.logId,
    kind: "cardMotion",
    motion: "draw",
    source: { kind: "pile", zone: "draw" },
    destination: { kind: "player", playerId: event.actorId, zone: "hand" },
    amount: event.amount ?? 1,
    anonymous: true,
  };
}

function motionSfx(motion: CardMotionKind): SfxName {
  switch (motion) {
    case "draw": case "steal": case "wuguPick": return "cardDraw";
    case "discard": case "equipmentLoss": return "cardDiscard";
    case "equip": return "equip";
    case "play": case "delayed": case "wuguReveal": return "cardPlay";
  }
}

export function useCardMotionPresentation({ connected, matchId, logs, intervalMs, play = playSfx }: CardMotionPresentationOptions): CardMotionEffect[] {
  const [effects, setEffects] = useState<CardMotionEffect[]>([]);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const mounted = useRef(true);

  const clearPresentation = useCallback(() => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current.clear();
    setEffects([]);
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      for (const timer of timers.current) clearTimeout(timer);
      timers.current.clear();
    };
  }, []);

  const present = useCallback((presentationEvent: PresentationEvent) => {
    // Draw logs intentionally emit both the established draw event and the
    // richer card-motion event. Consume only one to avoid duplicate motion.
    if (presentationEvent.kind === "cardMotion" && presentationEvent.motion === "draw") return;
    const event = presentationEvent.kind === "draw"
      ? drawAsMotion(presentationEvent)
      : presentationEvent.kind === "cardMotion"
        ? presentationEvent
        : null;
    if (!event) return;
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const show = (source: { x: number; y: number } | null, destination: { x: number; y: number }, reduced: boolean) => {
      if (!mounted.current) return;
      const origin = source ?? destination;
      const effect: CardMotionEffect = {
        id: event.id,
        motion: event.motion,
        fromX: reduced ? destination.x : origin.x,
        fromY: reduced ? destination.y : origin.y,
        toX: destination.x,
        toY: destination.y,
        reduced,
        ...(event.cardId ? { cardId: event.cardId } : {}),
        ...(event.cardType ? { cardType: event.cardType } : {}),
        ...(event.amount !== undefined ? { amount: event.amount } : {}),
        ...(event.anonymous ? { anonymous: true as const } : {}),
      };
      try { play(motionSfx(event.motion)); } catch { /* optional audio */ }
      setEffects((current) => [...current.filter((item) => item.id !== effect.id), effect].slice(-MAX_ACTIVE));
      const removal = setTimeout(() => {
        timers.current.delete(removal);
        if (mounted.current) setEffects((current) => current.filter((item) => item.id !== effect.id));
      }, reduced ? 360 : 760);
      timers.current.add(removal);
    };

    const tryPresent = (retriesRemaining: number) => {
      if (!mounted.current) return;
      const destination = anchorCenter(event.destination);
      if (!destination) {
        if (retriesRemaining <= 0) return;
        const retry = setTimeout(() => {
          timers.current.delete(retry);
          tryPresent(retriesRemaining - 1);
        }, RETRY_INTERVAL_MS);
        timers.current.add(retry);
        return;
      }
      if (prefersReduced) {
        show(null, destination, true);
        return;
      }
      const source = anchorCenter(event.source);
      if (!source && retriesRemaining > 0) {
        const retry = setTimeout(() => {
          timers.current.delete(retry);
          tryPresent(retriesRemaining - 1);
        }, RETRY_INTERVAL_MS);
        timers.current.add(retry);
        return;
      }
      show(source, destination, !source);
    };

    tryPresent(RETRY_COUNT);
  }, [play]);

  usePresentationQueue({
    connected,
    matchId,
    logs,
    present,
    onReset: clearPresentation,
    ...(intervalMs !== undefined ? { intervalMs } : {}),
  });

  return effects;
}
