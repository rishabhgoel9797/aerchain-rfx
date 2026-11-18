/**
 * The calculations the Ask AI analyst is allowed to run. Claude decides WHICH one to call and with what
 * settings; this file does ALL the maths, so every number in an answer comes from code, never from the model.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { ITEMS, QUOTES, RESPONDERS, SUPPLIERS, QUALITY_RESULT, LAST_YEAR_F, TERMS, aiIssues, reviewQueue, crore, lakh, inr, type Cell } from "@/lib/fixtures";
import { priceGaps, changeVsLastYear, costWithoutLastYearsCheapest, performance } from "@/lib/analysis";

const nameOf = (id: string) => SUPPLIERS.find((s) => s.id === id)?.name ?? id;
const boxLabel = (id: string) => {
  const it = ITEMS.find((i) => i.id === id)!;
  return `${it.id} (${it.l}×${it.w}×${it.h} mm, ${it.ply}-ply, ${it.use})`;
};
const money = (x: number) => ({ inr: Math.round(x), shown: x >= 1e7 ? crore(x) : lakh(x) });

type AwardInput = {
  mode?: "split" | "single";
  exclude_suppliers?: string[];
  include_failed_quality?: boolean;
  green_only?: boolean;
  price_adjustments?: { supplier_id: string; percent: number }[];
  only_boxes?: string[];
};

/** Can this price be compared like-for-like? Missing, alternative-item and red prices never count. */
function usable(c: Cell, greenOnly: boolean) {
  if (c.value == null || c.kind === "alternative" || c.status === "bad") return false;
  return greenOnly ? c.status === "ok" : true;
}

function calculateAward(input: AwardInput) {
  const greenOnly = Boolean(input.green_only);
  const excluded = new Set((input.exclude_suppliers ?? []).map((s) => s.toUpperCase()));
  const leftOut: string[] = [];
  const allowed = RESPONDERS.filter((s) => {
    if (excluded.has(s.id)) { leftOut.push(`${s.name}: you asked to leave them out`); return false; }
    if (!input.include_failed_quality && QUALITY_RESULT[s.id].status === "bad") { leftOut.push(`${s.name}: failed the quality check`); return false; }
    return true;
  }).map((s) => s.id);
  const adj = Object.fromEntries((input.price_adjustments ?? []).map((a) => [a.supplier_id.toUpperCase(), a.percent]));
  const items = ITEMS.filter((it) => !input.only_boxes?.length || input.only_boxes.map((b) => b.toUpperCase()).includes(it.id));
  const price = (it: (typeof ITEMS)[number], s: string) => {
    const c = QUOTES[it.id][s];
    return usable(c, greenOnly) ? c.value! * (1 + (adj[s] ?? 0) / 100) : null;
  };
  const lastYear = items.reduce((a, it) => a + (LAST_YEAR_F[it.id] ?? 0) * it.qty, 0);

  // Every allowed supplier's total over the boxes they priced.
  const singles = allowed.map((s) => {
    let total = 0; const missing: string[] = [];
    for (const it of items) { const p = price(it, s); if (p == null) missing.push(it.id); else total += p * it.qty; }
    return { supplier: nameOf(s), id: s, covers_all_boxes: missing.length === 0, boxes_priced: items.length - missing.length, boxes_missing: missing, yearly_cost: money(total), quality: QUALITY_RESULT[s].label };
  }).sort((a, b) => Number(b.covers_all_boxes) - Number(a.covers_all_boxes) || a.yearly_cost.inr - b.yearly_cost.inr);
  const bestSingle = singles.find((s) => s.covers_all_boxes) ?? null;

  // Cheapest allowed supplier per box.
  const alloc: Record<string, { supplier: string; boxes: string[]; value: number }> = {};
  const uncovered: string[] = [];
  let total = 0;
  for (const it of items) {
    let best: string | null = null, v = Infinity;
    for (const s of allowed) { const p = price(it, s); if (p != null && p < v) { v = p; best = s; } }
    if (!best) { uncovered.push(it.id); continue; }
    alloc[best] ??= { supplier: nameOf(best), boxes: [], value: 0 };
    alloc[best].boxes.push(it.id);
    alloc[best].value += v * it.qty;
    total += v * it.qty;
  }
  const split = {
    total_yearly_cost: money(total),
    suppliers_used: Object.values(alloc).sort((a, b) => b.value - a.value).map((a) => ({ supplier: a.supplier, boxes_won: a.boxes.length, boxes: a.boxes, yearly_value: money(a.value) })),
    boxes_nobody_priced_usably: uncovered,
  };

  return {
    rules_used: {
      boxes_considered: items.length,
      suppliers_considered: allowed.map(nameOf),
      left_out: leftOut,
      prices_used: greenOnly ? "Only green (confirmed) prices" : "Green and amber prices; red, missing and alternative-item prices are never used",
      price_adjustments: Object.entries(adj).map(([s, p]) => `${nameOf(s)} ${p > 0 ? "+" : ""}${p}%`),
    },
    ...(input.mode === "single" ? {} : { split_award: split }),
    best_single_supplier: bestSingle ? { supplier: bestSingle.supplier, yearly_cost: bestSingle.yearly_cost } : "No allowed supplier priced every box usably",
    split_saves_vs_best_single: bestSingle && input.mode !== "single" ? money(bestSingle.yearly_cost.inr - total) : null,
    every_supplier_on_their_own: singles,
    last_year_cost_same_boxes: money(lastYear),
    split_award_change_vs_last_year_pct: input.mode === "single" ? "Not calculated in single mode" : lastYear && uncovered.length === 0 ? Math.round(((total - lastYear) / lastYear) * 1000) / 10 : "Not comparable: some boxes have no usable price",
  };
}

