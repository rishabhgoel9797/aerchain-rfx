"use client";

import { useState } from "react";
import clsx from "clsx";
import { Lock, Unlock, ArrowRight, Search, X } from "lucide-react";
import { RESPONDERS, reviewQueue, inr } from "@/lib/fixtures";
import { Card, Pill, Button, Dot, InfoTip, Person } from "@/components/ui";
import { toast } from "@/components/button";
import { SourcePanel } from "@/components/source-panel";

const ACTIONS = [
  { key: "Accepted", label: "Looks right", variant: "primary" as const, info: "The AI read it correctly. Mark it as checked." },
  { key: "Corrected", label: "Correct it", variant: "secondary" as const, info: "Type the right value. The old value, your name and the time are saved." },
  { key: "Asked supplier", label: "Ask the supplier", variant: "secondary" as const, info: "Records that you're asking the supplier to clarify. Sending the message is simulated in this demo." },
  { key: "Left out", label: "Leave it out", variant: "danger" as const, info: "Remove this value from the comparison. You'll be asked for a reason." },
];

export function Review({ initial = {}, initialSup = "" }: { initial?: Record<string, string>; initialSup?: string }) {
  const queue = reviewQueue();
  const [active, setActive] = useState(queue[0].key);
  const [done, setDone] = useState<Record<string, string>>(initial);
  const [q, setQ] = useState("");
  const [tone, setTone] = useState("");
  const [supF, setSupF] = useState(initialSup);
  const [hideDone, setHideDone] = useState(false);
  const visible = queue.filter((r) => (!tone || r.tone === tone) && (!supF || r.sup === supF) && (!hideDone || !done[r.key]) && (!q.trim() || [r.title, r.note, r.raw ?? ""].join(" ").toLowerCase().includes(q.trim().toLowerCase())));
  const row = queue.find((r) => r.key === active)!;
  const redsLeft = queue.filter((r) => r.tone === "bad" && !done[r.key]).length;
  const sup = RESPONDERS.find((s) => s.id === row.sup)!;

  const [ask, setAsk] = useState<{ key: string; text: string } | null>(null);
  /** Marks the item done here and records the decision (with the value or reason) in Change history. */
  const decide = async (key: string, label: string, detail = "") => {
    const r = row;
    resolve(key);
    setAsk(null);
    const ok = await fetch("/api/check-decision", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: r.key, decision: key, what: `${label}: ${r.title} (${sup.name})${r.value != null ? `, AI read ${inr(r.value, 2)}` : ""}${detail ? `. ${detail}` : ""}` }) }).then((x) => x.ok).catch(() => false);
    toast(ok ? `${label}: saved in Change history.` : `${label}: marked here, but couldn't save to Change history.`, ok ? undefined : "info");
  };
  const submitAsk = () => {
    if (!ask) return;
    const t = ask.text.trim();
    if (ask.key === "Corrected") {
      const v = Number(t.replace(/[₹,\s]/g, ""));
      if (!t || !Number.isFinite(v) || v <= 0) { toast("Type the right price, e.g. 44.10", "info"); return; }
      decide("Corrected", "Corrected", `Changed to ₹${v.toFixed(2)}`);
    } else {
      if (t.length < 3) { toast("Add a short reason, so the decision can be explained later.", "info"); return; }
      decide("Left out", "Left out", `Reason: ${t}`);
    }
  };
  const resolve = (how: string) => {
    const nextDone = { ...done, [row.key]: how };
    setDone(nextDone);
    const next = queue.find((r) => !nextDone[r.key]);
    if (next) setActive(next.key);
  };

  return (
    <div className="space-y-5">
      <div className={clsx("flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm", redsLeft ? "border-bad/25 bg-bad-bg text-bad" : "border-ok/25 bg-ok-bg text-ok")}>
        {redsLeft ? <Lock size={16} /> : <Unlock size={16} />}
        {redsLeft ? <span><b>{redsLeft} red {redsLeft === 1 ? "item" : "items"} left.</b> You can&apos;t pick a winner until each one is fixed, or left out with a reason.</span> : <span><b>All red items are sorted.</b> You can now pick a winner.</span>}
        <span className="ml-auto flex items-center gap-2 font-semibold">
          {Object.keys(done).length} of {queue.length} checked
          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/70"><span className="block h-full bg-current" style={{ width: `${(Object.keys(done).length / queue.length) * 100}%` }} /></span>
        </span>
      </div>

      <div className="grid grid-cols-[360px_1fr] gap-5">
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="flex items-center gap-1.5 border-b border-line px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted">
            To check, red first <InfoTip text="Everything the AI wasn't sure about, across all suppliers. Red items block the award. Amber items are worth a look." />
          </div>
          <div className="space-y-2 border-b border-line px-3 py-2.5">
            <div className="flex items-center gap-2 rounded-lg border border-line bg-bg px-2.5 py-1.5">
              <Search size={13} className="text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search box, supplier issue…" className="w-full bg-transparent text-[12px] outline-none" aria-label="Search flagged items" />
              {q && <button onClick={() => setQ("")} aria-label="Clear"><X size={12} className="text-muted" /></button>}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <select value={tone} onChange={(e) => setTone(e.target.value)} className="rounded-md border border-line px-2 py-1 text-[12px]" aria-label="Filter by colour"><option value="">All colours</option><option value="bad">Red only</option><option value="warn">Amber only</option></select>
              <select value={supF} onChange={(e) => setSupF(e.target.value)} className="rounded-md border border-line px-2 py-1 text-[12px]" aria-label="Filter by supplier"><option value="">All suppliers</option>{RESPONDERS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              <label className="flex items-center gap-1 text-[12px] text-ink"><input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="accent-purple" /> Hide checked</label>
            </div>
            <div className="text-[11px] text-muted">{visible.length} of {queue.length} shown</div>
          </div>
          <div className="max-h-[560px] overflow-auto">
            {visible.length === 0 && <div className="px-4 py-8 text-center text-[12px] text-muted">Nothing matches.</div>}
            {visible.map((r) => (
              <button key={r.key} onClick={() => setActive(r.key)} className={clsx("flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left transition-colors", active === r.key ? "bg-sky/60" : "hover:bg-bg", done[r.key] && "opacity-50")}>
                <span className="mt-1.5"><Dot tone={done[r.key] ? "ok" : r.tone} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">{RESPONDERS.find((s) => s.id === r.sup)?.name}{done[r.key] ? ` · ${done[r.key]}` : ""}</span>
                  <span className="block truncate text-[13px] font-semibold text-navy">{r.title}</span>
                  <span className="block truncate text-[12px] text-muted">{r.note}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <Card
            title={row.title}
            subtitle={`${sup.name} · sent ${sup.format.toLowerCase()}`}
            info="Compare what the supplier actually sent (left) with what the AI read (right), then choose an action below."
            action={<Pill tone={row.tone}>{row.tone === "bad" ? "Red: blocks the award" : "Amber: please check"}</Pill>}
          >
            <div className="grid grid-cols-2 gap-5">
              <div>
                <SourcePanel s={{ raw: row.raw, file: row.file, loc: row.loc, box: row.box, ocr: row.ocr, steps: row.steps, byAI: row.byAI }} />
              </div>
              <div>
                <div className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted">What the AI read <InfoTip text="The value the AI extracted, converted to ₹ per box where it's a price." /></div>
                <div className="rounded-xl bg-bg p-4">
                  <div className="num text-3xl font-bold text-navy">{row.value != null ? inr(row.value, 2) : "—"}</div>
                </div>
                <div className="mt-3 rounded-xl border border-orange/25 bg-[#fff8f1] p-3 text-[13px] leading-relaxed text-ink">
                  <span className="font-bold text-orange">Why it&apos;s flagged: </span>{row.note}
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              {ACTIONS.map((a) => (
                <span key={a.key} className="inline-flex items-center gap-1">
                  <Button variant={a.variant} onClick={() => (a.key === "Corrected" || a.key === "Left out" ? setAsk({ key: a.key, text: "" }) : decide(a.key, a.label))}>{a.label}{a.key === "Asked supplier" && <ArrowRight size={14} />}</Button>
                  <InfoTip text={a.info} side="top" />
                </span>
              ))}
              {ask && (
                <div className="mt-2 flex w-full flex-wrap items-center gap-2 rounded-xl bg-bg p-3">
                  <span className="text-[13px] font-semibold text-navy">{ask.key === "Corrected" ? "Right value (₹):" : "Reason for leaving it out:"}</span>
                  <input autoFocus value={ask.text} onChange={(e) => setAsk({ ...ask, text: e.target.value })} inputMode={ask.key === "Corrected" ? "decimal" : "text"} placeholder={ask.key === "Corrected" ? "e.g. 44.10" : "e.g. Supplier confirmed they can't make this size"} className="min-w-[200px] flex-1 rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] outline-none focus:border-purple" onKeyDown={(e) => { if (e.key === "Enter") submitAsk(); }} />
                  <Button onClick={submitAsk}>Save</Button>
                  <Button variant="ghost" onClick={() => setAsk(null)}>Cancel</Button>
                </div>
              )}
            </div>
          </Card>

          <Card title="History of this value" info="Every change is recorded with who made it and when. Nothing is ever overwritten silently.">
            <ol className="space-y-3 text-[13px]">
              <li className="flex gap-3"><span className="mt-1.5"><Dot tone="none" /></span><span><b className="text-navy">Read by AI</b> from {row.source ?? "the reply"} · 12 Nov, 10:42 am</span></li>
              <li className="flex gap-3"><span className="mt-1.5"><Dot tone={row.tone} /></span><span><b className="text-navy">Flagged:</b> {row.note}</span></li>
              {done[row.key] && <li className="flex gap-3"><span className="mt-1.5"><Dot tone="ok" /></span><span className="inline-flex flex-wrap items-center gap-1"><b className="text-navy">{done[row.key]}</b> by <Person name="Rishabh" kind="buyer" /> · just now</span></li>}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
