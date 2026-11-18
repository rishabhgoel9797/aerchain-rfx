/**
 * `npm run seed` — reads the master sheets (data/seed/*.csv) and the answer key
 * (data/answer-key/*.csv) and writes src/data/seed.json, which the app loads.
 * Edit a CSV in Excel, run this, refresh the browser.
 *
 * Later the same sheets also fill the local SQLite database.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseCsv(text) {
  text = text.replace(/^﻿/, "");
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); if (row.some((c) => c !== "")) rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => {
    const v = (r[i] ?? "").trim();
    return [h.trim(), v !== "" && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v];
  })));
}

const load = (dir) => Object.fromEntries(
  readdirSync(join(root, "data", dir)).filter((f) => f.endsWith(".csv")).map((f) => [basename(f, ".csv"), parseCsv(readFileSync(join(root, "data", dir, f), "utf8"))]),
);

const seed = { master: load("seed"), answerKey: load("answer-key"), generatedAt: new Date().toISOString() };
mkdirSync(join(root, "src", "data"), { recursive: true });
writeFileSync(join(root, "src", "data", "seed.json"), JSON.stringify(seed, null, 1));
for (const [k, v] of Object.entries(seed.master)) console.log(`  master/${k}: ${v.length} rows`);
for (const [k, v] of Object.entries(seed.answerKey)) console.log(`  answer-key/${k}: ${v.length} rows`);
console.log("Wrote src/data/seed.json");