function boxPrices(input: { box_ids?: string[]; ply?: number }) {
  const ids = input.box_ids?.map((b) => b.toUpperCase());
  return ITEMS.filter((it) => (!ids?.length || ids.includes(it.id)) && (!input.ply || it.ply === input.ply)).map((it) => ({
    box: boxLabel(it.id),
    yearly_quantity: it.qty,
    last_year_price: LAST_YEAR_F[it.id] != null ? inr(LAST_YEAR_F[it.id], 2) : "none",
    quotes: RESPONDERS.map((s) => {
      const c = QUOTES[it.id][s.id];
      return { supplier: s.name, price_per_box: c.value != null ? inr(c.value, 2) : "no price", flag: c.status === "ok" ? "green" : c.status === "warn" ? "amber" : "red", kind: c.kind, note: c.note ?? "" };
    }),
  }));
}

function overview() {
  return {
    event: "RFQ-2026-014 · Corrugated boxes for FY27 · RSG Herbal House, Haridwar plant",
    boxes: ITEMS.length,
    last_years_main_supplier: `${nameOf("F")} was cheapest last year but sent only an out-of-office reply this time`,
    suppliers: RESPONDERS.map((s) => {
      const cells = ITEMS.map((it) => QUOTES[it.id][s.id]);
      const t = TERMS[s.id];
      return {
        id: s.id, supplier: s.name, quality: QUALITY_RESULT[s.id].label,
        prices: { green: cells.filter((c) => c.status === "ok" && c.value != null).length, amber: cells.filter((c) => c.status === "warn").length, red: cells.filter((c) => c.status === "bad").length },
        terms: t ? { payment_days: t.payment, lead_time_weeks: t.lead, freight: t.freight, valid_until: t.validity, discount: t.discount ?? "none", minimum_order: t.moq ?? "none" } : "not stated",
        issues_found_by_ai: aiIssues(s.id).map((i) => i.title),
      };
    }),
  };
}

