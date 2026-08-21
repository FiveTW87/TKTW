import { useCallback, useEffect, useRef, useState } from "react";
import type { GameLogView, PlayerView } from "@tktw/shared";
import { skillById } from "../data/generalSkills";
import { generalPosePresentation, type GeneralPose } from "../data/generalArt";
import type { PresentationEvent } from "../presentation/presentationEvents";
import { playSfx, type SfxName } from "../lib/sfx";
import { usePresentationQueue } from "./usePresentationQueue";

interface BaseEffect {
  id: string;
  left: number;
  top: number;
  angleDeg: number;
  sourceLabel?: string | undefined;
  targetLabel?: string | undefined;
  poseArt?: string | undefined;
  poseFallbackArt?: string | undefined;
  posePlayerId?: string | undefined;
  poseScale?: number | undefined;
  poseOffsetX?: number | undefined;
  poseOffsetY?: number | undefined;
  poseLeft?: number | undefined;
  poseTop?: number | undefined;
}

export interface TravelEffect extends BaseEffect {
  kind: "travel";
  distance: number;
}

export interface HitEffect extends BaseEffect {
  kind: "hit";
  amount: number | undefined;
}

export interface DodgeEffect extends BaseEffect {
  kind: "dodge";
}

export interface HealEffect extends BaseEffect {
  kind: "heal";
  amount: number | undefined;
}

export interface SkillEffect extends BaseEffect {
  kind: "skill";
  label: string;
}

export interface DeathEffect extends BaseEffect {
  kind: "death";
}

export type CombatEffect = TravelEffect | HitEffect | DodgeEffect | HealEffect | SkillEffect | DeathEffect;

const POSE_PRIORITY: Partial<Record<CombatEffect["kind"], number>> = {
  travel: 1,
  skill: 2,
  hit: 3,
};

function posePriority(effect: CombatEffect): number {
  return POSE_PRIORITY[effect.kind] ?? 0;
}

function outcomeSfx(effect: CombatEffect): SfxName | undefined {
  switch (effect.kind) {
    case "hit": return "damage";
    case "dodge": return "dodge";
    case "heal": return "heal";
    case "skill": return "skillUse";
    case "death": return "death";
    case "travel": return undefined;
  }
}

