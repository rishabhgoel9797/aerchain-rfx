/**
 * `npm run read-quotes` — the real reading pipeline for RFQ-2026-014.
 *
 *   1. Convert every supplier file to located text (Excel/PDF/Word/OCR/chat)   — code
 *   2. AI reads prices, terms, discounts, totals, quality answers, certificates — AI
 *   3. Match to our boxes by size, convert to ₹ per box, before GST, delivered  — code
 *   4. Checks → green / amber / red with a reason                               — code
 *
 * Uses ONLY the supplier files and master data. The answer key is never read here.
 * Output: data/extracted/RFQ-2026-014.json  and  src/data/extracted.json (loaded by the app).
 *   Options: --supplier=B   read one supplier only (others are kept from the last run)
 *            --event=RFQ-2026-017   read a reply for another event: its items come from data/events/<event>/items.json
 *                                   (frozen when the request was approved), its inbox from data/files/<event>/inbox.json,
 *                                   and the result goes to data/extracted/<event>.json.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { toDocument, closeOcr } from "./reader/convert.mjs";
import { askJson, QuoteSchema, quoteSystemPrompt, quoteUserPrompt, CertSchema, certSystemPrompt, aiClient, QUOTE_JSON_SCHEMA, CERT_JSON_SCHEMA } from "./reader/ai.mjs";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const seed = JSON.parse(readFileSync(join(root, "src", "data", "seed.json"), "utf8"));
const M = seed.master; // master data only — NOT the answer key
const EVENT = process.argv.find((a) => a.startsWith("--event="))?.split("=")[1] ?? "RFQ-2026-014";
const DEMO = EVENT === "RFQ-2026-014";
const EV = join(root, "data", "files", EVENT);
const inbox = JSON.parse(readFileSync(join(EV, "inbox.json"), "utf8")).messages;
// The demo event uses the 30 master items; any other event uses the items frozen from its approved request.
const items = DEMO ? M.items : JSON.parse(readFileSync(join(root, "data", "events", EVENT, "items.json"), "utf8"));
const FILE_PREFIX = DEMO ? "" : `${EVENT}/`; // file paths shown in the app are relative to data/files/RFQ-2026-014, or start with the event id
const itemBy = Object.fromEntries(items.map((i) => [i.item_code, i]));
const USD = Number(M.market_prices.find((m) => m.item === "US dollar")?.price ?? 84.2);
const GST = 0.18, FREIGHT_EST = 0.04, TODAY = "2026-11-17";
const only = process.argv.find((a) => a.startsWith("--supplier="))?.split("=")[1];
const r2 = (x) => Math.round(x * 100) / 100;

const isCert = (f) => /ISO|BCT|Test|GST_/i.test(f);
const dims = (s) => {
  const m = String(s ?? "").match(/(\d+(?:\.\d+)?)\s*[x×X*]\s*(\d+(?:\.\d+)?)\s*[x×X*]\s*(\d+(?:\.\d+)?)/);
  if (!m) return null;
  let d = m.slice(1, 4).map(Number);
  if (Math.max(...d) < 200) d = d.map((x) => Math.round(x * 10)); // centimetres → mm
  return d;
};
const sameSize = (a, it) => a && a[0] === it.length_mm && a[1] === it.width_mm && a[2] === it.height_mm;

/** Find the segment a location label points to. Labels look like "file.ext · Page 1, line 3". */
function findSeg(documents, loc) {
  const [f, rest] = String(loc ?? "").includes("·") ? String(loc).split("·").map((x) => x.trim()) : [null, String(loc ?? "").replace(/^File:\s*[^,]+,\s*/i, "").trim()];
  const docs = f ? documents.filter((d) => d.file === f || d.path.endsWith(f)) : documents;
  for (const d of docs.length ? docs : documents) { const s = d.segments.find((x) => x.loc === rest); if (s) return { file: d.path, ...s, loc: rest }; }
  return { file: (docs[0] ?? documents[0])?.path, loc: rest };
}
const tokens = (s) => String(s).toLowerCase().replace(/pvt|private|ltd|limited|llp|co\.|company|india|industries|\./g, " ").split(/[^a-z]+/).filter((t) => t.length > 2);

