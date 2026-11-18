/**
 * Read and write the master-data CSVs in data/seed (server only). Used by API routes that change data,
 * then `reseed()` rebuilds src/data/seed.json so every page shows the change.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOT = process.cwd();
export const seedPath = (name: string) => join(ROOT, "data", "seed", `${name}.csv`);

export type CsvTable = { head: string[]; rows: Record<string, string>[] };

export function readCsv(name: string): CsvTable {
  const text = readFileSync(seedPath(name), "utf8").replace(/^﻿/, "");
  const out: string[][] = [];
  let row: string[] = [], cell = "", q = false;
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
      if (row.some((c) => c !== "")) out.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); if (row.some((c) => c !== "")) out.push(row); }
  const [head, ...body] = out;
  return { head, rows: body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""]))) };
}

const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Writes the whole table back, with the BOM so Excel shows ₹ and × correctly. */
export function writeCsv(name: string, t: CsvTable) {
  const lines = [t.head.join(","), ...t.rows.map((r) => t.head.map((h) => esc(String(r[h] ?? ""))).join(","))];
  writeFileSync(seedPath(name), "﻿" + lines.join("\n") + "\n");
}

export const clean = (v: unknown, max = 200) => String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);

/** Rebuild src/data/seed.json from the CSVs. */
export function reseed() {
  execFileSync(process.execPath, [join(ROOT, "scripts", "seed.mjs")], { cwd: ROOT });
}

/** "17 Nov 14:05", the format used in change_history.csv. */
export function stamp(d = new Date()) {
  const m = d.toLocaleString("en-GB", { month: "short", timeZone: "Asia/Kolkata" });
  const day = d.toLocaleString("en-GB", { day: "numeric", timeZone: "Asia/Kolkata" });
  const t = d.toLocaleString("en-GB", { hour: "numeric", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
  return `${day} ${m} ${t}`;
}

/** Appends one line to change_history.csv. */
export function logChange(c: { who: string; area: string; tone?: string; what: string }) {
  const h = readCsv("change_history");
  const order = Math.max(0, ...h.rows.map((r) => Number(r.order) || 0)) + 1;
  h.rows.push({ order: String(order), when: stamp(), who: c.who, area: c.area, tone: c.tone ?? "none", what: c.what });
  writeCsv("change_history", h);
}

/** True if the event is saved in sourcing_events.csv, even before seed.json has reloaded. */
export function eventSaved(id: string) {
  try { return readCsv("sourcing_events").rows.some((r) => r.event_id === id); } catch { return false; }
}

/** The event's row as saved right now (stage, status, due), even before seed.json has reloaded. */
export function liveEventRow(id: string) {
  try { return readCsv("sourcing_events").rows.find((r) => r.event_id === id); } catch { return undefined; }
}

/** Suppliers invited to an event, as saved right now. */
export function invitesFor(id: string) {
  try { return readCsv("event_invites").rows.filter((r) => r.event_id === id); } catch { return []; }
}

/** True if the request is saved in team_requests.csv, even before seed.json has reloaded. */
export function requestSaved(id: string) {
  try { return readCsv("team_requests").rows.some((r) => r.request_id === id); } catch { return false; }
}

/** Now, as an India-time ISO string, for `updated_at` columns (sortable, and readable in Excel). */
export function nowIso(d = new Date()) {
  const ist = new Date(d.getTime() + 5.5 * 3600000);
  return ist.toISOString().slice(0, 19) + "+05:30";
}

/** Marks a row in a table as just changed: sets its updated_at and saves the table. */
export function touch(name: string, idCol: string, id: string) {
  const t = readCsv(name);
  const r = t.rows.find((x) => x[idCol] === id);
  if (!r) return;
  if (!t.head.includes("updated_at")) t.head.push("updated_at");
  r.updated_at = nowIso();
  writeCsv(name, t);
}
