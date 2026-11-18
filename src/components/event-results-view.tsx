"use client";

import { useState } from "react";
import clsx from "clsx";
import { X } from "lucide-react";
import { Button, toast } from "@/components/button";
import { Pill, InfoTip } from "@/components/ui";
import { SourcePanel } from "@/components/source-panel";
import { goWhenReady } from "@/lib/go-when-ready";
import type { ECell, ESupplier } from "@/lib/event-results";
import type { EventItem } from "@/lib/event-items";

const inr = (v: number) => `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const tone = (c?: ECell) => (!c || c.kind === "not_quoted" ? "none" : c.status);
const DOT = { ok: "bg-ok", warn: "bg-orange", bad: "bg-bad", none: "bg-line" } as const;

function CellDetail({ item, sup, cell, onClose }: { item: EventItem; sup: ESupplier; cell: ECell; onClose: () => void }) {
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div><div className="text-[13px] font-semibold text-navy">{item.item_code} · {item.description}</div><div className="text-[12px] text-muted">{sup.name}</div></div>
        <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close"><X size={16} /></button>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-bg px-3 py-2">
        <span className="num text-2xl font-bold text-navy">{cell.value != null ? inr(cell.value) : "—"}</span>
        <Pill tone={tone(cell) === "none" ? "none" : (cell.status as "ok" | "warn" | "bad")}>{cell.kind === "not_quoted" ? "Not quoted" : { ok: "Read correctly", warn: "Please check", bad: "Must fix" }[cell.status]}</Pill>
      </div>
      {cell.note && <div className={clsx("rounded-xl p-3 text-[13px]", cell.status === "ok" ? "bg-bg" : "border border-orange/25 bg-[#fff8f1]")}><b className="text-navy">{cell.status === "ok" ? "Note: " : "Why it's flagged: "}</b>{cell.note}</div>}
      {cell.file && <SourcePanel s={{ raw: cell.raw, file: cell.file, loc: cell.loc, box: cell.box, ocr: cell.ocr, steps: cell.steps, byAI: true }} />}
    </div>
  );
}

/** Side-by-side comparison for any event: same lines, same basis (₹ per unit, before GST, delivered). */
export function EventCompare({ items, suppliers, rec }: { items: EventItem[]; suppliers: ESupplier[]; rec: { lines: { line: string; best: { sid: string; price: number } | null }[]; total: number; bestSingle: { name: string; total: number } | null; uncovered: string[] } }) {
  const [sel, setSel] = useState<{ line: string; sid: string } | null>(null);
  if (!suppliers.length) return <div className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-[13px] text-muted">No replies read yet. When a supplier&apos;s email arrives in the Quotes tab, QuoteLens reads it and their prices appear here.</div>;
  const best = Object.fromEntries(rec.lines.map((l) => [l.line, l.best?.sid]));
  const totals = suppliers.map((s) => ({ s, sum: items.reduce((t, it) => { const c = s.cells[it.item_code]; return t + (c?.value != null && c.kind !== "alternative" ? c.value * it.yearly_qty : 0); }, 0), priced: items.filter((it) => s.cells[it.item_code]?.value != null).length }));
  const selItem = sel && items.find((i) => i.item_code === sel.line);
  const selSup = sel && suppliers.find((s) => s.id === sel.sid);
  return (
    <div className={clsx("grid gap-5", sel ? "xl:grid-cols-[minmax(0,1fr)_380px]" : "")}>
      <div className="space-y-4">
        <div className="overflow-auto rounded-xl border border-line bg-white">
          <table className="w-full text-[13px]">
            <thead className="bg-bg text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
              <tr><th className="px-3 py-2">Line</th><th className="px-3 py-2">Item</th><th className="px-3 py-2 text-right">Qty</th>{suppliers.map((s) => <th key={s.id} className="px-3 py-2 text-right">{s.name}</th>)}</tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.item_code} className="border-t border-line">
                  <td className="px-3 py-2 font-mono text-[12px] text-muted">{it.item_code}</td>
                  <td className="px-3 py-2 text-ink">{it.description}{it.our_code && <span className="ml-1 text-[11px] text-muted">(= {it.our_code})</span>}</td>
                  <td className="num px-3 py-2 text-right">{it.yearly_qty.toLocaleString("en-IN")}</td>
                  {suppliers.map((s) => {
                    const c = s.cells[it.item_code];
                    const isBest = best[it.item_code] === s.id;
                    return (
                      <td key={s.id} className="px-3 py-2 text-right">
                        <button onClick={() => setSel({ line: it.item_code, sid: s.id })} className={clsx("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 hover:bg-tint", isBest && "bg-ok-bg font-semibold", sel?.line === it.item_code && sel?.sid === s.id && "ring-2 ring-purple")}>
                          <span className={clsx("h-2 w-2 rounded-full", DOT[tone(c)])} />
                          <span className="num">{c?.value != null ? inr(c.value) : c?.kind === "not_quoted" ? "Not quoted" : "—"}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t-2 border-line bg-bg font-semibold">
                <td className="px-3 py-2" colSpan={3}>Total for the lines each priced <InfoTip text="Quantity × price for every line the supplier priced. Lines they didn't price are left out, never counted as zero, so compare totals only when the counts match." /></td>
                {totals.map(({ s, sum, priced }) => <td key={s.id} className="num px-3 py-2 text-right">{inr(Math.round(sum))}<div className="text-[11px] font-normal text-muted">{priced} of {items.length} lines</div></td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[12px] text-muted">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ok" /> Read correctly</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange" /> Please check</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-bad" /> Must fix</span>
          <span className="flex items-center gap-1.5"><span className="rounded bg-ok-bg px-1.5 font-semibold text-ink">₹</span> Cheapest usable price for the line</span>
          <span>Click any price to see where it came from.</span>
        </div>
        <div className="rounded-xl bg-tint px-4 py-3 text-[13px] text-ink">
          <b>Cheapest per line:</b> {inr(rec.total)} a year{rec.uncovered.length ? `, with ${rec.uncovered.length} line(s) not yet covered by a usable price` : ""}.
          {rec.bestSingle ? <> Best single supplier for every line: <b>{rec.bestSingle.name}</b>, {inr(rec.bestSingle.total)}.</> : " No supplier has a usable price for every line yet."}
          <span className="text-muted"> Worked out by code; flagged prices count only after you check them.</span>
        </div>
      </div>
      {sel && selItem && selSup && selSup.cells[sel.line] && <div><CellDetail item={selItem} sup={selSup} cell={selSup.cells[sel.line]} onClose={() => setSel(null)} /></div>}
    </div>
  );
}

/** Check tab for any event: every flagged value, with the original, and a decision that is saved. */
export function EventCheck({ eventId, items, suppliers, decisions, initialSup = "" }: { eventId: string; items: EventItem[]; suppliers: ESupplier[]; decisions: Record<string, { decision: string; detail: string }>; initialSup?: string }) {
  const rows = items.flatMap((it) => suppliers.map((s) => ({ it, s, c: s.cells[it.item_code] }))).filter((x) => x.c && x.c.status !== "ok" && x.c.kind !== "not_quoted").sort((a, b) => (a.c.status === "bad" ? 0 : 1) - (b.c.status === "bad" ? 0 : 1));
  const [sup, setSup] = useState(initialSup);
  const shown = rows.filter((x) => !sup || x.s.id === sup);
  const [active, setActive] = useState(shown[0] ? `${shown[0].it.item_code}-${shown[0].s.id}` : "");
  const [ask, setAsk] = useState<{ key: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!rows.length) return <div className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-[13px] text-muted">{suppliers.length ? "Nothing to check: every price was read cleanly." : "No replies read yet."}</div>;
  const cur = rows.find((x) => `${x.it.item_code}-${x.s.id}` === active) ?? shown[0];
  const decide = async (decision: string, label: string, detail = "") => {
    if (!cur) return;
    setBusy(true);
    const key = `${cur.it.item_code}-${cur.s.id}`;
    const what = `${label}: ${cur.it.item_code} ${cur.it.description} (${cur.s.name})${cur.c.value != null ? `, AI read ${inr(cur.c.value)}` : ""}${detail ? `. ${detail}` : ""}`;
    const ok = await fetch("/api/check-decision", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: eventId, key, decision, what }) }).then((r) => r.ok).catch(() => false);
    toast(ok ? `${label}: saved in Change history.` : "Couldn't save. Try again.", ok ? undefined : "info");
    if (ok) await goWhenReady(window.location.pathname + window.location.search, {});
    setBusy(false);
  };
  const submitAsk = () => {
    if (!ask) return;
    const t = ask.text.trim();
    if (ask.key === "Corrected") { const v = Number(t.replace(/[₹,\s]/g, "")); if (!(v > 0)) { toast("Type the right price, e.g. 44.10", "info"); return; } decide("Corrected", "Corrected", `Changed to ₹${v.toFixed(2)}`); }
    else { if (t.length < 3) { toast("Add a short reason.", "info"); return; } decide("Left out", "Left out", `Reason: ${t}`); }
  };
  const open = rows.filter((x) => !decisions[`${x.it.item_code}-${x.s.id}`]);
  return (
    <div className="space-y-4">
      <div className={clsx("rounded-2xl border px-5 py-3 text-sm", open.some((x) => x.c.status === "bad") ? "border-bad/25 bg-bad-bg text-bad" : "border-ok/25 bg-ok-bg text-ok")}>
        {open.some((x) => x.c.status === "bad") ? <b>{open.filter((x) => x.c.status === "bad").length} red item(s) left. The award can&apos;t be sent until each is fixed or left out with a reason.</b> : <b>No red items left. You can send the award for approval.</b>} <span className="ml-2 font-normal">{rows.length - open.length} of {rows.length} checked</span>
      </div>
      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-2">
          <select value={sup} onChange={(e) => setSup(e.target.value)} className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-[13px]">
            <option value="">All suppliers</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {shown.map((x) => {
            const key = `${x.it.item_code}-${x.s.id}`;
            const d = decisions[key];
            return (
              <button key={key} onClick={() => { setActive(key); setAsk(null); }} className={clsx("w-full rounded-xl border px-3 py-2 text-left text-[13px]", key === active ? "border-purple bg-tint" : "border-line bg-white")}>
                <div className="flex items-center gap-2"><span className={clsx("h-2 w-2 rounded-full", DOT[x.c.status])} /><b className="text-navy">{x.it.item_code}</b> <span className="truncate text-muted">{x.s.name}</span>{d && <Pill tone="ok" className="ml-auto">{d.decision}</Pill>}</div>
                <div className="mt-0.5 line-clamp-2 text-[12px] text-ink">{x.c.note}</div>
              </button>
            );
          })}
        </div>
        {cur && (
          <div className="space-y-3">
            <CellDetail item={cur.it} sup={cur.s} cell={cur.c} onClose={() => setActive("")} />
            {decisions[`${cur.it.item_code}-${cur.s.id}`] ? (
              <div className="rounded-xl bg-ok-bg/60 px-4 py-2.5 text-[13px]"><b>{decisions[`${cur.it.item_code}-${cur.s.id}`].decision}.</b> {decisions[`${cur.it.item_code}-${cur.s.id}`].detail}</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button disabled={busy} onClick={() => decide("Accepted", "Looks right")}>Looks right</Button>
                <Button variant="secondary" disabled={busy} onClick={() => setAsk({ key: "Corrected", text: "" })}>Correct it</Button>
                <Button variant="secondary" disabled={busy} onClick={() => decide("Asked supplier", "Asked the supplier")}>Ask the supplier</Button>
                <Button variant="secondary" disabled={busy} onClick={() => setAsk({ key: "Left out", text: "" })}>Leave it out</Button>
              </div>
            )}
            {ask && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-bg p-3 text-[13px]">
                <span className="font-semibold text-navy">{ask.key === "Corrected" ? "Right price (₹):" : "Reason:"}</span>
                <input autoFocus value={ask.text} onChange={(e) => setAsk({ ...ask, text: e.target.value })} onKeyDown={(e) => e.key === "Enter" && submitAsk()} className="min-w-[200px] flex-1 rounded-lg border border-line bg-white px-3 py-1.5 outline-none focus:border-purple" />
                <Button onClick={submitAsk}>Save</Button><Button variant="ghost" onClick={() => setAsk(null)}>Cancel</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Award tab button for any event: creates the approval (the server refuses while reds are open). */
export function SendEventForApproval({ eventId, disabled }: { eventId: string; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button disabled={busy || disabled} onClick={async () => {
      setBusy(true);
      try {
        const res = await fetch("/api/approvals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "new", action: "create", event: eventId }) });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.ok) { toast(j.error ?? "Couldn't send.", "info"); setBusy(false); return; }
        await goWhenReady("/approvals", {});
      } catch { toast("Couldn't reach the app server.", "info"); setBusy(false); }
    }}>{busy ? "Sending…" : "Send for approval"}</Button>
  );
}
