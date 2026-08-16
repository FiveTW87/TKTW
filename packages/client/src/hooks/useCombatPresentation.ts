import { useEffect, useRef, useState } from "react";
import type { GameLogView, PlayerView } from "@tktw/shared";
import { skillById } from "../data/generalSkills";
import { generalPosePresentation, type GeneralPose } from "../data/generalArt";

const EMPTY_LOGS: readonly GameLogView[] = [];

interface BaseEffect {
  id: string;
  left: number;
  top: number;
  angleDeg: number;
  poseArt?: string | undefined;
  poseFallbackArt?: string | undefined;
  posePlayerId?: string | undefined;
  poseScale?: number | undefined;
  poseOffsetX?: number | undefined;
  poseOffsetY?: number | undefined;
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

function anchorCenter(playerId: string): { x: number; y: number } | null {
  const nodes = document.querySelectorAll<HTMLElement>("[data-player-anchor]");
  for (const element of nodes) {
    if (element.dataset.playerAnchor !== playerId) continue;
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
  return null;
}

type CombatPlayer = Pick<PlayerView, "id" | "generalId" | "faction">;

export function useCombatPresentation(
  logs: readonly GameLogView[] | undefined,
  players: readonly CombatPlayer[] | undefined = undefined,
): CombatEffect[] {
  const entries = logs ?? EMPTY_LOGS;
  const [effects, setEffects] = useState<CombatEffect[]>([]);
  const previousCount = useRef<number | null>(null);
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

  useEffect(() => {
    const previous = previousCount.current;
    previousCount.current = entries.length;
    if (previous === null) return;
    if (entries.length < previous) {
      for (const timer of timers.current) clearTimeout(timer);
      timers.current.clear();
      setEffects([]);
      return;
    }
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const playerById = new Map((players ?? []).map((player) => [player.id, player]));
    const posePresentation = (playerId: string, pose: GeneralPose) => {
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
          ];
        });
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

    entries.slice(previous).forEach((entry, index) => {
      if (!entry.actorId) return;
      const target = anchorCenter(entry.actorId);
      if (!target) return;
      const baseDelay = index * 90;

      if (entry.eventType === "death") {
        schedule({
          id: `${entry.id}:death`,
          kind: "death",
          left: target.x,
          top: target.y,
          angleDeg: 0,
        }, baseDelay, reducedMotion ? 360 : 1250);
        return;
      }

      if (entry.eventType === "skillUse") {
        schedule({
          id: `${entry.id}:skill`,
          kind: "skill",
          left: target.x,
          top: target.y,
          angleDeg: 0,
          ...posePresentation(entry.actorId, "skill"),
          label: entry.skillId ? skillById(entry.skillId)?.name ?? entry.skillId : "ใช้สกิล",
        }, baseDelay, reducedMotion ? 360 : 920);
        return;
      }

      if (entry.eventType === "heal") {
        schedule({
          id: `${entry.id}:heal`,
          kind: "heal",
          left: target.x,
          top: target.y,
          angleDeg: 0,
          amount: entry.amount,
        }, baseDelay, reducedMotion ? 360 : 900);
        return;
      }

      if (entry.eventType !== "damage" && entry.eventType !== "dodge") return;
      const sourceId = entry.data?.sourceId ? String(entry.data.sourceId) : "";
      const source = sourceId ? anchorCenter(sourceId) : null;
      const angleDeg = source ? (Math.atan2(target.y - source.y, target.x - source.x) * 180) / Math.PI : -35;

      if (source && !reducedMotion) {
        schedule({
          id: `${entry.id}:travel`,
          kind: "travel",
          left: source.x,
          top: source.y,
          angleDeg,
          distance: Math.hypot(target.x - source.x, target.y - source.y),
          ...posePresentation(sourceId, "attack"),
        }, baseDelay, 520);
      }

      if (entry.eventType === "damage") {
        schedule({
          id: `${entry.id}:hit`,
          kind: "hit",
          left: target.x,
          top: target.y,
          angleDeg,
          amount: entry.amount,
          ...posePresentation(entry.actorId, "hit"),
        }, baseDelay + (source && !reducedMotion ? 220 : 0), reducedMotion ? 360 : 720);
      } else {
        schedule({
          id: `${entry.id}:dodge`,
          kind: "dodge",
          left: target.x,
          top: target.y,
          angleDeg,
        }, baseDelay + (source && !reducedMotion ? 220 : 0), reducedMotion ? 360 : 680);
      }
    });
  }, [entries, players]);

  return effects;
}
