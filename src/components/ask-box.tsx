"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { Sparkles, Paperclip, ArrowUp, ClipboardPaste, X, FileText, Loader2 } from "lucide-react";
import { toast } from "@/components/button";
import { InfoTip } from "@/components/ui";
import { goWhenReady } from "@/lib/go-when-ready";

type Mode = "any" | "internal" | "rfq";

const COPY: Record<Mode, { placeholder: string; button: string; starters: string[]; info: string }> = {
  any: {
    placeholder: "e.g. We need a yearly price agreement for 30 box sizes, about 10 lakh boxes, delivered to the Haridwar plant…",
    button: "Continue",
    starters: ["Yearly contract for 30 box sizes, delivered to Haridwar", "60 ergonomic office chairs for the new floor by 15 Dec", "500 kg dried Ashwagandha root, lab-tested, by December", "2,000 extra 5-ply boxes for the Haridwar line by month end"],
    info: "Describe what you need. The AI works out whether it's an internal request (a team asking you to buy something) or a request for quotes to send to suppliers, and drafts it. You check everything before anything is sent.",
  },
  internal: {
    placeholder: "Paste the team's WhatsApp or email, or describe what they need…",
    button: "Create request",
    starters: ["Baddi plant needs 18 box sizes for FY27, about 4 lakh boxes", "IT needs 120 laptops with monitors by January", "Canteen services contract for Haridwar plant from March"],
    info: "Turns a team's message into a structured request. The AI fills in what it can, lists what's missing, and checks for existing contracts and duplicate requests.",
  },
  rfq: {
    placeholder: "Describe what you want suppliers to quote for, or start from last year's request…",
    button: "Draft request for quotes",
    starters: ["Start from last year's box request", "Freight rates for 12 lanes, Haridwar and Baddi", "PET bottles 200 ml with flip-top caps, Baddi plant"],
    info: "The AI drafts the full request for quotes: items, quantities, price unit, delivery terms, quality questions and deadline. It asks about anything unclear before you send it.",
  },
};

