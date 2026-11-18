/**
 * App data for the demo company RSG Herbal House.
 * Master data comes from data/seed/*.csv (loaded with `npm run seed`).
 * Quote values currently come from the answer key as a stand-in; the AI reader will replace
 * them with what it actually reads from the supplier files.
 */
import seed from "@/data/seed.json";
import extracted from "@/data/extracted.json";

export type Status = "ok" | "warn" | "bad";

type Row = Record<string, string | number>;
const M = seed.master as unknown as Record<string, Row[]>;
const K = seed.answerKey as unknown as Record<string, Row[]>;

export const COMPANY = { name: "RSG Herbal House", industry: "Ayurvedic products", plant: "Haridwar" };

export type Item = {
  id: string;
  ply: 3 | 5 | 7;
  l: number;
  w: number;
  h: number;
  kg: number; // weight per box
  qty: number; // yearly quantity
  desc: string;
  use: string; // what the box ships
};

const BASE_PER_KG = { 3: 41, 5: 45, 7: 49 } as const;
const paper = M.market_prices.filter((m) => String(m.item).startsWith("Kraft"));
export const PAPER_PRICE_PER_KG = Number(paper.at(-1)?.price ?? 34.5);
export const USD_RATE = Number(M.market_prices.find((m) => m.item === "US dollar")?.price ?? 84.2);

export const ITEMS: Item[] = M.items.map((r) => ({
  id: String(r.item_code),
  ply: Number(r.ply) as 3 | 5 | 7,
  l: Number(r.length_mm),
  w: Number(r.width_mm),
  h: Number(r.height_mm),
  kg: Number(r.weight_kg),
  qty: Number(r.yearly_qty),
  desc: `${r.ply}-ply box, ${r.length_mm}×${r.width_mm}×${r.height_mm} mm`,
  use: String(r.used_for),
}));

export type Supplier = {
  id: string;
  code: string;
  name: string;
  city: string;
  contact: string;
  email: string;
  phone: string;
  whatsapp: string;
  channels: string[]; // every channel they accept: Email, WhatsApp, Phone, SMS
  gstin: string;
  status: string; // Approved / New / Blocked
  category: string;
  addedOn: string;
  foundVia: string;
  channel: "Email" | "WhatsApp" | "Call";
  format: string;
  fileName?: string;
  tags: string[];
  onTime?: number; // % on-time last year
  share?: number; // % of last year's spend
  invited: boolean;
  blocked?: string;
  warning?: string;
  updatedAt?: string;
};

const FILES: Record<string, string> = { A: "SGC_Quotation_FY27.xlsx", B: "PPW-Q-2611-044.pdf", C: "Offer_Letter_OmSai.docx", D: "IMG_20261109_1842.jpg" };
const INVITED = ["A", "B", "C", "D", "E", "F"];

/** Every supplier in the master sheet, any category (used by the Suppliers page). */
export const ALL_SUPPLIERS = () => M.suppliers.map(toSupplier);
const terms = Object.fromEntries(K.quote_terms.map((t) => [t.supplier_id, t]));

