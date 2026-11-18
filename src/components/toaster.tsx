"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Info, X } from "lucide-react";

type T = { id: number; message: string; tone: "ok" | "info" };

export function Toaster() {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const { message, tone } = (e as CustomEvent).detail;
      const id = Date.now() + Math.random();
      setItems((x) => [...x.slice(-2), { id, message, tone }]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3800);
    };
    window.addEventListener("app-toast", on);
    return () => window.removeEventListener("app-toast", on);
  }, []);
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {items.map((t) => (
        <div key={t.id} role="status" className="pointer-events-auto flex max-w-lg items-center gap-2.5 rounded-xl bg-navy px-4 py-3 text-[13px] text-white shadow-2xl">
          {t.tone === "ok" ? <CircleCheck size={16} className="shrink-0 text-[#5fd3a5]" /> : <Info size={16} className="shrink-0 text-[#9cc3f7]" />}
          <span>{t.message}</span>
          <button onClick={() => setItems((x) => x.filter((i) => i.id !== t.id))} className="ml-1 text-white/60 hover:text-white" aria-label="Dismiss"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}