async function readSupplier(sup) {
  const msgs = inbox.filter((m) => m.supplier_id === sup.supplier_id && ["Quote", "Updated quote", "Price on a call"].includes(m.kind));
  if (!msgs.length) return null;
  const quoteFiles = [...new Set(msgs.flatMap((m) => [m.text_file, ...m.attachments.filter((a) => !isCert(a))]))];
  const certFiles = [...new Set(msgs.flatMap((m) => m.attachments.filter(isCert)))];

  console.log(`\n${sup.supplier_id} · ${sup.name}`);
  const documents = [];
  for (const f of quoteFiles) {
    const d = await toDocument(join(EV, f));
    d.path = FILE_PREFIX + f;
    documents.push(d);
    console.log(`  read ${f}: ${d.segments.length} segments (${d.kind})`);
  }
  // Photos also go to the model as an image (if it can see), so it can cross-check the OCR.
  const images = [];
  if (aiClient().provider === "anthropic") for (const d of documents.filter((x) => x.kind === "Photo")) {
    const buf = await sharp(join(EV, d.path.slice(FILE_PREFIX.length))).resize({ width: 1500, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    images.push({ mediaType: "image/jpeg", data: buf.toString("base64") });
  }
  const ai = await askJson({ system: quoteSystemPrompt(), user: quoteUserPrompt({ supplierName: sup.name, items, documents }), schema: QuoteSchema, jsonSchema: QUOTE_JSON_SCHEMA, images, label: `${sup.supplier_id} quote` });
  console.log(`  AI found ${ai.data.prices.length} price entries in ${(ai.ms / 1000).toFixed(1)}s (${ai.usage?.total_tokens ?? "?"} tokens)`);

  const certs = [];
  for (const f of certFiles) {
    const d = await toDocument(join(EV, f));
    const c = await askJson({ system: certSystemPrompt(), user: `Document ${d.file}:\n` + d.segments.map((s) => `[${s.loc}] ${s.text}`).join("\n"), schema: CertSchema, jsonSchema: CERT_JSON_SCHEMA, label: `${sup.supplier_id} ${d.file}` });
    for (const k of ["issued_to", "number", "valid_until"]) if (c.data[k] === "null" || c.data[k] === "") c.data[k] = null;
    certs.push({ file: FILE_PREFIX + f, ...c.data });
    console.log(`  certificate ${f}: ${c.data.doc_type}, issued to ${c.data.issued_to}, valid ${c.data.valid_until ?? "—"}`);
  }
  return { sup, documents, ai: ai.data, meta: { model: ai.model, ms: ai.ms, tokens: ai.usage?.total_tokens }, certs };
}

/** Code: turn what the AI read into comparable ₹/box values, with every step recorded. */
function normalise(r) {
  const { sup, ai, documents } = r;
  const segOf = (loc) => findSeg(documents, loc);
  const cells = {};
  const entries = {};
  const push = (code, e) => (entries[code] ??= []).push(e);

  // 1) basis carries over: same line first, then the quote's overall terms (column headings, "all prices in USD"…)
  const t = ai.terms ?? {};
  const termUnit = /100/.test(t.price_unit ?? "") ? "per_100" : /1000|1,000/.test(t.price_unit ?? "") ? "per_1000" : /kg/i.test(t.price_unit ?? "") ? "per_kg" : /box|pc|piece|carton|each|per_box/i.test(t.price_unit ?? "") ? "per_box" : null;
  const termCur = /usd|dollar|\$/i.test(t.currency ?? "") ? "USD" : /inr|rs|₹|rupee/i.test(t.currency ?? "") ? "INR" : null;
  const termGst = /incl/i.test(t.gst ?? "") ? "included" : /extra|excl|plus|additional/i.test(t.gst ?? "") ? "excluded" : null;
  const termFr = /extra|ex-?works|excl/i.test(t.freight ?? "") ? "extra" : /incl|deliver|for /i.test(t.freight ?? "") ? "included" : null;
  // a unit written in a column heading or once for the whole document (e.g. "Rate (Rs. per 100 pcs)")
  const allText = documents.flatMap((d) => d.segments.map((x) => x.text)).join("\n");
  const docUnit = /per\s*100\s*(pcs|pieces|nos|boxes)?\b|\/\s*100\s*(pcs|nos)/i.test(allText) ? "per_100" : /per\s*1,?000\s*(pcs|nos|boxes)/i.test(allText) ? "per_1000" : null;
  const where = (loc) => { const g = segOf(loc); return `${g.file}|${g.loc}`; }; // same spot, however the label was written
  for (const p of ai.prices) {
    for (const [f, dflt] of [["unit", termUnit ?? docUnit], ["currency", termCur], ["gst", termGst], ["freight", termFr]]) {
      if (p[f] !== "unknown" && !(f === "unit" && p[f] === "per_box" && docUnit && !termUnit && /^\d/.test(String(p.supplier_text).trim()) && documents.some((d) => d.kind === "Excel"))) continue;
      const sib = ai.prices.find((q) => q !== p && where(q.loc) === where(p.loc) && q[f] !== "unknown");
      if (sib) p[f] = sib[f]; else if (dflt) p[f] = dflt;
    }
  }

  // 2) match by size in code: the written size wins over the AI's guess
  for (const p of ai.prices) {
    const seg = segOf(p.loc);
    const d = dims(p.supplier_item_ref) ?? dims(p.supplier_text) ?? (p.applies_to_ply ? null : dims(seg.text));
    p.dims = d;
    if (!d) continue;
    const exact = items.filter((i) => sameSize(d, i));
    const plyText = String(p.supplier_item_ref ?? seg.text ?? "").match(/(\d)\s*-?\s*ply/i)?.[1];
    const pick = exact.length === 1 ? exact[0] : exact.find((i) => String(i.ply) === plyText);
    if (pick) {
      if (p.our_item_code && p.our_item_code !== pick.item_code) p.rematched = `The AI matched this to ${p.our_item_code}; the written size ${d.join("×")} mm is ${pick.item_code}, so it was moved there.`;
      p.our_item_code = pick.item_code;
    } else if (!p.our_item_code) {
      // nearest box with the same ply, within 5% on every side → matched, but flagged
      const ply = Number(plyText) || null;
      const near = items.filter((i) => (!ply || i.ply === ply) && [i.length_mm, i.width_mm, i.height_mm].every((x, k) => Math.abs(x - d[k]) / x <= 0.05));
      if (near.length === 1) { p.our_item_code = near[0].item_code; p.match_confidence = "low"; }
    }
  }
  for (const p of ai.prices) {
    if (p.our_item_code && itemBy[p.our_item_code]) push(p.our_item_code, p);
    else if (p.applies_to_ply && !p.dims) items.filter((i) => i.ply === Number(p.applies_to_ply)).forEach((i) => push(i.item_code, { ...p, group: true }));
  }
  // explicit item prices beat group prices
  for (const code of Object.keys(entries)) if (entries[code].some((e) => !e.group)) entries[code] = entries[code].filter((e) => !e.group);
  // "can't supply this one" beats a group price ("3 ply ₹39/kg" doesn't cover a size they said they won't make)
  const refused = {};
  for (const n of ai.not_offered ?? []) {
    const it = items.find((i) => i.item_code === n.our_item_code) ?? (dims(n.supplier_text) ? items.find((i) => sameSize(dims(n.supplier_text), i)) : null);
    if (it) { refused[it.item_code] = n; delete entries[it.item_code]; }
  }

  // 3) discounts: one whose only condition is ordering within the quote's validity applies to the comparison
  for (const d of ai.discounts) if (!d.applies_unconditionally && /validity|valid period|confirmed within|before \d/i.test(d.condition) && !/all (30 )?items|complete order|entire|whole order/i.test(d.condition)) { d.applies_unconditionally = true; d.note = "Applies to any order placed within the quote's validity, so it's included."; }
  const unconditional = ai.discounts.filter((d) => d.applies_unconditionally && d.percent);

  const convert = (p, it) => {
    const steps = [];
    let v = Number(p.value);
    if (!isFinite(v) || v <= 0 || p.value === null) return null; // 0 or missing = couldn't read, never a price
    steps.push(`Written: ${p.supplier_text}`);
    if (p.unit === "per_100") { v /= 100; steps.push("Per 100 boxes ÷ 100"); }
    if (p.unit === "per_1000") { v /= 1000; steps.push("Per 1,000 boxes ÷ 1,000"); }
    if (p.unit === "per_kg") { if (!it.weight_kg) return null; v *= it.weight_kg; steps.push(`Per kg × ${it.weight_kg} kg per box`); }
    if (p.currency === "USD") { v *= USD; steps.push(`US dollars × ₹${USD}`); }
    if (p.gst === "included") { v /= 1 + GST; steps.push("GST 18% removed"); }
    for (const d of unconditional) { v *= 1 - d.percent / 100; steps.push(`${d.percent}% discount (${d.condition.slice(0, 60)})`); }
    if (p.freight === "extra") { v *= 1 + FREIGHT_EST; steps.push("Freight extra: +4% estimate"); }
    return { value: r2(v), steps };
  };

  for (const it of items) {
    const es = entries[it.item_code] ?? [];
    const main = es.filter((e) => !e.is_alternative);
    const alt = es.find((e) => e.is_alternative);
    if (!main.length && alt) {
      const c = convert(alt, it);
      const seg = segOf(alt.loc);
      cells[it.item_code] = { value: c?.value ?? null, status: "warn", kind: "alternative", note: `Offered a different item: ${alt.note ?? alt.supplier_text}. Not compared as the same box.`, raw: alt.supplier_text, steps: c?.steps ?? [], file: seg.file, loc: seg.loc };
      continue;
    }
    if (!main.length) continue;
    const p = main[0];
    const c = convert(p, it);
    const seg = segOf(p.loc);
    const cell = { value: c?.value ?? null, status: "ok", kind: p.unit === "per_box" && p.currency !== "USD" && p.gst !== "included" ? "firm" : "converted", note: "", raw: p.supplier_text, steps: c?.steps ?? [], file: seg.file, loc: seg.loc, box: seg.box, ocr: seg.ocr_confidence };
    const flags = [];
    const values = [...new Set(main.map((e) => convert(e, it)?.value).filter((x) => x != null))];
    if (values.length > 1) { cell.status = "bad"; flags.push(`Two different prices for this box in the same reply (${main.map((e) => `${e.supplier_text} at ${findSeg(documents, e.loc).loc}`).join("; ")})`); }
    if (p.source === "spoken" || /call/i.test(seg.file ?? "")) { cell.kind = "spoken"; flags.push("Price given on a phone call, not in writing"); }
    if (p.unit === "unknown") flags.push("The price unit isn't stated (per box, per 100 or per kg?)");
    if (p.reading_unsure) { cell.kind = "unsure"; flags.push(p.note || "The AI couldn't read this value clearly"); }
    if (seg.ocr_confidence != null && seg.ocr_confidence < 75) { cell.kind = "unsure"; flags.push(`Photo reading confidence only ${seg.ocr_confidence}%`); }
    const d = p.dims;
    if (!p.group && d && !sameSize(d, it)) flags.push(`Size in their reply (${d.join("×")} mm) isn't exactly ours (${it.length_mm}×${it.width_mm}×${it.height_mm} mm). Matched as the closest box; please confirm`);
    else if (!p.group && !d && p.match_confidence === "low") flags.push(`Unsure match: their "${p.supplier_item_ref ?? p.supplier_text}" to our ${it.item_code}`);
    if (p.rematched) cell.rematched = p.rematched;
    if (cell.value == null && p.unit === "per_kg" && !it.weight_kg) {
      cell.kind = "unsure"; flags.push("Quoted per kg, but we don't have this box's weight yet, so it can't be turned into a per-box price. Ask the supplier for the per-box price or the box weight");
    } else if (cell.value == null) {
      if (p.reading_unsure || seg.ocr_confidence != null) { cell.kind = "unsure"; flags.push("Couldn't read this value. Check the original"); }
      else { cell.status = "bad"; flags.push("No usable number"); }
    }
    if (flags.length && cell.status === "ok") cell.status = "warn";
    cell.note = flags.length ? flags.join(". ") + "." : (c?.steps ?? []).slice(1).join(", ") || "Taken as quoted";
    cells[it.item_code] = cell;
  }

  // "same as last year" → look up last year's price for the boxes still without a price
  if (ai.same_as_last_year) {
    const seg = segOf(ai.same_as_last_year.loc);
    for (const it of items) {
      if (cells[it.item_code] || refused[it.item_code]) continue;
      const ly = M.last_year_prices.find((x) => x.supplier_id === sup.supplier_id && x.item_code === (it.our_code ?? it.item_code));
      if (ly) {
        const exWorks = /ex-works/i.test(ly.basis);
        const v = r2(Number(ly.price_per_box_inr) * (exWorks ? 1 + FREIGHT_EST : 1));
        cells[it.item_code] = { value: v, status: "ok", kind: "converted", note: `Said "${ai.same_as_last_year.supplier_text.slice(0, 60)}": last year's price ₹${ly.price_per_box_inr} (${ly.contract_ref})${exWorks ? " + 4% freight estimate" : ""}.`, raw: ai.same_as_last_year.supplier_text, steps: [`Last year: ₹${ly.price_per_box_inr} (${ly.contract_ref})`, ...(exWorks ? ["Freight extra: +4% estimate"] : [])], file: seg.file, loc: seg.loc };
      } else {
        cells[it.item_code] = { value: null, status: "bad", kind: "missing", note: `Said "same as last year", but we have no price from ${sup.name} for this box last year. Ask the supplier.`, raw: ai.same_as_last_year.supplier_text, steps: [], file: seg.file, loc: seg.loc };
      }
    }
  }
  for (const it of items) if (!cells[it.item_code] && refused[it.item_code]) { const n = refused[it.item_code]; const seg = segOf(n.loc); cells[it.item_code] = { value: null, status: "warn", kind: "not_quoted", note: `Not priced in their reply: "${n.supplier_text}". Shown as Not quoted, never as zero.`, raw: n.supplier_text, steps: [], file: seg.file, loc: seg.loc }; }
  for (const it of items) if (!cells[it.item_code]) cells[it.item_code] = { value: null, status: "warn", kind: "not_quoted", note: "Not in their reply. Shown as Not quoted, never as zero.", steps: [] };

  // stated total vs. sum of their own line prices (in their own currency and basis)
  const issues = [];
  if (ai.stated_total?.value) {
    let sum = 0;
    for (const it of items) { const e = (entries[it.item_code] ?? []).find((x) => !x.is_alternative && !x.group); if (e) sum += (Number(e.value) * it.yearly_qty) / (e.unit === "per_100" ? 100 : e.unit === "per_1000" ? 1000 : 1); }
    const diff = sum ? Math.abs(sum - ai.stated_total.value) / sum : 0;
    if (diff > 0.005) issues.push({ tone: "bad", title: "Quote total doesn't add up", note: `The line prices add up to ${Math.round(sum).toLocaleString("en-IN")}, but the reply states ${Math.round(ai.stated_total.value).toLocaleString("en-IN")} (${(diff * 100).toFixed(1)}% different).`, ...segOf(ai.stated_total.loc), raw: `Stated total ${ai.stated_total.value}` });
  }
  for (const d of ai.discounts) issues.push({ tone: "info", title: `${d.applies_unconditionally ? "Discount applied" : "Conditional discount"}: ${d.percent ?? "?"}%`, note: d.applies_unconditionally ? `"${d.condition}". ${d.note ?? "Included in the comparable prices."}` : `Not applied to prices: "${d.condition}". Shown as a scenario in Award.`, ...segOf(d.loc) });
  if (ai.replaces_earlier_quote) issues.push({ tone: "info", title: "Replaces an earlier quote", note: ai.replaces_earlier_quote });
  return { cells, issues };
}

/** Code: quality questions, judged against the certificates the AI read. */
function judgeQuality(r) {
  const out = [];
  const supTok = tokens(r.sup.name);
  for (const q of (items.some((i) => i.ply) ? M.quality_questions : [])) {
    const a = r.ai.quality_answers.find((x) => x.question_id === q.question_id);
    const certType = q.question_id === "Q1" ? /iso/i : q.question_id === "Q2" ? /strength|compression|bct|test/i : null;
    const cert = certType ? r.certs.find((c) => certType.test(c.doc_type) || certType.test(c.file)) : null;
    if (!a && !cert) { out.push({ question_id: q.question_id, status: "none", label: "Not answered", note: "No answer received. Never treated as a pass." }); continue; }
    if (certType) {
      if (!cert) { const seg = findSeg(r.documents, a?.loc); out.push({ question_id: q.question_id, status: "warn", label: "Says yes", note: `${a?.answer ?? ""}. No document attached to back it up.`, file: seg.file, loc: seg.loc }); continue; }
      const issuedTok = tokens(cert.issued_to ?? "");
      const nameOk = supTok.every((t) => issuedTok.includes(t));
      if (!nameOk) { out.push({ question_id: q.question_id, status: "bad", label: "Name mismatch", note: `Certificate is issued to "${cert.issued_to}", not "${r.sup.name}"`, file: cert.file }); continue; }
      if (cert.valid_until && cert.valid_until < TODAY && q.question_id === "Q1") { out.push({ question_id: q.question_id, status: "bad", label: "Expired", note: `Certificate ${cert.number ?? ""} expired on ${cert.valid_until}`, file: cert.file }); continue; }
      if (q.question_id === "Q2" && cert.test_result_kgf != null && cert.test_result_kgf < 500) { out.push({ question_id: q.question_id, status: "bad", label: "Fails spec", note: `Box strength ${cert.test_result_kgf} kg vs 500 kg required`, file: cert.file }); continue; }
      out.push({ question_id: q.question_id, status: "ok", label: q.question_id === "Q1" ? `Valid to ${cert.valid_until ?? "?"}` : `${cert.test_result_kgf ?? "?"} kg`, note: `${cert.doc_type} ${cert.number ?? ""}`.trim(), file: cert.file });
      continue;
    }
    const seg = findSeg(r.documents, a.loc);
    const spoken = /call|phone|said/i.test(a.answer) || /call/i.test(seg.file ?? "");
    out.push({ question_id: q.question_id, status: spoken ? "warn" : "ok", label: spoken ? "Yes (call)" : a.answer.slice(0, 40), note: spoken ? "Said on a phone call, not in writing" : undefined, loc: seg.loc, file: seg.file });
  }
  return out;
}

// ------------------------------------------------------------------ run
const { provider, model } = aiClient();
console.log(`Reading ${EVENT} with ${provider} / ${model}`);
const suppliers = M.suppliers.filter((s) => (DEMO ? ["A", "B", "C", "D", "E"].includes(s.supplier_id) : true) && (!only || s.supplier_id === only));
const outPath = join(root, "data", "extracted", `${EVENT}.json`);
const previous = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : { suppliers: {} };
const result = { event: EVENT, read_at: new Date().toISOString(), provider, model, suppliers: { ...previous.suppliers } };
mkdirSync(dirname(outPath), { recursive: true });

for (const s of suppliers) {
  const r = await readSupplier(s);
  if (!r) continue;
  const { cells, issues } = normalise(r);
  result.suppliers[s.supplier_id] = {
    id: s.supplier_id, name: s.name,
    files: r.documents.map((d) => ({ path: d.path, kind: d.kind, segments: d.segments })),
    ai: r.ai, meta: r.meta, certs: r.certs,
    cells, issues, quality: judgeQuality(r),
  };
  writeFileSync(outPath, JSON.stringify(result, null, 1)); // save after each supplier
}
await closeOcr();

// cross-supplier check: a price far from everyone else's is probably a misread or a missing digit
for (const it of items) {
  for (const [sid, s] of Object.entries(result.suppliers)) {
    const c = s.cells[it.item_code];
    if (!c || c.value == null || c.value <= 0 || c.kind === "alternative") continue;
    // middle price across ALL suppliers (incl. this one), so one or two wrong readings can't drag the reference
    const others = Object.values(result.suppliers).map((o) => o.cells[it.item_code]).filter((x) => x && x.value != null && x.kind !== "alternative").map((x) => x.value).sort((a, b) => a - b);
    if (others.length < 3) continue;
    const med = others[Math.floor(others.length / 2)];
    const ratio = c.value / med;
    if (ratio < 0.4 || ratio > 2.5) {
      if (c.status !== "bad") c.status = "warn";
      c.kind = "unsure";
      c.note = `${ratio < 1 ? `About ${Math.round(1 / ratio)}× lower` : `About ${Math.round(ratio)}× higher`} than other suppliers (their middle price is ₹${med}). Possibly a missing digit or misread.`;
    }
  }
}

writeFileSync(outPath, JSON.stringify(result, null, 1));
if (DEMO) writeFileSync(join(root, "src", "data", "extracted.json"), JSON.stringify(result)); // other events are read from data/extracted at request time
const counts = Object.values(result.suppliers).map((s) => { const v = Object.values(s.cells); return `${s.id}: ${v.filter((c) => c.status === "ok").length} green, ${v.filter((c) => c.status === "warn").length} amber, ${v.filter((c) => c.status === "bad").length} red`; });
console.log("\n" + counts.join("\n"));
console.log(`\nSaved data/extracted/${EVENT}.json.${DEMO ? " Next: npm run score" : ""}`);