function toSupplier(r: Row): Supplier {
    {
    const id = String(r.supplier_id);
    const tr = M.supplier_track_record.find((t) => t.supplier_id === id && Number(t.share_of_box_spend_pct) >= 0);
    const status = String(r.status);
    const tags = [status === "Blocked" ? "" : status, id === "F" ? "Last year's cheapest" : "", id === "B" ? "MNC" : ""].filter(Boolean);
    return {
      id, code: id,
      name: String(r.name),
      city: `${r.city}, ${r.state}`,
      contact: String(r.contact_person),
      email: String(r.email ?? ""),
      phone: String(r.phone ?? ""),
      whatsapp: String(r.whatsapp ?? ""),
      channels: String(r.channels ?? "").split(";").map((x) => x.trim()).filter(Boolean),
      gstin: String(r.gstin ?? ""),
      status: String(r.status),
      category: String(r.category),
      addedOn: String(r.added_on ?? ""),
      foundVia: String(r.found_via ?? ""),
      channel: (String(r.preferred_channel) === "WhatsApp" ? "WhatsApp" : String(r.preferred_channel) === "Phone" ? "Call" : "Email") as Supplier["channel"],
      format: id === "F" ? "No reply" : terms[id] ? String(terms[id].file_format) : "—",
      fileName: FILES[id],
      tags,
      onTime: status === "New" ? undefined : tr ? Number(tr.on_time_pct) : undefined,
      share: status === "New" || id === "G" ? undefined : tr ? Number(tr.share_of_box_spend_pct) : undefined,
      invited: INVITED.includes(id),
      blocked: status === "Blocked" ? String(r.warning) : undefined,
      warning: status !== "Blocked" && r.warning && id !== "B" && id !== "F" ? String(r.warning) : undefined,
      updatedAt: r.updated_at ? String(r.updated_at) : undefined,
    };
  }
}

export const SUPPLIERS: Supplier[] = M.suppliers.filter((r) => r.category === "Corrugated boxes").map(toSupplier);

export const RESPONDERS = SUPPLIERS.filter((s) => s.invited && s.id !== "F");

// ---------- Quote cells: what the AI read (data/extracted), falling back to the answer key ----------

export type Cell = {
  value: number | null; // ₹ per box, ex-GST, delivered Haridwar
  status: Status;
  kind: "firm" | "converted" | "spoken" | "alternative" | "not_quoted" | "missing" | "unsure";
  note?: string;
  raw?: string;
  source?: string;
  steps?: string[]; // each step of the conversion to ₹ per box
  file?: string; // original file, relative to data/files/RFQ-2026-014
  loc?: string; // exact spot in that file
  box?: { x: number; y: number; w: number; h: number }; // photo crop
  ocr?: number; // photo reading confidence %
  byAI?: boolean;
};

type ExtractedSupplier = { cells: Record<string, Cell>; issues: { tone: string; title: string; note: string; file?: string; loc?: string; raw?: string }[]; quality: { question_id: string; status: Status | "none"; label: string; note?: string; file?: string; loc?: string }[]; meta?: { model?: string; ms?: number; tokens?: number } };
const EX = (extracted as unknown as { suppliers: Record<string, ExtractedSupplier>; model?: string; provider?: string; read_at?: string });
/** Details of the AI reading run, for the "read by" labels in the app. */
export const AI_RUN = { model: EX.model, provider: EX.provider, readAt: EX.read_at, suppliers: Object.keys(EX.suppliers ?? {}) };
export const readByAI = (sup: string) => Boolean(EX.suppliers?.[sup]);
export const aiIssues = (sup: string) => EX.suppliers?.[sup]?.issues ?? [];

const round2 = (x: number) => Math.round(x * 100) / 100;
const TRUTH: Record<string, Row> = Object.fromEntries(K.quotes.map((q) => [`${q.supplier_id}-${q.item_code}`, q]));
/** Stand-in for what the AI will read: the true comparable price from the answer key. */
const truth = (sup: string, item: string) => {
  const v = TRUTH[`${sup}-${item}`]?.true_price_inr_per_box;
  return v === "" || v === undefined ? null : Number(v);
};
const quotedAs = (sup: string, item: string) => String(TRUTH[`${sup}-${item}`]?.quoted_as ?? "");

export const basePrice = (it: Item) => it.kg * BASE_PER_KG[it.ply];

