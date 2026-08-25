import { useId, useState } from "react";
import type { ContextHelpViewModel } from "../../data/contextHelp";

export function ContextHelpPanel({ model }: { model: ContextHelpViewModel | null }) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  if (!model) return null;

  return (
    <aside className={`table-context-help${open ? " is-open" : ""}`} role="region" aria-label="คำแนะนำจังหวะปัจจุบัน">
      <button
        type="button"
        className="table-context-help-toggle"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">?</span>
        คำแนะนำ
      </button>
      {open && (
        <div id={contentId} className="table-context-help-content">
          <strong>{model.title}</strong>
          <p>{model.summary}</p>
          {model.unavailable.length > 0 && (
            <div className="table-context-help-reasons">
              <b>ยังใช้ไม่ได้ตอนนี้</b>
              <ul>
                {model.unavailable.map((item) => (
                  <li key={item.key}>
                    <span>{item.label}</span>
                    <small>{item.reason}</small>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
