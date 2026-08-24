import { useEffect, useRef, useState } from "react";
import { useAssistStore } from "../store/assistStore";

const STEPS = [
  {
    title: "กลางโต๊ะและสถานะปัจจุบัน",
    body: "บริเวณกลางโต๊ะบอกว่าใครกำลังทำอะไร รวมถึงกองจั่ว กองทิ้ง และการ์ดที่กำลังมีผล",
    selectors: [".mobile-battle-arena", ".table-central-anchor"],
  },
  {
    title: "ผู้เล่นรอบโต๊ะ",
    body: "ตำแหน่งผู้เล่นเรียงตามที่นั่งจริง แตะผู้เล่นเพื่อดูรายละเอียด ระยะ และอุปกรณ์ที่ติดอยู่",
    selectors: [".mobile-opponent-rail", ".table-board-ring"],
  },
  {
    title: "พื้นที่ของคุณ",
    body: "ด้านล่างคือข้อมูลตัวละคร สกิล การ์ดในมือ และอุปกรณ์ของคุณ ระบบจะไม่เลือกการ์ดหรือเป้าหมายแทน",
    selectors: [".mobile-command-dock", ".table-self-dock"],
  },
  {
    title: "เมนูช่วยเหลือ",
    body: "เปิดกติกา ปรับคำแนะนำและเสียง หรือออกจากโต๊ะได้จากเมนูมุมจอ คุณกลับมาดูคำแนะนำนี้ซ้ำได้เสมอ",
    selectors: [".table-utility-rail"],
  },
] as const;

export function FirstTableWalkthrough() {
  const level = useAssistStore((state) => state.level);
  const walkthrough = useAssistStore((state) => state.walkthrough);
  const beginIfNeeded = useAssistStore((state) => state.beginIfNeeded);
  const next = useAssistStore((state) => state.nextWalkthroughStep);
  const previous = useAssistStore((state) => state.previousWalkthroughStep);
  const pause = useAssistStore((state) => state.pauseWalkthrough);
  const skip = useAssistStore((state) => state.skipWalkthrough);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const [highlight, setHighlight] = useState<DOMRect | null>(null);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);

  useEffect(() => {
    beginIfNeeded();
  }, [beginIfNeeded]);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const onChange = () => setReducedMotion(media.matches);
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    if (walkthrough.status !== "active") return;
    nextButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") pause();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pause, walkthrough.status, walkthrough.step]);

  const stepIndex = Math.min(walkthrough.step, STEPS.length - 1);
  const step = STEPS[stepIndex] ?? STEPS[0];
  const isLast = stepIndex === STEPS.length - 1;
  const active = level !== "off" && walkthrough.status === "active";
  const panelAtTop = !!highlight && highlight.top > window.innerHeight * 0.48;

  useEffect(() => {
    if (!active) {
      setHighlight(null);
      return;
    }
    const updateHighlight = () => {
      const element = step.selectors
        .map((selector) => document.querySelector<HTMLElement>(selector))
        .find((candidate) => {
          if (!candidate?.isConnected) return false;
          const rect = candidate.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      setHighlight(element?.getBoundingClientRect() ?? null);
    };
    updateHighlight();
    window.addEventListener("resize", updateHighlight);
    window.addEventListener("orientationchange", updateHighlight);
    return () => {
      window.removeEventListener("resize", updateHighlight);
      window.removeEventListener("orientationchange", updateHighlight);
    };
  }, [active, step]);

  if (!active) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 170, background: highlight ? "transparent" : "rgba(5,3,2,.66)", pointerEvents: "none", overflow: "hidden" }}>
      {highlight && (
        <div
          data-assist-highlight
          aria-hidden="true"
          style={{ position: "fixed", left: highlight.left - 8, top: highlight.top - 8, width: highlight.width + 16, height: highlight.height + 16, border: "2px solid var(--gold-light)", borderRadius: 14, boxShadow: "0 0 0 9999px rgba(5,3,2,.68), 0 0 24px rgba(217,165,49,.72)", pointerEvents: "none", transition: reducedMotion ? "none" : "left 160ms ease, top 160ms ease, width 160ms ease, height 160ms ease" }}
        />
      )}
      <section
        role="region"
        aria-label="คำแนะนำโต๊ะเล่น"
        aria-live="polite"
        style={{ position: "absolute", left: "50%", top: panelAtTop ? 24 : "auto", bottom: panelAtTop ? "auto" : "max(24px, env(safe-area-inset-bottom, 0px))", transform: "translateX(-50%)", width: 460, maxWidth: "calc(100vw - 28px)", border: "1px solid var(--gold)", borderRadius: 14, padding: "18px 20px", background: "linear-gradient(145deg,rgba(42,29,17,.98),rgba(19,12,7,.98))", boxShadow: "0 18px 60px rgba(0,0,0,.7)", color: "var(--ink)", pointerEvents: "auto" }}
      >
        <div style={{ color: "var(--gold)", fontSize: 11, letterSpacing: 1 }}>แนะนำโต๊ะ · {stepIndex + 1}/{STEPS.length}</div>
        <h2 style={{ margin: "5px 0 7px", fontSize: 20 }}>{step.title}</h2>
        <p style={{ margin: 0, color: "var(--ink-muted)", fontSize: 13, lineHeight: 1.6 }}>{step.body}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 15, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 7 }}>
            <button type="button" className="btn-secondary" onClick={skip} style={{ padding: "7px 10px", minHeight: 40, fontSize: 11 }}>ข้ามคำแนะนำ</button>
            <button type="button" className="btn-secondary" onClick={pause} style={{ padding: "7px 10px", minHeight: 40, fontSize: 11 }}>ไว้ทีหลัง</button>
          </div>
          <div style={{ display: "flex", gap: 7 }}>
            {stepIndex > 0 && <button type="button" className="btn-secondary" onClick={previous} style={{ padding: "8px 14px", minHeight: 40 }}>ย้อนกลับ</button>}
            <button ref={nextButtonRef} type="button" className="btn-primary" onClick={() => next(STEPS.length)} style={{ padding: "8px 18px", minHeight: 40 }}>
              {isLast ? "เข้าใจแล้ว" : "ถัดไป"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