function cellFor(it: Item, sup: string): Cell {
  const t = truth(sup, it.id);
  const raw = quotedAs(sup, it.id);
  if (sup === "E") {
    if (it.id === "C12")
      return { value: t, status: "warn", kind: "spoken", note: "Price given on a phone call. Not yet confirmed in writing.", raw, source: "Call note, 11 Nov, 4:12 pm" };
    if (it.ply === 3 || it.ply === 5) {
      const perKg = it.ply === 5 ? 42 : 38;
      return { value: t, status: "ok", kind: "converted", note: `Quoted per kg: ₹${perKg}/kg × ${it.kg} kg per box, plus 4% estimated freight`, raw, source: "WhatsApp, 10 Nov, 7:48 pm" };
    }
    if (t != null)
      return { value: t, status: "ok", kind: "converted", note: "Said 'same as last year': taken from last year's order PO-4471, plus estimated freight", raw, source: "Last year's order PO-4471" };
    return { value: null, status: "bad", kind: "missing", note: "Said 'same as last year', but we have no price for this box from last year", raw, source: "WhatsApp, 10 Nov, 7:48 pm" };
  }
  if (sup === "D" && ["C28", "C29", "C30"].includes(it.id))
    return { value: null, status: "warn", kind: "not_quoted", note: "Not on their rate card. Shown as Not quoted, never as zero." };
  const v = t ?? 0;
  if (sup === "D" && it.id === "C07")
    return { value: v, status: "warn", kind: "unsure", note: "The photo is blurry here. One digit could not be read clearly.", raw: "Row 7, rate card photo", source: "IMG_20261109_1842.jpg" };
  if (sup === "D" && it.id === "C14") {
    const written = Number(raw);
    return { value: written, status: "warn", kind: "unsure", note: "About 10× lower than other suppliers. Probably a missing digit.", raw: `₹${raw}`, source: "IMG_20261109_1842.jpg" };
  }
  if (sup === "B" && it.id === "C05")
    return { value: v, status: "bad", kind: "firm", note: "The PDF shows two different prices for this box (page 1 and page 3).", raw: `${raw} (page 1) / different on page 3`, source: "PPW-Q-2611-044.pdf, pages 1 and 3" };
  if (sup === "C" && it.id === "C18") {
    const alt = Number(TRUTH[`C-${it.id}`]?.quoted_value ?? 0);
    return { value: alt, status: "warn", kind: "alternative", note: "Offered a 7-ply box instead of the 5-ply we asked for. Not compared as the same item.", raw, source: "Offer_Letter_OmSai.docx, paragraph 4" };
  }
  if (sup === "A" && it.id === "C09")
    return { value: v, status: "warn", kind: "firm", note: "They used their own code SG-3P-4530. We think it is this box, but are not fully sure.", raw: "SG-3P-4530", source: "SGC_Quotation_FY27.xlsx, Rates sheet, row 14" };
  const src: Record<string, string> = { A: "SGC_Quotation_FY27.xlsx", B: "PPW-Q-2611-044.pdf", C: "Offer_Letter_OmSai.docx", D: "IMG_20261109_1842.jpg" };
  const conv: Record<string, string> = { A: "Quoted per 100 boxes, divided by 100", B: `Quoted in US dollars × ₹${USD_RATE}, GST removed, 2% discount applied`, C: "Taken as quoted", D: "Taken as quoted" };
  return { value: v, status: "ok", kind: sup === "A" || sup === "B" ? "converted" : "firm", note: conv[sup], raw, source: src[sup] };
}

export const QUOTES: Record<string, Record<string, Cell>> = Object.fromEntries(
  ITEMS.map((it) => [it.id, Object.fromEntries("ABCDE".split("").map((s) => {
    const c = EX.suppliers?.[s]?.cells?.[it.id];
    if (c) return [s, { ...c, source: c.file ? `${c.file.split("/").pop()}${c.loc ? ` · ${c.loc.replace(/^.*· /, "")}` : ""}` : undefined, byAI: true } as Cell];
    return [s, cellFor(it, s)];
  }))]),
);

export const LAST_YEAR_F: Record<string, number> = Object.fromEntries(
  M.last_year_prices.filter((r) => r.supplier_id === "F").map((r) => [String(r.item_code), Number(r.price_per_box_inr)]),
);

