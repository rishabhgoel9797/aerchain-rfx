"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "@/components/button";
import { InfoTip } from "@/components/ui";
import type { ChatTurn } from "@/lib/draft";

const STARTERS = ["Add 10% to all quantities", "Move the deadline to 5 Dec, 6 pm", "Ask suppliers for their lead time in days", "Deliver to both Baddi and Haridwar plants"];

/** Chat with the AI to change the draft. Claude picks the changes; code applies them; the draft above updates. */
export function DraftCopilot({ id, chat }: { id: string; chat: ChatTurn[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const send = async (msg = text) => {
    const m = msg.trim();
    if (!m || busy) return;
    setBusy(true);
    setPending(m);
    setText("");
    try {
      const res = await fetch("/api/events/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, instruction: m }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) { toast(j.error ?? "Something went wrong. Nothing was changed.", "info"); setText(m); }
      router.refresh();
    } catch {
      toast("Couldn't reach the app server. Is it still running?", "info");
      setText(m);
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  return (
    <div className="rounded-2xl border border-[#d9dcf5] bg-white">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-[14px] font-semibold text-indigo">
        <Sparkles size={15} className="text-purple" /> Change the draft with AI
        <InfoTip text="Tell the AI what to change in plain words. It picks the changes; code applies them (it never works out quantities itself). Changes show in orange above and are logged in Change history." />
      </div>
      {(chat.length > 0 || pending) && (
        <div className="max-h-[320px] space-y-2 overflow-y-auto px-4 py-3">
          {chat.map((t, i) => (
            <div key={i} className={t.role === "me" ? "ml-12 rounded-2xl rounded-br-md bg-navy px-3.5 py-2 text-[13px] text-white" : "mr-12 rounded-2xl rounded-bl-md bg-tint px-3.5 py-2 text-[13px] text-ink"}>
              {t.text}
              {t.changes && t.changes.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 text-[12px] text-muted">{t.changes.map((c) => <li key={c} className="flex gap-1"><Check size={12} className="mt-0.5 shrink-0 text-ok" />{c}</li>)}</ul>
              )}
            </div>
          ))}
          {pending && <div className="ml-12 rounded-2xl rounded-br-md bg-navy px-3.5 py-2 text-[13px] text-white">{pending}</div>}
          {pending && <div className="mr-12 flex items-center gap-2 rounded-2xl rounded-bl-md bg-tint px-3.5 py-2 text-[13px] text-muted"><Loader2 size={13} className="animate-spin text-purple" /> QuoteLens is updating the draft…</div>}
        </div>
      )}
      <div className="flex items-end gap-2 border-t border-line p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={1}
          placeholder="e.g. Add 10% to all quantities, or move the deadline to 5 Dec"
          className="min-h-[36px] flex-1 resize-none rounded-lg bg-bg px-3 py-2 text-[13px] text-ink outline-none placeholder:text-muted/80"
          disabled={busy}
        />
        <button onClick={() => send()} disabled={busy || !text.trim()} className="flex items-center gap-1.5 rounded-lg bg-purple px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#1f6fd8] disabled:bg-[#b9d3f7]">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={14} />} Send
        </button>
      </div>
      {chat.length === 0 && !pending && (
        <div className="flex flex-wrap gap-2 px-3 pb-3">
          {STARTERS.map((s) => <button key={s} onClick={() => send(s)} disabled={busy} className="rounded-full border border-line bg-white px-3 py-1 text-[12px] text-ink hover:border-purple/40 hover:text-purple">{s}</button>)}
        </div>
      )}
    </div>
  );
}
