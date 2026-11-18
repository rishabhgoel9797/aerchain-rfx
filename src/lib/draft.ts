/**
 * The draft request for quotes of a new sourcing event (server only).
 * Base draft = the team's request (item list from their attachment) + house-standard terms + quality questions.
 * Buyer's changes, made by talking to the AI co-pilot, are saved as overrides in data/seed/event_drafts.csv.
 * The AI chooses operations ("raise all quantities 10%"); code applies them, so every number is computed, not guessed.
 */
import { readCsv, writeCsv } from "@/lib/csv-file";
import { itemListFile, readItemList } from "@/lib/request-files";
import { quoteDeadline } from "@/lib/event-flow";
import { QUESTIONS } from "@/lib/fixtures";

export type TermKey = "price_unit" | "delivery" | "tax" | "deadline";
export type DraftLine = { n: number; size: string; ply?: number; qty: number; code?: string; note?: string; changed?: boolean; added?: boolean };
export type DraftTerm = { key: TermKey; label: string; value: string; info: string; changed?: boolean };
export type ChatTurn = { role: "me" | "ai"; text: string; at?: string; changes?: string[] };
export type Draft = { terms: DraftTerm[]; lines: DraftLine[]; questions: { text: string; added?: boolean }[]; chat: ChatTurn[]; hasList: boolean; isBoxes: boolean };

export type Overrides = {
  terms: Partial<Record<TermKey, string>>;
  qty: Record<string, number>; // base line index → new quantity
  removed: number[]; // base line indexes
  added: { size: string; ply?: number; qty: number }[];
  qAdd: string[];
  qRemoved: number[]; // base question indexes
  chat: ChatTurn[];
};
const EMPTY: Overrides = { terms: {}, qty: {}, removed: [], added: [], qAdd: [], qRemoved: [], chat: [] };

export function loadOverrides(eventId: string): Overrides {
  try {
    const row = readCsv("event_drafts").rows.find((r) => r.event_id === eventId);
    return row ? { ...EMPTY, ...JSON.parse(row.overrides_json) } : structuredClone(EMPTY);
  } catch { return structuredClone(EMPTY); }
}
export function saveOverrides(eventId: string, o: Overrides) {
  const t = readCsv("event_drafts");
  t.rows = [...t.rows.filter((r) => r.event_id !== eventId), { event_id: eventId, overrides_json: JSON.stringify(o), updated: new Date().toISOString() }];
  writeCsv("event_drafts", t);
}

type Base = { terms: DraftTerm[]; lines: Omit<DraftLine, "n">[]; questions: string[]; hasList: boolean; isBoxes: boolean };

async function baseDraft(ev: { plant: string; name: string }, req: { id: string; title: string; message: string }): Promise<Base> {
  const file = itemListFile(req.id);
  const lines = file ? await readItemList(file).catch(() => []) : [];
  const isBoxes = /box|carton|corrugat/i.test(req.title + " " + req.message + " " + ev.name);
  return {
    terms: [
      { key: "price_unit", label: "Price unit", value: isBoxes ? "₹ per box" : "₹ per unit", info: "Every supplier quotes in the same unit, so prices can be compared fairly." },
      { key: "delivery", label: "Delivery", value: `Delivered to ${ev.plant} plant`, info: `From the request: delivery to ${ev.plant}.` },
      { key: "tax", label: "Tax", value: "Before GST, GST shown separately", info: "Same basis for everyone." },
      { key: "deadline", label: "Deadline", value: `${quoteDeadline()}, 6 pm`, info: "Suggested: 10 days from today, the same as the last boxes request." },
    ],
    lines: lines.map((l) => ({ size: l.size, ply: l.ply, qty: l.qty, code: l.code, note: l.note })),
    questions: isBoxes ? QUESTIONS : [],
    hasList: lines.length > 0,
    isBoxes,
  };
}

/** The draft as the buyer sees it now: base + saved changes, with changed parts marked. */
export async function currentDraft(ev: { id: string; plant: string; name: string }, req: { id: string; title: string; message: string }): Promise<Draft> {
  const b = await baseDraft(ev, req);
  const o = loadOverrides(ev.id);
  const lines: DraftLine[] = [];
  b.lines.forEach((l, i) => {
    if (o.removed.includes(i)) return;
    const q = o.qty[String(i)];
    lines.push({ ...l, n: 0, qty: q ?? l.qty, changed: q != null && q !== l.qty });
  });
  o.added.forEach((a) => lines.push({ ...a, n: 0, added: true }));
  lines.forEach((l, i) => (l.n = i + 1));
  return {
    terms: b.terms.map((t) => (o.terms[t.key] ? { ...t, value: o.terms[t.key]!, changed: o.terms[t.key] !== t.value, info: `Changed by you, through the AI. Was: ${t.value}.` } : t)),
    lines,
    questions: [...b.questions.map((text, i) => ({ text, i })).filter((q) => !o.qRemoved.includes(q.i)).map(({ text }) => ({ text })), ...o.qAdd.map((text) => ({ text, added: true }))],
    chat: o.chat,
    hasList: b.hasList || o.added.length > 0,
    isBoxes: b.isBoxes,
  };
}

