import { useEffect, useMemo, useState } from "react";
import type { StartTutorialInput } from "@tktw/shared";
import { acceptedActionChannel } from "../lib/acceptedActionChannel";
import { basicTutorialLesson } from "./basicLessons";
import { createTutorialProgressStorage } from "./tutorialProgress";
import {
  createTutorialController,
  transitionTutorial,
  TutorialScriptError,
  type TutorialController,
  type TutorialHighlight,
} from "./tutorialController";

export interface TutorialCoachProps {
  scenarioId: StartTutorialInput["scenarioId"];
  onExit: () => void;
  onRestart: () => void;
  onNext: () => void;
}

export function TutorialCoach({ scenarioId, onExit, onRestart, onNext }: TutorialCoachProps) {
  const lesson = useMemo(() => basicTutorialLesson(scenarioId), [scenarioId]);
  const storage = useMemo(() => createTutorialProgressStorage(window.localStorage), []);
  const [controller, setController] = useState<TutorialController>(() =>
    createTutorialController(lesson.scenario, storage.load(scenarioId)),
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setController(createTutorialController(lesson.scenario, storage.load(scenarioId)));
    setMessage(null);
  }, [lesson, scenarioId, storage]);

  useEffect(() => acceptedActionChannel.subscribe((observation) => {
    setController((current) => {
      try {
        const transition = transitionTutorial(current, observation);
        if (transition.outcome.kind === "retry") {
          setMessage("การกระทำนี้ไม่ตรงกับขั้นฝึก ลองเริ่มสถานการณ์นี้ใหม่ได้ทันที");
          return current;
        }
        setMessage(null);
        storage.save(transition.controller.progress);
        return transition.controller;
      } catch (error) {
        setMessage(error instanceof TutorialScriptError
          ? "บทฝึกกับสถานะเกมไม่ตรงกัน กรุณาเริ่มสถานการณ์นี้ใหม่"
          : "บทฝึกเกิดข้อผิดพลาด กรุณาเริ่มสถานการณ์นี้ใหม่");
        return current;
      }
    });
  }), [storage]);

  useEffect(() => {
    if (controller.snapshot.status !== "active") return;
    const element = findHighlightElement(controller.snapshot.step.highlight);
    element?.classList.add("tutorial-highlight");
    return () => element?.classList.remove("tutorial-highlight");
  }, [controller.snapshot]);

  const snapshot = controller.snapshot;
  return (
    <aside className="tutorial-coach" role="status" aria-label="บทฝึกสอน" aria-live="polite">
      <div className="tutorial-coach__eyebrow">โหมดฝึกสอน · {lesson.minutes} นาที</div>
      <div className="tutorial-coach__row">
        <div className="tutorial-coach__copy">
          <strong>{snapshot.title}</strong>
          {snapshot.status === "active" ? (
            <>
              <span>ขั้น {snapshot.stepIndex + 1}/{snapshot.stepCount}</span>
              <p>{snapshot.step.prompt}</p>
            </>
          ) : (
            <p>สำเร็จแล้ว พร้อมไปบทถัดไป</p>
          )}
          {message && <p className="tutorial-coach__error">{message}</p>}
        </div>
        <div className="tutorial-coach__actions">
          {message && <button type="button" className="btn-primary" onClick={onRestart}>เริ่มสถานการณ์ใหม่</button>}
          {snapshot.status === "completed" && (
            <>
              <button type="button" className="btn-primary" onClick={onNext}>บทถัดไป</button>
              <button type="button" className="btn-secondary" onClick={onRestart}>เล่นซ้ำ</button>
            </>
          )}
          <button type="button" className="btn-secondary" onClick={onExit}>ออกจากบทฝึก</button>
        </div>
      </div>
    </aside>
  );
}

function findHighlightElement(highlight: TutorialHighlight): HTMLElement | null {
  if (highlight.kind === "player") {
    return document.querySelector<HTMLElement>(`[data-player-anchor="${CSS.escape(highlight.playerId)}"]`);
  }
  const selector = highlightSelector(highlight.anchor);
  return selector ? document.querySelector<HTMLElement>(selector) : null;
}

function highlightSelector(anchor: Extract<TutorialHighlight, { kind: "anchor" }>["anchor"]): string | null {
  switch (anchor) {
    case "drawPile": return '[data-card-motion-anchor="pile:draw"]';
    case "discardPile": return '[data-card-motion-anchor="pile:discard"]';
    case "hand": return '[data-card-motion-anchor$=":hand"]';
    case "equipment": return '[data-card-motion-anchor$=":equipment"]';
    case "skills": return '[data-tutorial-anchor="skills"]';
    case "endPhase": return '[data-tutorial-anchor="endPhase"]';
    case "players": return "[data-player-anchor]";
  }
}