export function AskBox({ mode, compact, defaultMode }: { mode: Mode; compact?: boolean; defaultMode?: "ai" | "internal" | "rfq" }) {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"ai" | "internal" | "rfq">(defaultMode ?? "ai");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [clarify, setClarify] = useState<string[]>([]);
  const [dup, setDup] = useState<{ requestId: string; eventId?: string; title: string; when: string; why: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const paste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t.trim()) { setText((x) => (x ? x + "\n" : "") + t); toast("Pasted from your clipboard"); return; }
      toast("Your clipboard is empty. Copy the WhatsApp or email text first.", "info");
    } catch {
      areaRef.current?.focus();
      toast("Click in the box and press ⌘V to paste the message", "info");
    }
  };
  const c = COPY[mode];

  /** Sends the message and files to Claude (POST /api/intake), then opens what it created. */
  const go = async (force = false) => {
    if (busy || (!text.trim() && !files.length)) return;
    setBusy(true);
    setDup(null);
    setClarify([]);
    try {
      const fd = new FormData();
      fd.append("text", text);
      fd.append("kind", mode === "any" ? kind : mode);
      files.forEach((f) => fd.append("files", f));
      if (force) fd.append("force", "yes");
      const res = await fetch("/api/intake", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) { toast(j.error ?? "Something went wrong. Nothing was saved.", "info"); setBusy(false); return; }
      if (j.clarify) { setClarify(j.clarify); setBusy(false); areaRef.current?.focus(); return; }
      if (j.duplicate) { setDup(j.duplicate); setBusy(false); return; }
      await goWhenReady(j.eventId ? `/events/${j.eventId}/request` : `/requests/${j.requestId}`, j.eventId ? { event: j.eventId, request: j.requestId } : { request: j.requestId });
    } catch {
      toast("Couldn't reach the app server. Is it still running?", "info");
      setBusy(false);
    }
  };

  return (
    <div>
      <div className={clsx("rounded-2xl border border-[#d9dcf5] bg-white p-2 shadow-[0_10px_30px_rgba(90,53,207,0.08)] focus-within:border-[#b7b0ec]")}>
        <div className="flex items-start gap-3 px-3 pt-2.5">
          <span className="brand-gradient mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-white"><Sparkles size={14} /></span>
          <textarea
            ref={areaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && text.trim()) { e.preventDefault(); go(); } }}
            rows={compact ? 1 : 2}
            placeholder={c.placeholder}
            className={clsx("flex-1 resize-none bg-transparent text-[14px] leading-relaxed text-ink outline-none placeholder:text-muted/80", compact ? "min-h-[28px]" : "min-h-[52px]")}
          />
          <InfoTip text={c.info} />
        </div>
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-2">
            {files.map((f, i) => (
              <span key={f.name + i} className="flex items-center gap-1.5 rounded-md border border-line bg-bg px-2 py-1 text-[12px] text-ink">
                <FileText size={13} className="text-muted" /> {f.name}
                <button type="button" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} className="text-muted hover:text-ink" aria-label="Remove"><X size={12} /></button>
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-1 pt-2">
          <div className="flex items-center gap-1">
            <input ref={fileRef} type="file" multiple accept=".xlsx,.docx,.pdf,.jpg,.jpeg,.png,.txt,.csv" className="hidden" onChange={(e) => { const n = Array.from(e.target.files ?? []); if (n.length) { setFiles((x) => [...x, ...n].slice(0, 5)); toast(`Attached ${n.length} ${n.length === 1 ? "file" : "files"}`); } e.target.value = ""; }} />
            <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] text-muted hover:bg-bg" title="Attach a spec sheet, drawing, photo or the team's email"><Paperclip size={15} /> Attach</button>
            <button type="button" onClick={paste} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] text-muted hover:bg-bg" title="Paste a WhatsApp or email message you've copied"><ClipboardPaste size={15} /> Paste a message</button>
            {mode === "any" && (
              <div className="ml-2 flex items-center gap-1 rounded-lg bg-bg p-0.5 text-[12px]">
                <span className="px-1.5 text-muted">Raise as</span>
                {([["ai", "Let AI decide"], ["internal", "Internal request"], ["rfq", "Request for quotes"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setKind(k)} className={clsx("rounded-md px-2 py-1 font-medium", kind === k ? "bg-white text-purple shadow-sm" : "text-muted hover:text-ink")}>{l}</button>
                ))}
                <InfoTip text="Internal request: a team is asking you to buy something. Request for quotes: you're asking suppliers for prices. Not sure? Let the AI decide." />
              </div>
            )}
          </div>
          <button onClick={() => go()} disabled={busy || (!text.trim() && files.length === 0)} className="flex items-center gap-1.5 rounded-lg bg-purple px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#1f6fd8] disabled:bg-[#b9d3f7]">
            {busy ? <><Loader2 size={15} className="animate-spin" /> QuoteLens is reading…</> : <>{c.button} <ArrowUp size={15} /></>}
          </button>
        </div>
      </div>
      {dup && (
        <div className="mt-2.5 rounded-xl border border-purple/25 bg-tint px-4 py-3 text-left text-[13px] text-ink">
          <div className="font-semibold text-navy">You already raised this: {dup.requestId} · {dup.title}</div>
          <div className="mt-0.5 text-[12px] text-muted">It has {dup.why} and arrived {dup.when}. Nothing new was saved.</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <a href={dup.eventId ? `/events/${dup.eventId}/request` : `/requests/${dup.requestId}`} className="rounded-lg bg-purple px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#1f6fd8]">Open {dup.eventId ?? dup.requestId}</a>
            <button type="button" onClick={() => go(true)} className="rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] font-semibold text-ink hover:border-purple/40">It&apos;s different, create a new one</button>
          </div>
        </div>
      )}
      {clarify.length > 0 && (
        <div className="mt-2.5 rounded-xl border border-orange/30 bg-[#fff8f1] px-4 py-3 text-left text-[13px] text-ink">
          <div className="mb-1 flex items-center gap-1.5 font-semibold text-navy"><Sparkles size={14} className="text-purple" /> Not enough to start yet. Nothing was saved. Could you add:</div>
          <ul className="list-disc space-y-0.5 pl-5">{clarify.map((q) => <li key={q}>{q}</li>)}</ul>
          <div className="mt-1 text-[12px] text-muted">Add the answers to your message above and send it again.</div>
        </div>
      )}
      <div className={clsx("mt-2.5 flex flex-wrap gap-2", !compact && "justify-center")}>
        {c.starters.map((s) => (
          <button key={s} onClick={() => setText(s)} className="rounded-full border border-line bg-white px-3 py-1 text-[12px] text-ink hover:border-purple/40 hover:text-purple">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