function anchorCenter(playerId: string): { x: number; y: number } | null {
  const nodes = document.querySelectorAll<HTMLElement>("[data-player-anchor]");
  for (const element of nodes) {
    if (element.dataset.playerAnchor !== playerId) continue;
    if (!element.isConnected) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
  return null;
}

function posePosition(anchor: { x: number; y: number }): { poseLeft: number; poseTop: number } {
  // Seats can sit close to the top/side edges on both the desktop ring and
  // mobile rail. The artwork is translated upward from its anchor, so using
  // the raw seat centre can put most of a full-body pose outside the viewport.
  // Keep the impact cue on the real seat while clamping only the artwork into
  // a safe battle area.
  if (window.innerHeight > 620) {
    return {
      poseLeft: Math.max(130, Math.min(window.innerWidth - 130, anchor.x)),
      poseTop: Math.max(260, Math.min(window.innerHeight - 48, anchor.y)),
    };
  }
  return {
    poseLeft: Math.max(82, Math.min(window.innerWidth - 82, anchor.x)),
    poseTop: Math.max(Math.min(168, window.innerHeight * 0.42), Math.min(window.innerHeight - 38, anchor.y)),
  };
}

type CombatPlayer = Pick<PlayerView, "id" | "name" | "generalId" | "faction">;

export interface CombatPresentationOptions {
  connected: boolean;
  matchId: string | undefined;
  logs: readonly GameLogView[] | undefined;
  players?: readonly CombatPlayer[] | undefined;
  play?: (name: SfxName) => void;
}

const ANCHOR_RETRY_INTERVAL_MS = 50;
const ANCHOR_RETRY_COUNT = 4;
const COMBAT_EVENT_INTERVAL_MS = 310;
const REDUCED_COMBAT_EVENT_INTERVAL_MS = 90;
const MAX_ACTIVE_COMBAT_EFFECTS = 10;

export function useCombatPresentation({
  connected,
  matchId,
  logs,
  players,
  play = playSfx,
}: CombatPresentationOptions): CombatEffect[] {
  const [effects, setEffects] = useState<CombatEffect[]>([]);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      for (const timer of timers.current) clearTimeout(timer);
      timers.current.clear();
    };
  }, []);

  useEffect(() => {
    if (typeof Image === "undefined") return;
    const sources = new Set<string>();
    for (const player of players ?? []) {
      for (const pose of ["attack", "hit", "skill"] as const) {
        const presentation = generalPosePresentation(player.generalId, player.faction, pose);
        if (presentation.art) sources.add(presentation.art);
      }
    }
    for (const source of sources) {
      const image = new Image();
      image.decoding = "async";
      image.src = source;
    }
  }, [players]);

  const clearPresentation = useCallback(() => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current.clear();
    setEffects([]);
  }, []);

  const present = useCallback((event: PresentationEvent) => {
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const playerById = new Map((players ?? []).map((player) => [player.id, player]));
    const playerLabel = (playerId: string | undefined) => playerId ? playerById.get(playerId)?.name ?? playerId : undefined;
    const posePresentation = (playerId: string, pose: GeneralPose, anchor: { x: number; y: number }) => {
      const player = playerById.get(playerId);
      if (!player) return {};
      const presentation = generalPosePresentation(player.generalId, player.faction, pose);
      return {
        poseArt: presentation.art,
        poseFallbackArt: presentation.fallbackArt,
        posePlayerId: playerId,
        poseScale: presentation.scale,
        poseOffsetX: presentation.offsetX,
        poseOffsetY: presentation.offsetY,
        ...posePosition(anchor),
      };
    };

    const schedule = (effect: CombatEffect, delayMs: number, durationMs: number) => {
      const show = () => {
        if (!mounted.current) return;
        setEffects((current) => {
          const withoutDuplicate = current.filter((item) => item.id !== effect.id);
          const hasHigherPriorityPose = Boolean(
            effect.poseArt
              && effect.posePlayerId
              && withoutDuplicate.some((item) => (
                item.poseArt
                && item.posePlayerId === effect.posePlayerId
                && posePriority(item) > posePriority(effect)
              )),
          );
          const nextEffect = hasHigherPriorityPose ? { ...effect, poseArt: undefined } : effect;
          return [
            ...withoutDuplicate.map((item) => (
              nextEffect.poseArt
                && nextEffect.posePlayerId
                && item.posePlayerId === nextEffect.posePlayerId
                ? { ...item, poseArt: undefined }
                : item
            )),
            nextEffect,
          ].slice(-MAX_ACTIVE_COMBAT_EFFECTS);
        });
        const sound = outcomeSfx(effect);
        if (sound) {
          try {
            play(sound);
          } catch {
            // Optional audio cannot own presentation or gameplay control flow.
          }
        }
        const removeTimer = setTimeout(() => {
          timers.current.delete(removeTimer);
          if (mounted.current) setEffects((current) => current.filter((item) => item.id !== effect.id));
        }, durationMs);
        timers.current.add(removeTimer);
      };

      if (delayMs === 0) show();
      else {
        const showTimer = setTimeout(() => {
          timers.current.delete(showTimer);
          show();
        }, delayMs);
        timers.current.add(showTimer);
      }
    };

    if (
      event.kind !== "skill"
      && event.kind !== "damage"
      && event.kind !== "dodge"
      && event.kind !== "heal"
      && event.kind !== "death"
    ) return;
    const targetPlayerId = event.kind === "skill" ? event.actorId : event.targetId;
    const sourceId = event.kind === "damage" || event.kind === "dodge" ? event.sourceId : undefined;

    const tryPresent = (retriesRemaining: number) => {
      if (!mounted.current) return;
      const target = anchorCenter(targetPlayerId);
      const source = !reducedMotion && sourceId ? anchorCenter(sourceId) : null;
      const waitingForTarget = !target;
      const waitingForDeclaredSource = Boolean(target && !reducedMotion && sourceId && !source);
      if ((waitingForTarget || waitingForDeclaredSource) && retriesRemaining > 0) {
        const retryTimer = setTimeout(() => {
          timers.current.delete(retryTimer);
          tryPresent(retriesRemaining - 1);
        }, ANCHOR_RETRY_INTERVAL_MS);
        timers.current.add(retryTimer);
        return;
      }
      if (!target) return;

      if (event.kind === "death") {
        schedule({ id: event.id, kind: "death", left: target.x, top: target.y, angleDeg: 0, targetLabel: playerLabel(event.targetId) }, 0, reducedMotion ? 360 : 1250);
        return;
      }
      if (event.kind === "skill") {
        schedule({
          id: event.id,
          kind: "skill",
          left: target.x,
          top: target.y,
          angleDeg: 0,
          sourceLabel: playerLabel(event.actorId),
          targetLabel: playerLabel(event.actorId),
          ...posePresentation(event.actorId, "skill", target),
          label: event.skillId ? skillById(event.skillId)?.name ?? event.skillId : "ใช้สกิล",
        }, 0, reducedMotion ? 360 : 920);
        return;
      }
      if (event.kind === "heal") {
        schedule({
          id: event.id,
          kind: "heal",
          left: target.x,
          top: target.y,
          angleDeg: 0,
          sourceLabel: playerLabel(event.sourceId),
          targetLabel: playerLabel(event.targetId),
          amount: event.amount,
        }, 0, reducedMotion ? 360 : 900);
        return;
      }

      const angleDeg = source ? (Math.atan2(target.y - source.y, target.x - source.x) * 180) / Math.PI : -35;
      if (source && !reducedMotion && sourceId) {
        schedule({
          id: `${event.id}:travel`,
          kind: "travel",
          left: source.x,
          top: source.y,
          angleDeg,
          sourceLabel: playerLabel(sourceId),
          targetLabel: playerLabel(targetPlayerId),
          distance: Math.hypot(target.x - source.x, target.y - source.y),
          ...posePresentation(sourceId, "attack", source),
        }, 0, 1450);
      }
      if (event.kind === "damage") {
        schedule({
          id: `${event.id}:hit`,
          kind: "hit",
          left: target.x,
          top: target.y,
          angleDeg,
          sourceLabel: playerLabel(event.sourceId),
          targetLabel: playerLabel(event.targetId),
          amount: event.amount,
          ...posePresentation(event.targetId, "hit", target),
        }, source && !reducedMotion ? 220 : 0, reducedMotion ? 520 : 1650);
      } else {
        schedule({
          id: event.id,
          kind: "dodge",
          left: target.x,
          top: target.y,
          angleDeg,
          sourceLabel: playerLabel(event.sourceId),
          targetLabel: playerLabel(event.targetId),
        }, source && !reducedMotion ? 220 : 0, reducedMotion ? 360 : 680);
      }
    };

    tryPresent(ANCHOR_RETRY_COUNT);
  }, [play, players]);

  usePresentationQueue({
    connected,
    matchId,
    logs,
    present,
    onReset: clearPresentation,
    intervalMs: (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false)
      ? REDUCED_COMBAT_EVENT_INTERVAL_MS
      : COMBAT_EVENT_INTERVAL_MS,
  });

  return effects;
}
