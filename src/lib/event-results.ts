/**
 * What the AI read for a sourcing event other than the demo (server only), from data/extracted/<id>.json,
 * plus Check decisions. All comparisons and award maths here are code. Missing prices are never zero.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { readCsv } from "@/lib/csv-file";
import { loadItems, type EventItem } from "@/lib/event-items";

export type ECell = { value: number | null; status: "ok" | "warn" | "bad"; kind: string; note?: string; raw?: string; steps?: string[]; file?: string; loc?: string; box?: { x: number; y: number; w: number; h: number }; ocr?: number };
export type ESupplier = { id: string; name: string; cells: Record<string, ECell>; issues: { tone: string; title: string; note: string; file?: string; loc?: string }[] };
export type EventResults = { items: EventItem[]; suppliers: ESupplier[]; invited: { id: string; name: string }[]; decisions: Record<string, { decision: string; detail: string }>; readAt?: string; model?: string };

export function eventResults(eventId: string): EventResults {
  const items = loadItems(eventId);
  const names = Object.fromEntries(readCsv("suppliers").rows.map((s) => [s.supplier_id, s.name]));
  const invited = readCsv("event_invites").rows.filter((r) => r.event_id === eventId).map((r) => ({ id: r.supplier_id, name: names[r.supplier_id] ?? r.supplier_id }));
  const p = join(process.cwd(), "data", "extracted", `${eventId}.json`);
  const ex = existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : { suppliers: {} };
  const suppliers: ESupplier[] = Object.values(ex.suppliers as Record<string, ESupplier>).map((s) => ({ id: s.id, name: s.name, cells: s.cells, issues: s.issues ?? [] })).sort((a, b) => a.id.localeCompare(b.id));
  const decisions = Object.fromEntries(readCsv("check_decisions").rows.filter((r) => r.event_id === eventId).map((r) => [r.key, { decision: r.decision, detail: r.detail }]));
  return { items, suppliers, invited, decisions, readAt: ex.read_at, model: ex.model };
}

/** A price can be used in an award if it exists, isn't an alternative item, and is green, or was flagged and then confirmed ("Looks right") or corrected in Check. */
export function usablePrice(r: EventResults, line: string, sid: string, opts: { greenOnly?: boolean } = {}) {
  const c = r.suppliers.find((s) => s.id === sid)?.cells[line];
  const d = r.decisions[`${line}-${sid}`];
  if (d?.decision === "Left out") return null;
  if (d?.decision === "Corrected") { const v = Number(d.detail.match(/Changed to ₹([\d.]+)/)?.[1]); if (v > 0) return v; }
  if (!c || c.value == null || c.kind === "not_quoted") return null;
  // A different item (e.g. a near size or 7-ply for 5-ply) counts only if the buyer accepted it in Check.
  if (c.kind === "alternative" && d?.decision !== "Accepted") return null;
  // Flagged prices (amber or red) count only once the buyer has said "Looks right"; a correction counts above.
  if (c.status !== "ok" && d?.decision !== "Accepted") return null;
  return c.value;
}

/** Flagged values still waiting for a decision, for the Check tab badge and the award lock. */
export function openFlags(r: EventResults) {
  const out: { key: string; line: string; sid: string; tone: "warn" | "bad" }[] = [];
  for (const it of r.items) for (const s of r.suppliers) {
    const c = s.cells[it.item_code];
    if (!c || c.status === "ok" || c.kind === "not_quoted") continue;
    const key = `${it.item_code}-${s.id}`;
    if (!r.decisions[key]) out.push({ key, line: it.item_code, sid: s.id, tone: c.status === "bad" ? "bad" : "warn" });
  }
  return out;
}

/** Recommended award: cheapest usable price per line (split), and the best single supplier who priced every line. */
export function recommend(r: EventResults, opts: { exclude?: string[]; greenOnly?: boolean; adjust?: Record<string, number> } = {}) {
  const sups = r.suppliers.filter((s) => !opts.exclude?.includes(s.id));
  const price = (line: string, sid: string) => { const v = usablePrice(r, line, sid, opts); return v == null ? null : Math.round(v * (1 + (opts.adjust?.[sid] ?? 0) / 100) * 100) / 100; };
  const lines = r.items.map((it) => {
    const offers = sups.map((s) => ({ sid: s.id, name: s.name, price: price(it.item_code, s.id) })).filter((o) => o.price != null) as { sid: string; name: string; price: number }[];
    offers.sort((a, b) => a.price - b.price);
    const best = offers[0];
    return { line: it.item_code, description: it.description, qty: it.yearly_qty, best: best ?? null, cost: best ? Math.round(best.price * it.yearly_qty) : null, offers };
  });
  const total = lines.reduce((t, l) => t + (l.cost ?? 0), 0);
  const singles = sups.map((s) => {
    const ps = r.items.map((it) => price(it.item_code, s.id));
    return { sid: s.id, name: s.name, complete: ps.every((p) => p != null), total: Math.round(r.items.reduce((t, it, i) => t + (ps[i] ?? 0) * it.yearly_qty, 0)), priced: ps.filter((p) => p != null).length };
  });
  const bestSingle = singles.filter((s) => s.complete).sort((a, b) => a.total - b.total)[0] ?? null;
  return { lines, total, uncovered: lines.filter((l) => !l.best).map((l) => l.line), singles, bestSingle };
}
