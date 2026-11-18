/**
 * Real calculations over the comparison data. Every number on the Award, Negotiate,
 * Ask and Collect screens comes from here — nothing is typed in by hand.
 */
import seed from "@/data/seed.json";
import { ITEMS, QUOTES, RESPONDERS, QUALITY_RESULT, LAST_YEAR_F, type Cell } from "@/lib/fixtures";

type Row = Record<string, string | number>;
const M = seed.master as unknown as Record<string, Row[]>;

/** A price that can be compared like-for-like: has a value, isn't an alternative item, isn't red. */
const usable = (c: Cell) => c.value != null && c.kind !== "alternative" && c.status !== "bad";
const name = (id: string) => RESPONDERS.find((s) => s.id === id)?.name ?? id;

export type Allocation = { id: string; name: string; items: string[]; value: number };

/** Cheapest supplier per box. By default suppliers who FAILED quality are left out. */
export function splitAward(opts: { includeFailed?: boolean } = {}) {
  const allowed = RESPONDERS.filter((s) => opts.includeFailed || QUALITY_RESULT[s.id].status !== "bad").map((s) => s.id);
  const alloc: Record<string, Allocation> = {};
  const uncovered: string[] = [];
  let total = 0;
  for (const it of ITEMS) {
    let best: string | null = null, v = Infinity;
    for (const s of allowed) {
      const c = QUOTES[it.id][s];
      if (usable(c) && c.value! < v) { v = c.value!; best = s; }
    }
    if (!best) { uncovered.push(it.id); continue; }
    alloc[best] ??= { id: best, name: name(best), items: [], value: 0 };
    alloc[best].items.push(it.id);
    alloc[best].value += v * it.qty;
    total += v * it.qty;
  }
  return { allocations: Object.values(alloc).sort((a, b) => b.value - a.value), total, uncovered, allowed };
}

/** Each supplier's total for the year over the boxes they priced usably. */
export function supplierTotals() {
  return RESPONDERS.map((s) => {
    let total = 0, priced = 0;
    for (const it of ITEMS) { const c = QUOTES[it.id][s.id]; if (usable(c)) { total += c.value! * it.qty; priced++; } }
    return { id: s.id, name: s.name, total, priced, quality: QUALITY_RESULT[s.id] };
  });
}

/** Cheapest single supplier who usably priced ALL 30 boxes and didn't fail quality. */
export function bestSingleSupplier() {
  return supplierTotals().filter((t) => t.priced === ITEMS.length && t.quality.status !== "bad").sort((a, b) => a.total - b.total)[0];
}

/** Spread between highest and lowest green price per box. */
export function priceGaps() {
  return ITEMS.map((it) => {
    const v = RESPONDERS.map((s) => QUOTES[it.id][s.id]).filter((c) => c.value != null && c.kind !== "alternative" && c.status === "ok").map((c) => c.value!);
    const gap = v.length > 1 ? ((Math.max(...v) - Math.min(...v)) / Math.min(...v)) * 100 : 0;
    return { id: it.id, gap: Math.round(gap), saving: v.length > 1 ? (Math.max(...v) - Math.min(...v)) * it.qty : 0 };
  }).sort((a, b) => b.gap - a.gap);
}

/** Value-weighted change of the median quote vs last year's contract price. */
export function changeVsLastYear() {
  let now = 0, then = 0;
  for (const it of ITEMS) {
    const v = RESPONDERS.map((s) => QUOTES[it.id][s.id]).filter(usable).map((c) => c.value!).sort((a, b) => a - b);
    const ly = LAST_YEAR_F[it.id];
    if (!v.length || !ly) continue;
    const median = v[Math.floor(v.length / 2)];
    now += median * it.qty; then += ly * it.qty;
  }
  return then ? ((now - then) / then) * 100 : 0;
}

/** Extra yearly cost if last year's cheapest supplier (F, silent) is not in the running: best acceptable quote now vs F's price last year. Failed suppliers don't count as alternatives. Never guesses F's new price. */
export function costWithoutLastYearsCheapest() {
  let extra = 0;
  for (const it of ITEMS) {
    const ly = LAST_YEAR_F[it.id];
    const v = RESPONDERS.filter((s) => QUALITY_RESULT[s.id].status !== "bad").map((s) => QUOTES[it.id][s.id]).filter((c) => usable(c) && c.status === "ok").map((c) => c.value!);
    if (ly && v.length) extra += Math.max(0, Math.min(...v) - ly) * it.qty;
  }
  return extra;
}

/** "5% off only if all items" — what Om Sai would cost if they won everything they priced. */
export function bundleOffer(supplierId = "C", discountPct = 5) {
  const t = supplierTotals().find((x) => x.id === supplierId)!;
  return { ...t, discounted: t.total * (1 - discountPct / 100), discountPct };
}

/** FY26 performance from supplier_track_record.csv, as a simple 1–5 rating. */
export function performance() {
  return M.supplier_track_record
    .filter((r) => RESPONDERS.some((s) => s.id === r.supplier_id) || r.supplier_id === "F")
    .map((r) => {
      const onTime = Number(r.on_time_pct), rej = Number(r.rejected_deliveries), inv = Number(r.invoice_mismatches);
      const stars = Math.max(1, Math.min(5, Math.round((onTime - 60) / 8) - rej - inv + 1));
      const notes = [`${onTime}% on time over ${r.deliveries} deliveries`, rej ? `${rej} rejected ${rej === 1 ? "delivery" : "deliveries"}` : "no rejections", inv ? `${inv} invoice ${inv === 1 ? "mismatch" : "mismatches"}` : ""].filter(Boolean);
      return { id: String(r.supplier_id), name: String(M.suppliers.find((s) => s.supplier_id === r.supplier_id)?.name ?? r.supplier_id), stars, notes: notes.join(" · "), year: String(r.year) };
    })
    .sort((a, b) => b.stars - a.stars);
}
