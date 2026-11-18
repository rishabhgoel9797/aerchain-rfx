"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Inbox, Boxes, Building2 } from "lucide-react";
import { REQUESTS, EVENTS } from "@/lib/portfolio";
import { ALL_SUPPLIERS } from "@/lib/fixtures";

type Hit = { kind: "Request" | "Sourcing event" | "Supplier"; title: string; sub: string; href: string };
const ICON = { Request: Inbox, "Sourcing event": Boxes, Supplier: Building2 };

/** Search across requests, sourcing events and suppliers. Press / to focus. */
export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  const all = useMemo<Hit[]>(() => [
    ...EVENTS.map((e) => ({ kind: "Sourcing event" as const, title: e.name, sub: `${e.id} · ${e.category} · ${e.plant}`, href: `/events/${e.id}` })),
    ...REQUESTS.map((r) => ({ kind: "Request" as const, title: r.title, sub: `${r.id} · from ${r.from} · ${r.when}`, href: `/requests/${r.id}` })),
    ...ALL_SUPPLIERS().map((s) => ({ kind: "Supplier" as const, title: s.name, sub: `${s.category} · ${s.city} · ${s.status}`, href: `/suppliers?q=${encodeURIComponent(s.name)}` })),
  ], []);
  const hits = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return all.filter((h) => words.every((w) => `${h.title} ${h.sub}`.toLowerCase().includes(w))).slice(0, 8);
  }, [q, all]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); ref.current?.focus(); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const go = (h?: Hit) => { if (!h) return; setOpen(false); setQ(""); router.push(h.href); };

  return (
    <div className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-lg border border-line bg-bg px-3 py-1.5 text-[13px] focus-within:border-purple/40">
        <Search size={15} className="text-muted" />
        <input
          ref={ref}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setI(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => Math.min(x + 1, hits.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => Math.max(x - 1, 0)); }
            if (e.key === "Enter") go(hits[i]);
            if (e.key === "Escape") { setOpen(false); ref.current?.blur(); }
          }}
          placeholder="Search requests, sourcing events, suppliers…"
          className="w-full bg-transparent text-ink outline-none placeholder:text-muted"
          aria-label="Search"
        />
      </div>
      {open && q.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-line bg-white shadow-xl">
          {hits.length ? hits.map((h, k) => {
            const I = ICON[h.kind];
            return (
              <button key={h.href + k} onMouseDown={(e) => { e.preventDefault(); go(h); }} onMouseEnter={() => setI(k)} className={`flex w-full items-center gap-3 px-3 py-2 text-left ${k === i ? "bg-tint" : ""}`}>
                <I size={15} className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-navy">{h.title}</span><span className="block truncate text-[11.5px] text-muted">{h.kind} · {h.sub}</span></span>
              </button>
            );
          }) : <div className="px-3 py-3 text-[13px] text-muted">Nothing matches “{q}”.</div>}
        </div>
      )}
    </div>
  );
}
