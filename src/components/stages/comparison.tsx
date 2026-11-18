"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { X, FileSpreadsheet, FileText, Image as ImageIcon, MessageCircle, ArrowRight, MousePointerClick, Search, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { ITEMS, QUOTES, RESPONDERS, TERMS, QUALITY_RESULT, supplierTotals, inr, crore, type Cell } from "@/lib/fixtures";
import { Card, Pill, Dot, Button, InfoTip, StatusLegend } from "@/components/ui";
import { SourcePanel } from "@/components/source-panel";
import { recordDecision } from "@/lib/record";
import { toast } from "@/components/button";

const ICON: Record<string, React.ComponentType<{ size?: number }>> = { A: FileSpreadsheet, B: FileText, C: FileText, D: ImageIcon, E: MessageCircle };

export function Comparison() {
  const [sel, setSel] = useState<{ item: string; sup: string } | null>(null);
  const [hideFailed, setHideFailed] = useState(false);
  const [withTax, setWithTax] = useState(false);
  const sups = RESPONDERS.filter((s) => !(hideFailed && QUALITY_RESULT[s.id].status === "bad"));
  const totals = useMemo(() => Object.fromEntries(supplierTotals().map((t) => [t.id, t])), []);
  const tax = withTax ? 1.18 : 1;
  const [q, setQ] = useState("");
  const [ply, setPly] = useState("");
  const [flagged, setFlagged] = useState(false);
  const [sortBy, setSortBy] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "code", dir: "asc" });
  const gap = (id: string) => {
    const v = sups.map((s) => QUOTES[id][s.id]).filter((c) => c.value != null && c.kind !== "alternative" && c.status === "ok").map((c) => c.value!);
    return v.length > 1 ? (Math.max(...v) - Math.min(...v)) / Math.min(...v) : 0;
  };
  const rows = ITEMS.filter((it) => {
    if (ply && String(it.ply) !== ply) return false;
    if (flagged && !sups.some((s) => QUOTES[it.id][s.id].status !== "ok")) return false;
    const n = q.trim().toLowerCase();
    return !n || [it.id, it.desc, it.use].join(" ").toLowerCase().includes(n);
  }).sort((a, b) => {
    const k = sortBy.key;
    const val = (it: typeof a): number | string | null => k === "code" ? it.id : k === "qty" ? it.qty : k === "gap" ? gap(it.id) : QUOTES[it.id][k]?.value ?? null;
    const x = val(a), y = val(b);
    if (x == null) return 1; if (y == null) return -1;
    const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
    return sortBy.dir === "asc" ? c : -c;
  });
  const sortOn = (key: string) => setSortBy((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const SortIcon = ({ k }: { k: string }) => sortBy.key === k ? (sortBy.dir === "asc" ? <ArrowUp size={12} className="text-purple" /> : <ArrowDown size={12} className="text-purple" />) : <ArrowUpDown size={12} className="opacity-40" />;

  const cheapest = (itemId: string) => {
    let best: string | null = null, v = Infinity;
    for (const s of sups) {
      const c = QUOTES[itemId][s.id];
      if (c.value != null && c.kind !== "alternative" && c.status !== "bad" && c.value < v) { v = c.value; best = s.id; }
    }
    return best;
  };
  const selCell = sel ? QUOTES[sel.item][sel.sup] : null;
  const selItem = sel ? ITEMS.find((i) => i.id === sel.item)! : null;
  const selSup = sel ? RESPONDERS.find((s) => s.id === sel.sup)! : null;

  return (
    <div className="flex gap-5">
      <div className="min-w-0 flex-1 space-y-5">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm">
          <span className="flex items-center gap-1 font-semibold text-navy">All prices shown as <InfoTip text="Suppliers quoted in different ways: per kg, per 100 boxes, in US dollars, with or without GST. Everything has been converted to one basis so you can compare fairly." /></span>
          <Pill tone="brand">₹ per box</Pill>
          <Pill tone="brand">Delivered to Haridwar</Pill>
          <div className="flex overflow-hidden rounded-full border border-line text-xs font-semibold">
            <button onClick={() => setWithTax(false)} className={clsx("px-2.5 py-0.5", !withTax ? "bg-navy text-white" : "text-muted")}>Before GST</button>
            <button onClick={() => setWithTax(true)} className={clsx("px-2.5 py-0.5", withTax ? "bg-navy text-white" : "text-muted")}>With 18% GST</button>
          </div>
          <span className="mx-1 h-4 w-px bg-line" />
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink">
            <input type="checkbox" checked={hideFailed} onChange={(e) => setHideFailed(e.target.checked)} className="accent-purple" />
            Hide suppliers who failed the quality check
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white px-4 py-2.5">
          <div className="flex min-w-[220px] items-center gap-2 rounded-lg border border-line bg-bg px-3 py-1.5 focus-within:border-purple/50">
            <Search size={14} className="text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search box code, size or product…" className="w-full bg-transparent text-[13px] outline-none" aria-label="Search boxes" />
            {q && <button onClick={() => setQ("")} aria-label="Clear"><X size={13} className="text-muted" /></button>}
          </div>
          <select value={ply} onChange={(e) => setPly(e.target.value)} className={clsx("rounded-lg border px-2.5 py-1.5 text-[13px]", ply ? "border-purple/50 bg-tint text-purple" : "border-line")} aria-label="Filter by ply">
            <option value="">Ply: all</option><option value="3">3-ply</option><option value="5">5-ply</option><option value="7">7-ply</option>
          </select>
          <select value={sortBy.key} onChange={(e) => setSortBy({ key: e.target.value, dir: e.target.value === "gap" || e.target.value === "qty" ? "desc" : "asc" })} className="rounded-lg border border-line px-2.5 py-1.5 text-[13px]" aria-label="Sort boxes">
            <option value="code">Sort: box code</option><option value="qty">Sort: boxes a year</option><option value="gap">Sort: biggest price gap</option>
            {sups.map((s) => <option key={s.id} value={s.id}>Sort: {s.name.split(" ").slice(0, 2).join(" ")} price</option>)}
          </select>
          <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-ink"><input type="checkbox" checked={flagged} onChange={(e) => setFlagged(e.target.checked)} className="accent-purple" /> Only boxes with amber or red prices</label>
          <InfoTip text="Search and filter the 30 boxes. Sort by quantity, by the biggest gap between suppliers (best to negotiate), or by any supplier's price. You can also click a column header to sort." />
          <span className="ml-auto text-[12px] text-muted">{rows.length} of {ITEMS.length} boxes</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[13px] text-muted"><MousePointerClick size={15} className="text-purple" /> Click any price to see where it came from.</div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-muted"><span className="h-3 w-3 rounded bg-ok-bg ring-1 ring-ok/30" /> Lowest price for that box</span>
            <StatusLegend />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full border-separate border-spacing-0 text-[13px]">
              <thead className="sticky top-0 z-10 bg-white">
                <tr>
                  <th className="sticky left-0 z-10 min-w-[210px] border-b border-line bg-white px-4 py-3 text-left font-semibold text-muted"><button onClick={() => sortOn("code")} className="inline-flex items-center gap-1 hover:text-ink">Box <SortIcon k="code" /></button><span className="inline-flex items-center gap-1"><InfoTip text="Our item code, ply and size. Weight per box is shown underneath." /></span></th>
                  <th className="border-b border-line px-3 py-3 text-right font-semibold text-muted"><span className="inline-flex items-center gap-1"><button onClick={() => sortOn("qty")} className="inline-flex items-center gap-1 hover:text-ink">Boxes a year <SortIcon k="qty" /></button><InfoTip text="Yearly quantity for this box size, from the request." /></span></th>
                  {sups.map((s) => {
                    const I = ICON[s.id];
                    const q = QUALITY_RESULT[s.id];
                    return (
                      <th key={s.id} className="min-w-[140px] border-b border-l border-line px-3 py-2.5 text-left align-top">
                        <button onClick={() => sortOn(s.id)} title="Sort by this supplier's price" className="flex items-center gap-1.5 font-semibold text-indigo hover:text-purple"><span className="grid h-5 w-5 place-items-center rounded bg-tint text-[11px]">{s.code}</span><span className="truncate">{s.name.split(" ").slice(0, 2).join(" ")}</span><SortIcon k={s.id} /></button>
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-muted"><I size={12} /> {s.format}</div>
                        <div className="mt-1.5 flex items-center gap-1"><Pill tone={q.status}>Quality: {q.label}</Pill><InfoTip text={qualityInfo(s.id)} /></div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((it) => {
                  const best = cheapest(it.id);
                  return (
                    <tr key={it.id} className="group">
                      <td className="sticky left-0 border-b border-line bg-white px-4 py-2 group-hover:bg-bg">
                        <div className="font-semibold text-navy"><span className="mr-1.5 font-mono text-[11px] text-muted">{it.id}</span>{it.desc}</div>
                        <div className="text-[11px] text-muted">{it.use} · {it.kg} kg</div>
                      </td>
                      <td className="num border-b border-line px-3 py-2 text-right text-muted group-hover:bg-bg">{it.qty.toLocaleString("en-IN")}</td>
                      {sups.map((s) => {
                        const c = QUOTES[it.id][s.id];
                        const isSel = sel?.item === it.id && sel?.sup === s.id;
                        return (
                          <td key={s.id} className="border-b border-l border-line p-0">
                            <button
                              onClick={() => setSel({ item: it.id, sup: s.id })}
                              className={clsx("flex h-full w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors", isSel ? "bg-sky" : best === s.id ? "bg-ok-bg/70 hover:bg-ok-bg" : "hover:bg-bg")}
                            >
                              <CellValue c={c} tax={tax} />
                              <Dot tone={c.status} />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="sticky bottom-0 bg-[#f8f9fd]">
                <tr>
                  <td className="sticky left-0 border-t-2 border-line bg-[#f8f9fd] px-4 py-3 font-semibold text-navy">
                    <span className="flex items-center gap-1">Total for the year <InfoTip side="top" text="Price × boxes a year, added up. Suppliers who didn't price every box have a smaller total. That isn't a fair comparison, so they're marked." /></span>
                  </td>
                  <td className="border-t-2 border-line" />
                  {sups.map((s) => (
                    <td key={s.id} className="border-l border-t-2 border-line px-3 py-3">
                      <div className="num font-semibold text-navy">{crore(totals[s.id].total * tax)}</div>
                      <div className={clsx("text-[11px]", totals[s.id].quoted < 30 ? "font-semibold text-warn" : "text-muted")}>
                        {totals[s.id].quoted} of 30 boxes priced{totals[s.id].quoted < 30 ? ". Not a fair total." : ""}
                      </div>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <Card title="Other terms, side by side" subtitle="Price isn't everything: payment days, delivery time and conditions matter too." info="Orange values need attention: a short validity, a discount with conditions, slow delivery, or delivery charged extra.">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-muted">
                <th className="pb-2 font-semibold"><span className="inline-flex items-center gap-1">Term <InfoTip text="Commercial terms other than price, as each supplier stated them." /></span></th>
                {sups.map((s) => <th key={s.id} className="pb-2 font-semibold">{s.name.split(" ").slice(0, 2).join(" ")}</th>)}
              </tr>
            </thead>
            <tbody className="[&_td]:border-t [&_td]:border-line [&_td]:py-2">
              {([
                ["Quoted currency", "currency", "The currency the supplier quoted in. US dollars are converted at the rate shown, which you can change."],
                ["Delivery", "freight", "Whether delivery to our plant is included in the price."],
                ["Pay within (days)", "payment", "Days we get to pay after delivery. Longer is better for our cash flow."],
                ["Delivery time (weeks)", "lead", "Weeks from order to delivery. Marked orange if later than the factory needs."],
                ["Price valid until", "validity", "After this date the supplier may change their price."],
                ["Discount", "discount", "Any discount offered, and its conditions."],
                ["Minimum order", "moq", "Smallest order the supplier accepts per box size."],
              ] as const).map(([label, k, info]) => (
                <tr key={k}>
                  <td className="font-semibold text-navy"><span className="flex items-center gap-1">{label} <InfoTip text={info} /></span></td>
                  {sups.map((s) => {
                    const v = TERMS[s.id][k];
                    const flag = (k === "lead" && Number(v) > 4) || (k === "validity" && String(v).includes("15 days")) || (k === "freight" && String(v).startsWith("Extra")) || (k === "discount" && String(v).includes("only if"));
                    return <td key={s.id} className={clsx(flag && "font-semibold text-warn")}>{v ?? <span className="text-muted">—</span>}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {sel && selCell && selItem && selSup && (
        <aside className="sticky top-6 h-fit w-[380px] shrink-0 rounded-2xl border border-line bg-white shadow-[0_12px_40px_rgba(14,13,89,0.12)]">
          <header className="flex items-start justify-between border-b border-line px-5 py-4">
            <div>
              <div className="text-xs font-semibold text-muted">{selItem.id} · {selSup.name}</div>
              <div className="mt-0.5 text-[15px] font-semibold text-indigo">{selItem.desc}</div>
            </div>
            <button onClick={() => setSel(null)} className="rounded-md p-1 text-muted hover:bg-bg" aria-label="Close"><X size={16} /></button>
          </header>
          <div className="space-y-4 p-5 text-sm">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted">Price per box <InfoTip text="The price after converting to ₹ per box, delivered, before GST (unless you switched GST on)." /></div>
                <div className="num text-3xl font-bold text-navy">{selCell.value != null ? inr(selCell.value * tax, 2) : "—"}</div>
              </div>
              <Pill tone={selCell.status}>{{ ok: "Read correctly", warn: "Please check", bad: "Must fix" }[selCell.status]}</Pill>
            </div>
            {selCell.note && <div className={clsx("rounded-xl p-3 text-[13px]", selCell.status === "ok" ? "bg-bg" : "border border-orange/25 bg-[#fff8f1]")}><span className="font-semibold text-navy">{selCell.status === "ok" ? "Note: " : "Why it's flagged: "}</span>{selCell.note}</div>}
            <SourcePanel s={{ raw: selCell.raw, file: selCell.file, loc: selCell.loc, box: selCell.box, ocr: selCell.ocr, steps: selCell.steps, byAI: selCell.byAI }} />
            <div className="flex flex-wrap gap-2 pt-1">
              <Button className="flex-1" onClick={async () => { const ok = await recordDecision("Compare", `Checked ${selItem.id} from ${selSup.name}: ${selCell.value != null ? inr(selCell.value, 2) : "no price"} looks right`, "ok"); toast(ok ? `Marked as checked: ${selItem.id}, ${selSup.name}. Saved in Change history.` : "Couldn't save to Change history.", ok ? undefined : "info"); }}>Looks right</Button>
              <Button variant="secondary" className="flex-1" href="/events/RFQ-2026-014/check" toast="Opening this value in Check, where you can type the right number.">Correct it</Button>
              <Button variant="ghost" className="w-full" toast={`Draft message to ${selSup.name} created. Sending is simulated in this demo.`}>Ask the supplier <ArrowRight size={14} /></Button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

function qualityInfo(id: string) {
  const m: Record<string, string> = {
    A: "Check: the name on their ISO certificate doesn't match the company name.",
    B: "Passed: all quality answers are backed by valid documents.",
    C: "Check: they say they're ISO certified but didn't attach the certificate.",
    D: "Failed: ISO certificate expired, and boxes are weaker than required.",
    E: "Not answered: they didn't answer the quality questions. Never treated as a pass.",
  };
  return m[id];
}

function CellValue({ c, tax }: { c: Cell; tax: number }) {
  if (c.kind === "not_quoted") return <span className="text-[12px] font-semibold text-warn">Not quoted</span>;
  if (c.kind === "missing") return <span className="text-[12px] font-semibold text-bad">Missing</span>;
  return (
    <span className="min-w-0">
      <span className={clsx("num block font-semibold", c.kind === "alternative" ? "text-muted line-through decoration-muted/40" : "text-ink")}>{inr((c.value ?? 0) * tax, 2)}</span>
      {c.kind === "alternative" && <span className="block text-[10px] font-semibold text-warn">Different box (7-ply)</span>}
      {c.kind === "spoken" && <span className="block text-[10px] font-semibold text-warn">Said on a call</span>}
    </span>
  );
}