function bundleOffer(input: { supplier_id: string; discount_pct: number }) {
  const id = input.supplier_id.toUpperCase();
  const award = calculateAward({});
  const all = calculateAward({ include_failed_quality: true }).every_supplier_on_their_own.find((s) => s.id === id);
  if (!all) return { error: `No supplier with id ${id}` };
  const discounted = all.yearly_cost.inr * (1 - input.discount_pct / 100);
  return {
    supplier: all.supplier,
    covers_all_boxes: all.covers_all_boxes,
    boxes_missing: all.boxes_missing,
    before_discount: all.yearly_cost,
    after_discount: money(discounted),
    best_split_award: award.split_award!.total_yearly_cost,
    bundle_minus_split: money(discounted - award.split_award!.total_yearly_cost.inr),
    note: all.covers_all_boxes ? "" : "This supplier did not price every box usably, so a whole-order bundle is not comparable without the missing boxes.",
  };
}

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "event_overview",
    description: "Who replied, each supplier's quality-check result, how many of their prices are green/amber/red, their commercial terms (payment days, lead time, freight, validity, discounts) and the problems the AI found in their reply. Call this first for broad or summary questions.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "calculate_award",
    description: "Works out the cost of awarding the order. Returns the cheapest split (cheapest allowed supplier per box), every supplier's total on their own, the best single supplier who priced every box, the saving of the split, and the comparison with last year. Use it for any 'who is cheapest', 'what if we drop X', 'what if X adds Y%', or 'only green prices' question. Suppliers who failed quality are left out unless include_failed_quality is true.",
    input_schema: {
      type: "object",
      properties: {
        mode: { type: "string", enum: ["split", "single"], description: "split = cheapest per box (default); single = only compare suppliers on their own" },
        exclude_suppliers: { type: "array", items: { type: "string" }, description: "Supplier ids to leave out, e.g. [\"D\"]" },
        include_failed_quality: { type: "boolean", description: "Also consider suppliers who failed the quality check (default false)" },
        green_only: { type: "boolean", description: "Use only green (confirmed) prices, leaving amber ones out (default false)" },
        price_adjustments: { type: "array", items: { type: "object", properties: { supplier_id: { type: "string" }, percent: { type: "number" } }, required: ["supplier_id", "percent"], additionalProperties: false }, description: "What-if changes, e.g. delivery adds 6% for supplier B → [{supplier_id:\"B\", percent:6}]. Use one entry per supplier for 'everyone'." },
        only_boxes: { type: "array", items: { type: "string" }, description: "Limit to these box ids, e.g. [\"C01\",\"C02\"]" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "box_prices",
    description: "Every supplier's price for specific boxes (₹ per box, before GST, delivered), with the green/amber/red flag and the reason for any flag, plus last year's price. Filter by box ids or by ply (3, 5 or 7).",
    input_schema: { type: "object", properties: { box_ids: { type: "array", items: { type: "string" } }, ply: { type: "number", enum: [3, 5, 7] } }, additionalProperties: false },
  },
  {
    name: "price_gaps",
    description: "Boxes with the biggest gap between the highest and lowest green price, and the yearly rupee gap. Good for 'where should we negotiate'.",
    input_schema: { type: "object", properties: { top: { type: "number", description: "How many boxes to return (default 8)" } }, additionalProperties: false },
  },
  {
    name: "compare_with_last_year",
    description: "How this year's quotes compare with last year's contract prices: the value-weighted change of the middle quote, the boxes that rose or fell most, and the extra cost because last year's cheapest supplier did not bid.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "bundle_offer",
    description: "Value of a whole-order discount (e.g. Om Sai's 5% if they win all boxes) compared with the best split award.",
    input_schema: { type: "object", properties: { supplier_id: { type: "string" }, discount_pct: { type: "number" } }, required: ["supplier_id", "discount_pct"], additionalProperties: false },
  },
  {
    name: "supplier_track_record",
    description: "Last year's delivery record per supplier: on-time %, rejected deliveries, invoice mismatches and a 1–5 rating.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "flagged_prices",
    description: "Every amber and red flag waiting for a person to check, with the reason. Optionally for one supplier id.",
    input_schema: { type: "object", properties: { supplier_id: { type: "string" } }, additionalProperties: false },
  },
];

type Json = Record<string, unknown>;

export function runTool(name: string, input: Json): unknown {
  switch (name) {
    case "event_overview": return overview();
    case "calculate_award": return calculateAward(input as AwardInput);
    case "box_prices": return boxPrices(input as { box_ids?: string[]; ply?: number });
    case "price_gaps": return priceGaps().slice(0, Number(input.top ?? 8)).map((g) => ({ box: boxLabel(g.id), gap_pct: g.gap, yearly_rupee_gap: money(g.saving) }));
    case "compare_with_last_year": {
      const rows = ITEMS.filter((it) => LAST_YEAR_F[it.id]).map((it) => {
        const v = RESPONDERS.map((s) => QUOTES[it.id][s.id]).filter((c) => usable(c, false)).map((c) => c.value!);
        const low = v.length ? Math.min(...v) : null;
        return { box: boxLabel(it.id), last_year: inr(LAST_YEAR_F[it.id], 2), lowest_now: low != null ? inr(low, 2) : "no price", change_pct: low != null ? Math.round(((low - LAST_YEAR_F[it.id]) / LAST_YEAR_F[it.id]) * 1000) / 10 : null };
      }).filter((r) => r.change_pct != null).sort((a, b) => b.change_pct! - a.change_pct!);
      return {
        middle_quote_change_vs_last_year_pct: Math.round(changeVsLastYear() * 10) / 10,
        extra_yearly_cost_because_last_years_cheapest_did_not_bid: money(costWithoutLastYearsCheapest()),
        biggest_rises_lowest_quote: rows.slice(0, 5),
        biggest_falls_lowest_quote: rows.slice(-5).reverse(),
      };
    }
    case "bundle_offer": return bundleOffer(input as { supplier_id: string; discount_pct: number });
    case "supplier_track_record": return performance();
    case "flagged_prices": {
      const sup = input.supplier_id ? String(input.supplier_id).toUpperCase() : null;
      return reviewQueue().filter((r) => !sup || r.sup === sup).map((r) => ({ supplier: nameOf(r.sup), flag: r.tone === "bad" ? "red" : "amber", what: r.title, why: r.note }));
    }
    default: return { error: `Unknown tool ${name}` };
  }
}

/** A short plain-words label for the "What I did" chips under each answer. */
export function describeTool(name: string, input: Json): string {
  const a = input as AwardInput;
  switch (name) {
    case "event_overview": return "Looked at every reply, its terms and its quality result";
    case "calculate_award": {
      const bits = [a.mode === "single" ? "Compared suppliers on their own" : "Worked out the cheapest split"];
      if (a.exclude_suppliers?.length) bits.push(`without ${a.exclude_suppliers.map((s) => nameOf(s.toUpperCase())).join(", ")}`);
      if (a.include_failed_quality) bits.push("including suppliers who failed quality");
      if (a.green_only) bits.push("green prices only");
      if (a.price_adjustments?.length) {
        const pct = (p: number) => `${p > 0 ? "+" : ""}${p}%`;
        const same = a.price_adjustments.every((p) => p.percent === a.price_adjustments![0].percent);
        bits.push(same && a.price_adjustments.length >= RESPONDERS.length - 1 ? `everyone ${pct(a.price_adjustments[0].percent)}` : a.price_adjustments.map((p) => `${nameOf(p.supplier_id.toUpperCase())} ${pct(p.percent)}`).join(", "));
      }
      if (a.only_boxes?.length) bits.push(`boxes ${a.only_boxes.join(", ")}`);
      return bits.join(" · ");
    }
    case "box_prices": return `Pulled prices for ${(input.box_ids as string[] | undefined)?.join(", ") || (input.ply ? `${input.ply}-ply boxes` : "all boxes")}`;
    case "price_gaps": return "Ranked boxes by price gap";
    case "compare_with_last_year": return "Compared with last year's contract prices";
    case "bundle_offer": return `Valued ${nameOf(String(input.supplier_id).toUpperCase())}'s ${input.discount_pct}% bundle discount`;
    case "supplier_track_record": return "Checked last year's delivery record";
    case "flagged_prices": return "Listed prices still flagged for checking";
    default: return name;
  }
}

export const SUPPLIER_IDS = RESPONDERS.map((s) => `${s.id} = ${s.name}`).join(", ") + `, F = ${nameOf("F")} (did not bid)`;