/** One change the AI asked for. Code checks and applies it; anything invalid is skipped and reported. */
export type Op = { op: string; term?: string; value?: string; percent?: number; items?: number[]; item?: number; qty?: number; size?: string; ply?: number; text?: string; number?: number };

export async function applyOps(ev: { id: string; plant: string; name: string }, req: { id: string; title: string; message: string }, ops: Op[]) {
  const b = await baseDraft(ev, req);
  const o = loadOverrides(ev.id);
  const done: string[] = [];
  const skipped: string[] = [];
  // Current numbering → underlying line (base index or added index), matching what Claude was shown.
  const map = () => {
    const m: ({ base: number } | { add: number })[] = [];
    b.lines.forEach((_, i) => { if (!o.removed.includes(i)) m.push({ base: i }); });
    o.added.forEach((_, i) => m.push({ add: i }));
    return m;
  };
  const qtyOf = (t: { base: number } | { add: number }) => ("base" in t ? o.qty[String(t.base)] ?? b.lines[t.base].qty : o.added[t.add].qty);
  const setQty = (t: { base: number } | { add: number }, q: number) => { if ("base" in t) o.qty[String(t.base)] = q; else o.added[t.add].qty = q; };
  const label = (n: number, t: { base: number } | { add: number }) => `item ${n} (${"base" in t ? b.lines[t.base].size : o.added[t.add].size})`;

  for (const x of ops) {
    const m = map();
    if (x.op === "set_term" && x.term && x.value && ["price_unit", "delivery", "tax", "deadline"].includes(x.term)) {
      o.terms[x.term as TermKey] = String(x.value).slice(0, 80);
      done.push(`${b.terms.find((t) => t.key === x.term)!.label} → ${x.value}`);
    } else if (x.op === "scale_quantities" && typeof x.percent === "number" && Math.abs(x.percent) <= 500) {
      const nums = x.items?.length ? x.items : m.map((_, i) => i + 1);
      let changed = 0;
      for (const n of nums) { const t = m[n - 1]; if (!t) continue; setQty(t, Math.round(qtyOf(t) * (1 + x.percent / 100))); changed++; }
      if (changed) done.push(`Quantities ${x.percent > 0 ? "+" : ""}${x.percent}% on ${changed === m.length ? "all" : changed} items (worked out by code)`); else skipped.push("No matching items to change.");
    } else if (x.op === "set_quantity" && x.item && typeof x.qty === "number" && x.qty > 0) {
      const t = m[x.item - 1];
      if (t) { setQty(t, Math.round(x.qty)); done.push(`${label(x.item, t)}: quantity → ${Math.round(x.qty).toLocaleString("en-IN")}`); } else skipped.push(`There's no item ${x.item}.`);
    } else if (x.op === "remove_items" && x.items?.length) {
      const targets = x.items.map((n) => ({ n, t: m[n - 1] })).filter((y) => y.t);
      for (const { t } of targets) { if ("base" in t) o.removed.push(t.base); }
      const addIdx = targets.filter((y) => "add" in y.t).map((y) => (y.t as { add: number }).add);
      o.added = o.added.filter((_, i) => !addIdx.includes(i));
      if (targets.length) done.push(`Removed ${targets.map(({ n, t }) => label(n, t)).join(", ")}`); else skipped.push("Those item numbers don't exist.");
    } else if (x.op === "add_item" && x.size && typeof x.qty === "number" && x.qty > 0) {
      o.added.push({ size: String(x.size).slice(0, 60), ply: x.ply ? Number(x.ply) : undefined, qty: Math.round(x.qty) });
      done.push(`Added ${x.size}${x.ply ? `, ${x.ply}-ply` : ""}, ${Math.round(x.qty).toLocaleString("en-IN")} a year`);
    } else if (x.op === "add_question" && x.text) {
      o.qAdd.push(String(x.text).slice(0, 240));
      done.push(`Added quality question: “${x.text}”`);
    } else if (x.op === "remove_question" && x.number) {
      const visible = b.questions.map((_, i) => i).filter((i) => !o.qRemoved.includes(i));
      const baseIdx = visible[x.number - 1];
      if (baseIdx != null) { o.qRemoved.push(baseIdx); done.push(`Removed quality question ${x.number}`); }
      else { const ai = x.number - 1 - visible.length; if (o.qAdd[ai] != null) { o.qAdd.splice(ai, 1); done.push(`Removed quality question ${x.number}`); } else skipped.push(`There's no question ${x.number}.`); }
    } else {
      skipped.push(`Couldn't apply “${x.op}”.`);
    }
  }
  return { overrides: o, done, skipped };
}