export type ReviewRow = { key: string; tone: "warn" | "bad"; sup: string; title: string; note: string; raw?: string; source?: string; value?: number | null; file?: string; loc?: string; box?: Cell["box"]; ocr?: number; steps?: string[]; byAI?: boolean };

/** Everything the buyer must look at in step 6 — one list, so counts match everywhere. */
export function reviewQueue(): ReviewRow[] {
  const rows: ReviewRow[] = [];
  for (const it of ITEMS) for (const s of RESPONDERS) {
    const c = QUOTES[it.id][s.id];
    if (c.status === "ok") continue;
    rows.push({ key: `${it.id}-${s.id}`, tone: c.status, sup: s.id, title: `${it.id} · ${it.desc}`, note: c.note ?? "", raw: c.raw, source: c.source, value: c.value, file: c.file, loc: c.loc, box: c.box, ocr: c.ocr, steps: c.steps, byAI: c.byAI });
  }
  for (const s of RESPONDERS) ANSWERS[s.id].forEach((a, i) => {
    if (a.status === "bad" || a.status === "warn")
      rows.push({ key: `Q${i}-${s.id}`, tone: a.status, sup: s.id, title: `Quality question: ${QUESTIONS[i]}`, note: a.note ?? a.label });
  });
  for (const s of RESPONDERS) {
    if (readByAI(s.id)) aiIssues(s.id).filter((i) => i.tone === "bad").forEach((i, n) => rows.push({ key: `iss-${s.id}-${n}`, tone: "bad", sup: s.id, title: i.title, note: i.note, source: i.file ? `${i.file.split("/").pop()} · ${i.loc ?? ""}` : undefined, raw: i.raw, file: i.file, loc: i.loc, byAI: true }));
    else if (s.id === "B") rows.push({ key: "tot-B", tone: "bad", sup: "B", title: "Quote total doesn't add up", note: "The item prices don't add up to the total stated on page 3.", source: "PPW-Q-2611-044.pdf, page 3" });
  }
  return rows.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "bad" ? -1 : 1));
}

export function reviewQueueCounts() {
  const q = reviewQueue();
  const bad = q.filter((r) => r.tone === "bad").length;
  return { bad, warn: q.length - bad, total: q.length };
}

export function issueSummary() {
  let warn = 0, bad = 0;
  for (const row of Object.values(QUOTES)) for (const c of Object.values(row)) {
    if (c.status === "warn") warn++;
    if (c.status === "bad") bad++;
  }
  return { warn, bad };
}

export function supplierTotals() {
  return RESPONDERS.map((s) => {
    let total = 0, quoted = 0;
    for (const it of ITEMS) {
      const c = QUOTES[it.id][s.id];
      if (c.value != null && c.kind !== "alternative") { total += c.value * it.qty; quoted++; }
    }
    return { id: s.id, total, quoted };
  });
}

export const totalQty = ITEMS.reduce((a, b) => a + b.qty, 0);
export const estValue = ITEMS.reduce((a, it) => a + (LAST_YEAR_F[it.id] ?? basePrice(it)) * 1.06 * it.qty, 0); // last year's prices + ~6% paper increase

// ---------- Commercial terms (from answer-key/quote_terms.csv) ----------
export type Terms = { currency: string; freight: string; payment: number; lead: number; validity: string; moq?: string; discount?: string; tax: string };
const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Not stated");
export const TERMS: Record<string, Terms> = Object.fromEntries(
  K.quote_terms.map((t) => {
    const id = String(t.supplier_id);
    const days = t.valid_until ? Math.round((new Date(String(t.valid_until)).getTime() - new Date("2026-11-09").getTime()) / 86400000) : null;
    return [id, {
      currency: t.currency === "USD" ? `USD → INR @ ${USD_RATE}` : String(t.currency),
      freight: t.freight === "Extra" ? "Extra (we added 4% estimate)" : String(t.freight),
      payment: Number(t.payment_days),
      lead: Number(t.lead_time_weeks),
      validity: days != null && days <= 20 ? `${fmtDate(String(t.valid_until))} (${days} days)` : fmtDate(String(t.valid_until)),
      tax: String(t.gst).startsWith("Included") ? "Included 18% GST (removed)" : t.gst === "Extra" ? "Before GST" : String(t.gst),
      discount: t.discount ? String(t.discount) : undefined,
      moq: t.minimum_order ? String(t.minimum_order) : undefined,
    }];
  }),
);

