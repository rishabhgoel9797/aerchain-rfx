/**
 * `npm run score` — compares what the AI read (data/extracted) with the answer key.
 * Reports, per supplier: values correct (within 1%), colour correct, and every miss.
 * Writes data/extracted/score.json (shown in the app).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(readFileSync(join(root, "src", "data", "seed.json"), "utf8"));
const ex = JSON.parse(readFileSync(join(root, "data", "extracted", "RFQ-2026-014.json"), "utf8"));
const key = seed.answerKey.quotes;
const STATUS = { green: "ok", amber: "warn", red: "bad" };

const rows = [];
const misses = [];
for (const k of key) {
  const s = ex.suppliers[k.supplier_id];
  if (!s) continue;
  const c = s.cells[k.item_code];
  const want = k.true_price_inr_per_box === "" ? null : Number(k.true_price_inr_per_box);
  const got = c?.value ?? null;
  // alternatives and "not quoted" have no comparable price in the key; the AI must not invent one
  const isAlt = /Alternative/.test(k.trap);
  const valueOk = isAlt ? c?.kind === "alternative" : want == null ? got == null || c?.status !== "ok" : got != null && Math.abs(got - want) / want <= 0.01;
  const statusOk = c?.status === STATUS[k.expected_status];
  rows.push({ supplier: k.supplier_id, item: k.item_code, valueOk, statusOk });
  rows[rows.length - 1].safe = !valueOk && c?.status !== "ok"; // wrong, but flagged for a person to check
  rows[rows.length - 1].dangerous = !valueOk && c?.status === "ok"; // wrong AND shown as fine
  if (!valueOk || !statusOk) misses.push({ supplier: k.supplier_id, item: k.item_code, expected: `${want ?? "—"} (${k.expected_status})`, got: `${got ?? "—"} (${Object.keys(STATUS).find((x) => STATUS[x] === c?.status) ?? "?"})`, trap: k.trap, ai_note: c?.note?.slice(0, 140) });
}

const per = {};
for (const r of rows) {
  per[r.supplier] ??= { values: 0, colours: 0, total: 0 };
  per[r.supplier].total++; if (r.valueOk) per[r.supplier].values++; if (r.statusOk) per[r.supplier].colours++;
}
const tot = rows.length, v = rows.filter((r) => r.valueOk).length, c = rows.filter((r) => r.statusOk).length;
console.log(`Scored ${tot} prices (${ex.provider} / ${ex.model}, read ${ex.read_at})\n`);
console.log("Supplier  Values right  Colour right");
for (const [sid, p] of Object.entries(per)) console.log(`${sid.padEnd(9)} ${String(p.values + "/" + p.total).padEnd(13)} ${p.colours}/${p.total}`);
console.log(`TOTAL     ${v}/${tot} (${Math.round((v / tot) * 100)}%)   ${c}/${tot} (${Math.round((c / tot) * 100)}%)`);
const dang = rows.filter((r) => r.dangerous).length, safeN = rows.filter((r) => r.safe).length;
console.log(`\nWrong values: ${tot - v}. Flagged amber/red for a person (safe): ${safeN}. Shown green (DANGEROUS): ${dang}.`);
if (misses.length) {
  console.log(`\nMisses (${misses.length}):`);
  for (const m of misses) console.log(`  ${m.supplier} ${m.item}: expected ${m.expected}, got ${m.got}. Trap: ${m.trap} | note: ${(m.ai_note ?? "").slice(0, 100)}`);
}
writeFileSync(join(root, "data", "extracted", "score.json"), JSON.stringify({ scored_at: new Date().toISOString(), model: ex.model, provider: ex.provider, total: tot, values_right: v, colours_right: c, dangerous: rows.filter((r) => r.dangerous).length, safe_misses: rows.filter((r) => r.safe).length, per_supplier: per, misses }, null, 1));
