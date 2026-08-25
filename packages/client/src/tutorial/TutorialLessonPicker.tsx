import type { StartTutorialInput } from "@tktw/shared";
import { BASIC_TUTORIAL_LESSONS } from "./basicLessons";

export function TutorialLessonPicker({
  onStart,
  onClose,
}: {
  onStart: (scenarioId: StartTutorialInput["scenarioId"]) => void;
  onClose: () => void;
}) {
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
            <p>เริ่มทีละบท ใช้เวลารวมประมาณ 10–15 นาที</p>
          </div>
          <button type="button" className="btn-secondary" aria-label="ปิดบทฝึกสอน" onClick={onClose}>×</button>
        </header>
        <div className="tutorial-picker__lessons">
          {BASIC_TUTORIAL_LESSONS.map((lesson, index) => (
            <article key={lesson.id} className="tutorial-lesson-card">
              <div className="tutorial-lesson-card__number">{index + 1}</div>
              <div className="tutorial-lesson-card__copy">
                <h3>{lesson.title}</h3>
                <p>{lesson.summary}</p>
                <span>ประมาณ {lesson.minutes} นาที</span>
              </div>
              <button
                type="button"
                className="btn-primary"
                aria-label={`เริ่มบท ${lesson.title}`}
                onClick={() => onStart(lesson.id)}
              >
                เริ่มบท
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