// ---------- Quality questions & answers (seed/quality_questions.csv, answer-key/quality_answers.csv, seed/supplier_documents.csv) ----------
export type QA = { status: Status | "none"; label: string; note?: string };
export const QUESTIONS: string[] = M.quality_questions.map((q) => String(q.question));

const docs = (sup: string, type: string) => M.supplier_documents.filter((d) => d.supplier_id === sup && String(d.doc_type).startsWith(type));
function judge(sup: string, qi: number, answer: string): QA {
  if (/^not answered/i.test(answer)) return { status: "none", label: "Not answered", note: "No answer received. Never treated as a pass." };
  if (qi === 0 || qi === 1) {
    const d = docs(sup, qi === 0 ? "ISO 9001" : "Box-strength")[0];
    if (!d) return { status: "warn", label: "Says yes", note: `${answer}. No document attached to back it up.` };
    const st = String(d.status);
    if (st === "Expired") return { status: "bad", label: "Expired", note: `Certificate ${d.number} expired on ${fmtDate(String(d.valid_until))}` };
    if (st.startsWith("Name")) return { status: "bad", label: "Name mismatch", note: `Certificate is issued to ‘${d.issued_to}’, not ‘${SUPPLIERS.find((x) => x.id === sup)?.name}’` };
    if (st.startsWith("Fails")) return { status: "bad", label: "Fails spec", note: st };
    return { status: "ok", label: qi === 0 ? `Valid to ${fmtDate(String(d.valid_until))}` : "Report attached", note: `${d.doc_type} ${d.number}` };
  }
  if (/call/i.test(answer)) return { status: "warn", label: "Yes (call)", note: "Said on a phone call, not in writing" };
  return { status: "ok", label: answer };
}
export const ANSWERS: Record<string, QA[]> = Object.fromEntries(
  ["A", "B", "C", "D", "E"].map((sup) => {
    const q = EX.suppliers?.[sup]?.quality;
    if (q?.length) return [sup, q.map((x) => ({ status: x.status, label: x.label, note: x.note }))];
    return [sup, K.quality_answers.filter((a) => a.supplier_id === sup).map((a, i) => judge(sup, i, String(a.answer)))];
  }),
);
/** Overall result: Failed if a certificate expired or a test fails spec; Check if something is unproven; Not answered if nothing came back. */
export const QUALITY_RESULT: Record<string, { status: Status | "none"; label: string }> = Object.fromEntries(
  Object.entries(ANSWERS).map(([sup, list]) => {
    if (list.some((x) => x.label === "Expired" || x.label === "Fails spec")) return [sup, { status: "bad", label: "Failed" }];
    if (list.filter((x) => x.status === "none").length >= 3) return [sup, { status: "none", label: "Not answered" }];
    if (list.some((x) => x.status !== "ok")) return [sup, { status: "warn", label: "Check" }];
    return [sup, { status: "ok", label: "Passed" }];
  }),
);

export const inr = (x: number, d = 0) => "₹" + x.toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: d });
export const lakh = (x: number) => "₹" + (x / 1e5).toLocaleString("en-IN", { maximumFractionDigits: 1 }) + " L";
export const crore = (x: number) => "₹" + (x / 1e7).toFixed(2) + " Cr";
