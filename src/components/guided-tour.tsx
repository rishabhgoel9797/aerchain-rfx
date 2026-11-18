"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Compass, X } from "lucide-react";
import { stepsFor, type TourStep } from "@/lib/tour-steps";

/**
 * Guided tour of the page you're on. Spotlights one part of the screen at a time with a short explanation.
 * Start it any time from "Take a tour" in the top bar (or ?tour=1). Esc closes, ← → move between steps.
 * Targets are found by CSS selector or by visible text ("text:Supplier inbox"); a step whose target isn't on
 * the screen is shown in the middle instead, so the tour never breaks when a page looks different.
 */

const START = "quotelens:tour";
export const startTour = () => window.dispatchEvent(new Event(START));

function visible(el: Element) {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
}

/** Visible text of an element, leaving out hidden tooltip text (the ⓘ explanations). */
function textWithoutTips(el: Element) {
  let t = el.textContent ?? "";
  for (const tip of Array.from(el.querySelectorAll("[role=tooltip]"))) t = t.replace(tip.textContent ?? "", "");
  return t;
}

/** Smallest visible element whose text (or placeholder) starts with the given words. */
function byText(text: string): Element | null {
  const want = text.toLowerCase();
  let best: Element | null = null;
  let bestArea = Infinity;
  for (const el of Array.from(document.querySelectorAll("main h1, main h2, main h3, main h4, main button, main a, main label, main span, main div, main p, main th, main input, main textarea, aside a, aside button, header button, header input"))) {
    const own = (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.placeholder : textWithoutTips(el)).trim().toLowerCase();
    if (!own.startsWith(want) || own.length > want.length + 90 || !visible(el)) continue;
    const r = el.getBoundingClientRect();
    const area = r.width * r.height;
    if (area < bestArea) { best = el; bestArea = area; }
  }
  return best;
}

function find(targets: string[] = []): Element | null {
  for (const t of targets) {
    const el = t.startsWith("text:") ? byText(t.slice(5)) : document.querySelector(t);
    if (el && visible(el)) {
      // A heading or field alone is small: spotlight the card it belongs to, but only if that card is a sensible size.
      const card = el.closest("[class*='rounded-xl'], [class*='rounded-2xl']");
      const r = card?.getBoundingClientRect();
      return card && r && r.height < window.innerHeight * 0.55 && r.width < window.innerWidth * 0.8 ? card : el;
    }
  }
  return null;
}

export function GuidedTour() {
  const path = usePathname();
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [i, setI] = useState(-1);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [offer, setOffer] = useState(false);

  const close = useCallback(() => { setI(-1); setRect(null); }, []);
  const start = useCallback(() => {
    setOffer(false);
    setSteps(stepsFor(window.location.pathname).filter((s) => !s.optional || find(s.target))); // skip steps this page doesn't have
    setI(0);
    try { localStorage.setItem("ql-tour-offered", "1"); } catch {}
  }, []);

  useEffect(() => {
    window.addEventListener(START, start);
    if (new URLSearchParams(window.location.search).get("tour") === "1") setTimeout(start, 600);
    else { try { if (!localStorage.getItem("ql-tour-offered")) setTimeout(() => setOffer(true), 1200); } catch {} }
    return () => window.removeEventListener(START, start);
  }, [start]);

  useEffect(() => { close(); }, [path, close]); // a new page has its own tour

  // Find and measure the current step's target; follow scrolling and resizing.
  useLayoutEffect(() => {
    if (i < 0 || !steps[i]) return;
    const el = find(steps[i].target);
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    const measure = () => setRect(el ? el.getBoundingClientRect() : null);
    const t = setTimeout(measure, 380);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); window.removeEventListener("scroll", measure, true); window.removeEventListener("resize", measure); };
  }, [i, steps]);

  useEffect(() => {
    if (i < 0) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setI((x) => (x < steps.length - 1 ? x + 1 : x));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [i, steps.length, close]);

  if (offer && i < 0)
    return (
      <div className="fixed right-6 top-16 z-[120] w-72 rounded-2xl border border-[#d9dcf5] bg-white p-4 shadow-2xl">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-navy"><Compass size={16} className="text-purple" /> New here?</div>
        <p className="mt-1 text-[13px] text-ink">Take a one-minute tour of this page. You can run it again any time from <b>Take a tour</b> at the top.</p>
        <div className="mt-3 flex gap-2">
          <button onClick={start} className="rounded-lg bg-purple px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-[#1f6fd8]">Start the tour</button>
          <button onClick={() => { setOffer(false); try { localStorage.setItem("ql-tour-offered", "1"); } catch {} }} className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-muted hover:text-ink">Not now</button>
        </div>
      </div>
    );

  if (i < 0 || !steps[i]) return null;
  const s = steps[i];
  const pad = 8;
  const W = 340;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  // Popover below the target if there's room, else above; centred when there's no target.
  let top = vh / 2 - 90, left = vw / 2 - W / 2;
  if (rect) {
    left = Math.min(Math.max(12, rect.left + rect.width / 2 - W / 2), vw - W - 12);
    top = rect.bottom + pad + 12 + 190 < vh ? rect.bottom + pad + 12 : Math.max(12, rect.top - pad - 12 - 190);
  }

  return (
    <div className="fixed inset-0 z-[150]" aria-live="polite">
      {rect ? (
        <>
          {/* Four dim panels around the highlighted area (more reliable than a giant shadow). */}
          {[
            { top: 0, left: 0, width: vw, height: Math.max(0, rect.top - pad) },
            { top: rect.bottom + pad, left: 0, width: vw, height: Math.max(0, vh - rect.bottom - pad) },
            { top: rect.top - pad, left: 0, width: Math.max(0, rect.left - pad), height: rect.height + pad * 2 },
            { top: rect.top - pad, left: rect.right + pad, width: Math.max(0, vw - rect.right - pad), height: rect.height + pad * 2 },
          ].map((b, k) => <div key={k} className="pointer-events-none fixed bg-[rgba(15,23,42,0.55)] transition-all duration-300" style={b} />)}
          <div className="pointer-events-none fixed rounded-xl ring-2 ring-purple transition-all duration-300" style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />
        </>
      ) : (
        <div className="fixed inset-0 bg-[rgba(15,23,42,0.55)]" />
      )}
      <div className="absolute inset-0" onClick={close} />
      <div role="dialog" aria-label={s.title} className="fixed rounded-2xl bg-white p-4 shadow-2xl transition-all duration-300" style={{ top, left, width: W }}>
        <div className="flex items-start gap-2">
          <Compass size={16} className="mt-0.5 shrink-0 text-purple" />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-navy">{s.title}</div>
            <p className="mt-1 text-[13px] leading-relaxed text-ink">{s.body}</p>
          </div>
          <button onClick={close} className="text-muted hover:text-ink" aria-label="Close tour"><X size={15} /></button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[11.5px] text-muted">{i + 1} of {steps.length}</span>
          <div className="ml-auto flex gap-2">
            {i > 0 && <button onClick={() => setI(i - 1)} className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-muted hover:text-ink">Back</button>}
            {i < steps.length - 1
              ? <button onClick={() => setI(i + 1)} className="rounded-lg bg-purple px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-[#1f6fd8]">Next</button>
              : <button onClick={close} className="rounded-lg bg-purple px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-[#1f6fd8]">Done</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** "Take a tour" button for the top bar. */
export function TourButton() {
  return (
    <button type="button" onClick={startTour} className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12.5px] font-semibold text-purple hover:border-purple/40 hover:bg-tint" title="A short guided tour of this page">
      <Compass size={15} /> Take a tour
    </button>
  );
}
