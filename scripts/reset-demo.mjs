/**
 * `npm run reset-demo` — puts the demo back to its starting point:
 * REQ-0147 is "New" again, no Baddi sourcing event, no invites, original change history.
 * Copies the files in data/demo-start over data/seed, then rebuilds the app data.
 * Only these files are touched; supplier quotes and everything else stay as they are.
 */
import { copyFileSync, readdirSync, readFileSync, unlinkSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const from = join(root, "data", "demo-start");
const files = readdirSync(from).filter((f) => f.endsWith(".csv"));
for (const f of files) copyFileSync(join(from, f), join(root, "data", "seed", f));
// Remove files of requests created after the starting point (e.g. REQ-0152_message.txt from the request chat),
// so a new request with the same number never picks up an old one's files.
const keep = new Set([...readFileSync(join(from, "team_requests.csv"), "utf8").matchAll(/^(REQ-\d+),/gm)].map((m) => m[1]));
const reqDir = join(root, "data", "files", "requests");
const extra = readdirSync(reqDir).filter((f) => { const id = f.match(/^(REQ-\d+)_/)?.[1]; return id && !keep.has(id); });
for (const f of extra) unlinkSync(join(reqDir, f));
if (extra.length) console.log(`Removed ${extra.length} files from requests made after the start: ${extra.join(", ")}`);
// Quotes for RFQ-2026-014: put back the original inbox and AI readings, and remove replies added in the app.
const ev = join(root, "data", "files", "RFQ-2026-014");
const start = join(from, "RFQ-2026-014");
copyFileSync(join(start, "inbox.json"), join(ev, "inbox.json"));
copyFileSync(join(start, "extracted-full.json"), join(root, "data", "extracted", "RFQ-2026-014.json"));
copyFileSync(join(start, "extracted-app.json"), join(root, "src", "data", "extracted.json"));
const uploads = readdirSync(ev, { withFileTypes: true }).filter((d) => d.isDirectory()).flatMap((d) => readdirSync(join(ev, d.name)).filter((f) => f.startsWith("upload-")).map((f) => join(ev, d.name, f)));
for (const f of uploads) unlinkSync(f);
console.log(`Quotes: original inbox and readings restored${uploads.length ? `, ${uploads.length} uploaded reply files removed` : ""}`);
// Other events created after the start: their supplier replies, frozen line items and AI readings.
const filesDir = join(root, "data", "files");
const otherEvents = readdirSync(filesDir).filter((d) => /^RFQ-\d{4}-\d{3}$/.test(d) && d !== "RFQ-2026-014");
for (const d of otherEvents) rmSync(join(filesDir, d), { recursive: true, force: true });
if (existsSync(join(root, "data", "events"))) rmSync(join(root, "data", "events"), { recursive: true, force: true });
const exDir = join(root, "data", "extracted");
for (const f of readdirSync(exDir).filter((f) => f.endsWith(".json") && f !== "RFQ-2026-014.json")) unlinkSync(join(exDir, f));
if (otherEvents.length) console.log(`Removed replies for ${otherEvents.join(", ")}`);
console.log(`Reset ${files.length} files: ${files.map((f) => f.replace(".csv", "")).join(", ")}`);
execFileSync(process.execPath, [join(root, "scripts", "seed.mjs")], { stdio: "inherit" });
