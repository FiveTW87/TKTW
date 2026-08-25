import { useMemo, useState } from "react";
import type { StartTutorialInput } from "@tktw/shared";
import { createTutorialController } from "./tutorialController";
import { createTutorialProgressStorage } from "./tutorialProgress";
import { ALL_TUTORIAL_LESSONS } from "./tutorialLessons";

export function TutorialLessonPicker({
  onStart,
  onClose,
}: {
  onStart: (scenarioId: StartTutorialInput["scenarioId"]) => void;
  onClose: () => void;
}) {
  const storage = useMemo(() => createTutorialProgressStorage(window.localStorage), []);
  const [completed, setCompleted] = useState(() => new Set(
    ALL_TUTORIAL_LESSONS
      .filter((lesson) => createTutorialController(lesson.scenario, storage.load(lesson.id)).snapshot.status === "completed")
      .map((lesson) => lesson.id),
  ));

  const startFresh = (scenarioId: StartTutorialInput["scenarioId"]) => {
    storage.clear(scenarioId);
    onStart(scenarioId);
  };

  const reset = (scenarioId: StartTutorialInput["scenarioId"]) => {
    storage.clear(scenarioId);
    setCompleted((current) => {
      const next = new Set(current);
      next.delete(scenarioId);
      return next;
    });
  };

  return (
    <div className="tutorial-picker-backdrop" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="เลือกบทฝึกสอน"
        className="tutorial-picker"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="tutorial-picker__header">
          <div>
            <div className="tutorial-picker__eyebrow">ฝึกกับคู่ซ้อม · ใช้กติกาจริง</div>
            <h2>เลือกบทฝึกสอน</h2>
            <p>พื้นฐาน 3 บท และขั้นสูง 3 บท ใช้กติกาเดียวกับห้องจริง</p>
          </div>
          <button type="button" className="btn-secondary" aria-label="ปิดบทฝึกสอน" onClick={onClose}>×</button>
        </header>
        <div className="tutorial-picker__lessons">
          {ALL_TUTORIAL_LESSONS.map((lesson, index) => (
            <article key={lesson.id} className={`tutorial-lesson-card${completed.has(lesson.id) ? " is-completed" : ""}`}>
              <div className="tutorial-lesson-card__number">{index + 1}</div>
              <div className="tutorial-lesson-card__copy">
                <h3>{lesson.title}</h3>
                <p>{lesson.summary}</p>
                <span>{completed.has(lesson.id) ? "สำเร็จแล้ว" : `ประมาณ ${lesson.minutes} นาที`}</span>
              </div>
              <div className="tutorial-lesson-card__actions">
                <button type="button" className="btn-primary" aria-label={`เริ่มบท ${lesson.title}`} onClick={() => startFresh(lesson.id)}>
                  {completed.has(lesson.id) ? "เล่นซ้ำ" : "เริ่มบท"}
                </button>
                {completed.has(lesson.id) && (
                  <button type="button" className="btn-secondary" aria-label={`รีเซ็ตบท ${lesson.title}`} onClick={() => reset(lesson.id)}>รีเซ็ต</button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
