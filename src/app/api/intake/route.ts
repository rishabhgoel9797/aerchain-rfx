import { NextResponse } from "next/server";
import { writeFileSync, readdirSync, unlinkSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, extname } from "node:path";
import { readCsv, writeCsv, logChange, reseed, stamp, nowIso } from "@/lib/csv-file";
import { readRequestWithClaude } from "@/lib/read-request";
import { nextRequestId, saveFields, itemLines, saveOverlapCheck, estimateValue, createEventFromRequest, logAiRead } from "@/lib/request-flow";

/**
 * POST /api/intake (multipart: text, kind = ai | internal | rfq, files[]) — the request chat.
 * Saves the message and files, Claude reads them (real call), code matches items and estimates value,
 * then it becomes an internal request — or, for a request for quotes, a sourcing event with a draft.
 */
export const runtime = "nodejs";

const OK_EXT = [".xlsx", ".docx", ".pdf", ".jpg", ".jpeg", ".png", ".txt", ".csv"];
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: "Couldn't read what was sent." }, { status: 400 });
  const text = String(form.get("text") ?? "").trim().slice(0, 6000);
  const want = String(form.get("kind") ?? "ai");
  const uploads = form.getAll("files").filter((f): f is File => typeof f === "object" && "arrayBuffer" in f).slice(0, 5);
  if (!text && !uploads.length) return NextResponse.json({ ok: false, error: "Type or paste what you need, or attach a file." }, { status: 400 });
  for (const f of uploads) {
    if (!OK_EXT.includes(extname(f.name).toLowerCase())) return NextResponse.json({ ok: false, error: `${f.name}: use Excel, Word, PDF, a photo or a text file.` }, { status: 400 });
    if (f.size > MAX_BYTES) return NextResponse.json({ ok: false, error: `${f.name} is over 10 MB.` }, { status: 400 });
  }

  const dir = join(process.cwd(), "data", "files", "requests");

  // 0. Duplicate check (code): same message, or the same file, already raised and still open → point to it instead.
  if (form.get("force") !== "yes") {
    const words = (t: string) => new Set(t.toLowerCase().replace(/\[[^\]]*\]/g, " ").split(/[^a-z0-9]+/).filter((w) => w.length > 2));
    const similar = (a: string, b: string) => { const A = words(a), B = words(b); if (A.size < 3 || B.size < 3) return a.trim().toLowerCase() === b.trim().toLowerCase(); let n = 0; A.forEach((w) => B.has(w) && n++); return n / (A.size + B.size - n) >= 0.8; };
    const hash = (b: Buffer) => createHash("sha1").update(b).digest("hex");
    const newHashes = new Set(await Promise.all(uploads.map(async (f) => hash(Buffer.from(await f.arrayBuffer())))));
    const fileHashes: Record<string, Set<string>> = {};
    for (const n of readdirSync(dir)) { const rid = n.match(/^(REQ-\d+)_/)?.[1]; if (rid && !/_message\.txt$/.test(n)) (fileHashes[rid] ??= new Set()).add(hash(readFileSync(join(dir, n)))); }
    const open = readCsv("team_requests").rows.filter((r) => r.status !== "covered" && r.status !== "closed");
    const dup = open.find((r) => (text && similar(text, r.message)) || [...newHashes].some((h) => fileHashes[r.request_id]?.has(h)));
    if (dup) {
      const why = text && similar(text, dup.message) ? "the same message" : "the same file";
      return NextResponse.json({ ok: true, duplicate: { requestId: dup.request_id, eventId: dup.event_id || undefined, title: dup.title, when: dup.received, why } });
    }
  }

  // 1. Save the message and files as this request's files (data/files/requests/REQ-xxxx_*).
  const id = nextRequestId();
  if (text) writeFileSync(join(dir, `${id}_message.txt`), text + "\n");
  for (const f of uploads) {
    const safe = f.name.replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, "_").slice(-80);
    writeFileSync(join(dir, `${id}_${safe}`), Buffer.from(await f.arrayBuffer()));
  }

  // 2. Claude reads it (real AI call). Without a read there's nothing sensible to save, so stop here.
  let ai: Awaited<ReturnType<typeof readRequestWithClaude>>;
  try {
    ai = await readRequestWithClaude({ id, title: "", from: "Rishabh", role: "Category Buyer", plant: "", via: "Chat", message: text }, { intake: true });
  } catch (e) {
    for (const f of readdirSync(dir).filter((n) => n.startsWith(`${id}_`))) unlinkSync(join(dir, f)); // nothing saved means no files either
    return NextResponse.json({ ok: false, error: `The AI couldn't read this (${(e as Error).message}). Nothing was saved. Try again.` }, { status: 502 });
  }
  const info = ai.intake!;
  // Too vague to act on: save nothing, remove the files just written, and ask back in the chat.
  if (info.tooVague) {
    for (const f of readdirSync(dir).filter((n) => n.startsWith(`${id}_`))) unlinkSync(join(dir, f));
    return NextResponse.json({ ok: true, clarify: info.clarify.length ? info.clarify : ["What exactly do you need?", "How many?", "Delivered where, and by when?"] });
  }
  const kind = want === "internal" || want === "rfq" ? want : info.kind;

  // 3. Who it's from and which plant (people.csv), worked out by code from Claude's reading.
  const people = readCsv("people").rows;
  const sender = info.sender ? people.find((p) => p.side !== "Supplier" && p.name.toLowerCase().split(" ")[0] === info.sender.toLowerCase().split(" ")[0]) : undefined;
  // Keep the real sender (e.g. Sandeep) even when it goes straight to a request for quotes.
  const from = sender?.name ?? (info.sender || "Rishabh");
  const plant = info.plant || (sender?.location ?? "").replace(" plant", "").replace(" (Head office)", "") || "Haridwar";

  const lines = await itemLines(id);
  const est = estimateValue(lines);
  const reqs = readCsv("team_requests");
  if (!reqs.head.includes("plant")) reqs.head.push("plant"); // where it's for, as the message says (else the sender's plant)
  const now = stamp();
  reqs.rows.unshift({
    request_id: id, title: info.title, from_person: from, via: "Chat", received: now.replace(/^(\d+ \w+) /, "$1, "),
    plant, status: "new", event_id: "", est_value_inr: est.complete ? String(est.total) : "" /* partial estimates would mislead */, message_file: text ? `files/requests/${id}_message.txt` : "",
    updated_at: nowIso(), message: text || `(Sent as ${uploads.length} file${uploads.length === 1 ? "" : "s"}: ${uploads.map((f) => f.name).join(", ")})`, translation: "",
  });
  writeCsv("team_requests", reqs);
  saveFields(id, ai.fields);
  if (lines.length) saveOverlapCheck(id, plant, lines);
  logAiRead(id, ai);
  logChange({ who: "Rishabh", area: "Requests", what: `Raised ${id} "${info.title}" in the request chat (${kind === "rfq" ? "request for quotes" : "internal request"}${want === "ai" ? `, chosen by the AI: ${info.kindReason}` : ""})` });

  // 4. A request for quotes goes straight to a sourcing event with a draft.
  let eventId: string | undefined;
  if (kind === "rfq") {
    eventId = createEventFromRequest(id, plant, info.category);
    logChange({ who: "Rishabh", area: "Requests", what: `Started sourcing event ${eventId} from ${id}` });
  }
  reseed();
  return NextResponse.json({ ok: true, requestId: id, eventId, kind, kindReason: info.kindReason, ms: ai.ms });
}
