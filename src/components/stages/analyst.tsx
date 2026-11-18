"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell as BarCell } from "recharts";
import { Send, Sparkles, Calculator, RotateCcw, Loader2, AlertTriangle } from "lucide-react";
import { priceGaps } from "@/lib/analysis";
import { InfoTip } from "@/components/ui";
import { toast } from "@/components/button";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

type Step = { tool: string; label: string };
type Msg = { role: "user" | "assistant"; text: string; steps?: Step[]; meta?: string; error?: boolean };

const SUGGESTIONS = [
  "Who is cheapest overall?",
  "Cheapest per box, only suppliers who passed quality",
  "What if we drop Rajdhani and delivery adds 6% for everyone?",
  "Which boxes have the biggest price gaps?",
  "How does this compare to last year?",
  "Is Om Sai's 5% all-items discount worth taking?",
  "Write a summary for my boss",
];
const STORE = "quotelens-ask-RFQ-2026-014";

/** Bold (**x**) inside a line. */
function inline(s: string): ReactNode {
  return s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <b key={i} className="font-semibold text-navy">{p.slice(2, -2)}</b> : <Fragment key={i}>{p}</Fragment>));
}

/** Tiny renderer for the answer: paragraphs, bullet lists and simple markdown tables. */
function Answer({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; ) {
    const l = lines[i].trim();
    if (!l) { i++; continue; }
    if (l.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      blocks.push(
        <div key={i} className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-[13px]">
            <thead className="bg-bg text-left text-muted"><tr>{head.map((h, k) => <th key={k} className="px-3 py-2 font-semibold">{inline(h)}</th>)}</tr></thead>
            <tbody>{body.map((r, k) => <tr key={k} className="border-t border-line">{r.map((c, j) => <td key={j} className={`px-3 py-2 ${/^[₹\d+\-−]/.test(c) ? "num" : ""}`}>{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^[-*•] /.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•] /.test(lines[i].trim())) { items.push(lines[i].trim().slice(2)); i++; }
      blocks.push(<ul key={i} className="space-y-1.5 pl-1">{items.map((t, k) => <li key={k} className="flex gap-2"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-purple" /><span className="min-w-0">{inline(t)}</span></li>)}</ul>);
      continue;
    }
    blocks.push(<p key={i}>{inline(l.replace(/^#+\s*/, ""))}</p>);
    i++;
  }
  return <div className="space-y-3 text-sm leading-relaxed text-ink">{blocks}</div>;
}

function Bubble({ m }: { m: Msg }) {
  if (m.role === "user") return <div className="flex justify-end"><div className="max-w-[75%] rounded-2xl rounded-br-md bg-navy px-4 py-2.5 text-sm text-white">{m.text}</div></div>;
  return (
    <div className="flex gap-3">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white ${m.error ? "bg-bad" : "brand-gradient"}`}>{m.error ? <AlertTriangle size={15} /> : <Sparkles size={15} />}</span>
      <div className="min-w-0 flex-1 space-y-3">
        {m.steps && m.steps.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted">What I calculated <InfoTip text="The AI chose these calculations. The maths itself was done by code on the converted quotes, so every number is exact and traceable." /></span>
            {m.steps.map((s, k) => <span key={k} className="inline-flex items-center gap-1 rounded-full border border-line bg-bg px-2.5 py-0.5 text-[11.5px] text-ink"><Calculator size={11} className="text-purple" />{s.label}</span>)}
          </div>
        )}
        {m.error ? <p className="text-sm text-bad">{m.text}</p> : <Answer text={m.text} />}
        {m.meta && <div className="text-[11px] text-muted">{m.meta}</div>}
      </div>
    </div>
  );
}

export function Analyst({ eventId, intro, suggestions }: { eventId?: string; intro?: string; suggestions?: string[] } = {}) {
  const store = eventId ? `quotelens-ask-${eventId}` : STORE;
  const tries = suggestions ?? SUGGESTIONS;
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const gaps = priceGaps().slice(0, 8).map((g) => ({ id: g.id, gap: g.gap }));

  useEffect(() => { try { const s = sessionStorage.getItem(store); if (s) setMsgs(JSON.parse(s)); } catch {} }, [store]);
  useEffect(() => { try { sessionStorage.setItem(store, JSON.stringify(msgs)); } catch {} end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy, store]);

  async function ask(text: string) {
    const question = text.trim();
    if (!question) { toast("Type a question first, or pick one on the right.", "info"); return; }
    if (busy) return;
    const history = msgs.filter((m) => !m.error).map((m) => ({ role: m.role, text: m.text, steps: m.steps }));
    setMsgs((x) => [...x, { role: "user", text: question }]);
    setQ("");
    setBusy(true);
    try {
      const res = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, history, event: eventId }) });
      const j = await res.json();
      if (!res.ok || j.error) setMsgs((x) => [...x, { role: "assistant", text: j.error ?? "Something went wrong.", error: true }]);
      else setMsgs((x) => [...x, { role: "assistant", text: j.answer, steps: j.steps, meta: `Answered by ${j.model} in ${(j.ms / 1000).toFixed(1)}s` }]);
    } catch {
      setMsgs((x) => [...x, { role: "assistant", text: "Couldn't reach the app server. Is it still running?", error: true }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-5">
      <div className="flex h-[680px] flex-col rounded-2xl border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-navy"><Sparkles size={15} className="text-[#5a35cf]" /> Ask about these quotes <InfoTip text="Live AI analyst. It reads your question, runs the right calculation on the converted quotes, and explains the result in plain words." /></div>
          {msgs.length > 0 && <button onClick={() => { setMsgs([]); toast("Started a new conversation", "info"); }} className="inline-flex items-center gap-1 text-[12px] font-semibold text-purple hover:underline"><RotateCcw size={12} /> New conversation</button>}
        </div>
        <div className="flex-1 space-y-6 overflow-auto p-6">
          {msgs.length === 0 && (
            <div className="flex gap-3">
              <span className="brand-gradient grid h-8 w-8 shrink-0 place-items-center rounded-full text-white"><Sparkles size={15} /></span>
              <div className="space-y-2 text-sm leading-relaxed text-ink">
                {intro ? <p>{intro}</p> : <p>Hi Rishabh. I’ve got all <b>5 replies</b> for the 30 corrugated boxes, already converted to ₹ per box before GST, delivered to Haridwar.</p>}
                <p>Ask me who’s cheapest, what happens if you drop a supplier or prices go up, how this compares with last year, or for a summary to send up. I run the sums in code and tell you exactly what I left out.</p>
              </div>
            </div>
          )}
          {msgs.map((m, i) => <Bubble key={i} m={m} />)}
          {busy && <div className="flex items-center gap-2 pl-11 text-[13px] text-muted"><Loader2 size={14} className="animate-spin text-purple" /> Choosing the calculation and running it…</div>}
          <div ref={end} />
        </div>
        <div className="border-t border-line p-4">
          <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex items-center gap-2 rounded-xl border border-line bg-bg px-4 py-2.5">
            <input value={q} onChange={(e) => setQ(e.target.value)} disabled={busy} placeholder="Ask anything about the quotes, e.g. ‘Who is cheapest if delivery adds 6%?’" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted disabled:opacity-60" />
            <button type="submit" disabled={busy} className="grid h-8 w-8 place-items-center rounded-lg bg-purple text-white disabled:opacity-50" aria-label="Ask">{busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}</button>
          </form>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="mb-3 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted">Try asking <InfoTip text="Click a question to ask it straight away. You can also type your own below the chat." /></div>
          <div className="space-y-2">
            {tries.map((s) => <button key={s} disabled={busy} onClick={() => ask(s)} className="w-full rounded-lg border border-line px-3 py-2 text-left text-[13px] text-indigo hover:border-purple/40 hover:bg-tint disabled:opacity-50">{s}</button>)}
          </div>
        </div>
        <div className={`rounded-2xl border border-line bg-white p-4 ${eventId ? "hidden" : ""}`}>
          <div className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted">Biggest price gaps <InfoTip text="For each box: (highest price − lowest price) ÷ lowest price, green prices only. Big gaps are the best boxes to negotiate on." /></div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gaps} margin={{ top: 8, right: 4, bottom: 0, left: -24 }}>
                <XAxis dataKey="id" tick={{ fontSize: 10, fill: "#6b6f80" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#6b6f80" }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip formatter={(v) => [`${v}%`, "Gap"]} cursor={{ fill: "rgba(55,49,146,0.06)" }} />
                <Bar dataKey="gap" radius={[5, 5, 0, 0]}>{gaps.map((g, i) => <BarCell key={g.id} fill={i < 3 ? "#2f80ed" : "#a9c9f5"} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4 text-[13px] text-ink">
          <div className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted">What the AI promises <InfoTip text="These rules are built into the analyst, so the answers are safe to act on." /></div>
          <ul className="space-y-1.5">
            <li>• Never makes up a number: code does every sum</li>
            <li>• Says when the data can’t answer</li>
            <li>• Asks back when a question is unclear</li>
            <li>• Missing prices are never counted as zero</li>
            <li>• Says which suppliers and prices it left out</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
