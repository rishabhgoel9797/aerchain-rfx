/**
 * Ask AI tools for any sourcing event other than the demo (server only). Claude picks a tool; code does every sum
 * on what the AI read from the replies (data/extracted/<id>.json) and the buyer's Check decisions.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { eventResults, recommend, usablePrice, openFlags } from "@/lib/event-results";

const money = (n: number) => ({ inr: Math.round(n), shown: n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L` : `₹${Math.round(n).toLocaleString("en-IN")}` });

export const EVENT_TOOLS: Anthropic.Tool[] = [
  { name: "event_overview", description: "The event's line items, who was invited, who replied, and how many prices are green / amber / red / not quoted per supplier.", input_schema: { type: "object", properties: {} } },
  { name: "price_table", description: "Every price per line and supplier (₹ per unit, before GST, delivered), with its status and the reason when flagged. Optionally for some lines only.", input_schema: { type: "object", properties: { lines: { type: "array", items: { type: "string" }, description: "e.g. ['L1','L3']; empty for all" } } } },
  {
    name: "calculate_award",
    description: "Award maths: cheapest usable price per line (split), the best single supplier who priced every line, and each supplier on their own. Prices still red, alternatives and unquoted lines are left out, never counted as zero.",
    input_schema: {
      type: "object",
      properties: {
        exclude_suppliers: { type: "array", items: { type: "string" }, description: "Supplier ids to leave out, e.g. ['B']" },
        green_only: { type: "boolean", description: "Only prices read cleanly or confirmed by the buyer" },
        price_adjustments: { type: "array", items: { type: "object", properties: { supplier_id: { type: "string" }, percent: { type: "number" } }, required: ["supplier_id", "percent"] }, description: "What-if: change a supplier's prices by a percent (one entry per supplier)" },
      },
    },
  },
];

export function runEventTool(eventId: string, name: string, input: Record<string, unknown>) {
  const r = eventResults(eventId);
  if (name === "event_overview") {
    return {
      items: r.items.map((i) => ({ line: i.item_code, item: i.description, quantity: i.yearly_qty, unit: i.unit, our_code: i.our_code ?? null })),
      invited: r.invited.map((s) => s.name),
      replied: r.suppliers.map((s) => {
        const cs = Object.values(s.cells);
        return { id: s.id, name: s.name, green: cs.filter((c) => c.status === "ok").length, amber: cs.filter((c) => c.status === "warn" && c.kind !== "not_quoted").length, red: cs.filter((c) => c.status === "bad").length, not_quoted: cs.filter((c) => c.kind === "not_quoted").length, notes: s.issues.map((i) => `${i.title}: ${i.note}`).slice(0, 5) };
      }),
      not_replied: r.invited.filter((i) => !r.suppliers.some((s) => s.id === i.id)).map((s) => s.name),
      flags_waiting_for_buyer: openFlags(r).length,
    };
  }
  if (name === "price_table") {
    const lines = (input.lines as string[] | undefined)?.length ? (input.lines as string[]) : r.items.map((i) => i.item_code);
    return lines.map((l) => {
      const it = r.items.find((i) => i.item_code === l);
      return { line: l, item: it?.description, quantity: it?.yearly_qty, prices: r.suppliers.map((s) => { const c = s.cells[l]; const d = r.decisions[`${l}-${s.id}`]; return { supplier: s.name, price: c?.value ?? null, status: c?.kind === "not_quoted" ? "not quoted" : c?.status === "ok" ? "green" : c?.status === "warn" ? "amber" : c?.status === "bad" ? "red" : "no reply", why: c?.note ?? "", buyer_decision: d ? `${d.decision}: ${d.detail}` : null, usable_in_award: usablePrice(r, l, s.id) != null }; }) };
    });
  }
  if (name === "calculate_award") {
    const adjust = Object.fromEntries(((input.price_adjustments as { supplier_id: string; percent: number }[]) ?? []).map((a) => [a.supplier_id, a.percent]));
    const rec = recommend(r, { exclude: (input.exclude_suppliers as string[]) ?? [], greenOnly: !!input.green_only, adjust });
    return {
      rules_used: { left_out_suppliers: input.exclude_suppliers ?? [], green_only: !!input.green_only, price_changes: adjust },
      split_award: { total_per_year: money(rec.total), lines: rec.lines.map((l) => ({ line: l.line, winner: l.best?.name ?? "No usable price", price: l.best?.price ?? null, cost_per_year: l.cost != null ? money(l.cost) : null })) },
      lines_without_a_usable_price: rec.uncovered,
      best_single_supplier: rec.bestSingle ? { name: rec.bestSingle.name, total_per_year: money(rec.bestSingle.total) } : "No supplier has a usable price for every line",
      split_saves_vs_best_single: rec.bestSingle && !rec.uncovered.length ? money(rec.bestSingle.total - rec.total) : "Not comparable: not every line is covered",
      every_supplier_on_their_own: rec.singles.map((s) => ({ name: s.name, lines_priced: s.priced, of: r.items.length, total_for_lines_priced: money(s.total) })),
    };
  }
  return { error: `Unknown tool ${name}` };
}

export function describeEventTool(name: string, input: Record<string, unknown>) {
  if (name === "event_overview") return "Looked at who replied and what was flagged";
  if (name === "price_table") return `Read the price table${(input.lines as string[] | undefined)?.length ? ` for ${(input.lines as string[]).join(", ")}` : ""}`;
  const ex = (input.exclude_suppliers as string[] | undefined) ?? [];
  const adj = (input.price_adjustments as { percent: number }[] | undefined) ?? [];
  return `Calculated the award${ex.length ? ` without ${ex.join(", ")}` : ""}${input.green_only ? ", green prices only" : ""}${adj.length ? `, with price changes` : ""}`;
}
