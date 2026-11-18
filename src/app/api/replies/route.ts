import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join, extname } from "node:path";
import { readCsv, writeCsv, logChange, touch, reseed, nowIso } from "@/lib/csv-file";
import { replyAddress, inboxPath, type MailMsg } from "@/lib/mailbox";
import { ensureItems } from "@/lib/event-items";

/**
 * The supplier mailbox for RFQ-2026-014. Email transport is simulated; reading is real.
 *
 * POST (multipart: supplier, subject, text, files[], replaces) — an email arrives from a supplier.
 *   Saved at once in inbox.json (status "reading") and shown in the Supplier inbox; an earlier quote from the same
 *   supplier is marked "Superseded quote" (its certificates are kept). Then, in the background, the same AI reader
 *   used for every reply runs (scripts/read-quotes.mjs --supplier=X): the AI reads, code converts and checks.
 * GET ?id=MSG-… — reading status of one email: reading / read (with green-amber-red counts) / failed.
 */
export const runtime = "nodejs";
const run = promisify(execFile);
const ROOT = process.cwd();
const DEMO = "RFQ-2026-014";
const evDir = (event: string) => join(ROOT, "data", "files", event);
const OK_EXT = [".xlsx", ".docx", ".pdf", ".jpg", ".jpeg", ".png", ".txt"];
/** Who can reply: the demo's five responders, or whoever the event's request was sent to. */
const readable = (event: string) => (event === DEMO ? ["A", "B", "C", "D", "E"] : readCsv("event_invites").rows.filter((r) => r.event_id === event).map((r) => r.supplier_id));
const isCert = (f: string) => /ISO|BCT|Test|GST_/i.test(f);

// One reading at a time (each run rewrites the comparison file). Kept on globalThis so it survives code reloads.
const g = globalThis as unknown as { __replyQueue?: Promise<void> };
const enqueue = (job: () => Promise<void>) => { g.__replyQueue = (g.__replyQueue ?? Promise.resolve()).then(job, job); };

const loadInbox = (event: string) => (existsSync(inboxPath(event)) ? JSON.parse(readFileSync(inboxPath(event), "utf8")) : { event, messages: [] }) as { messages: MailMsg[] };
const saveInbox = (event: string, x: { messages: MailMsg[] }) => { mkdirSync(evDir(event), { recursive: true }); writeFileSync(inboxPath(event), JSON.stringify(x, null, 2) + "\n"); };
function setStatus(event: string, id: string, patch: Partial<MailMsg>) {
  const x = loadInbox(event);
  const m = x.messages.find((y) => y.id === id);
  if (m) Object.assign(m, patch);
  saveInbox(event, x);
}

/** Other events: "2 of 6 replied", and move to Compare once the first reply is read. */
function updateEventProgress(event: string) {
  if (event === DEMO) return;
  const t = readCsv("sourcing_events");
  const e = t.rows.find((r) => r.event_id === event);
  if (!e) return;
  const invited = readable(event).length;
  const replied = new Set(loadInbox(event).messages.filter((m) => m.read_status === "read").map((m) => m.supplier_id)).size;
  e.suppliers_status = `${replied} of ${invited} replied`;
  if (replied && (e.stage === "quotes" || e.stage === "suppliers")) e.stage = "compare";
  writeCsv("sourcing_events", t);
}

async function readInBackground(event: string, msgId: string, sid: string, supName: string, files: string[], replaces: boolean) {
  const started = Date.now();
  try {
    await run(process.execPath, [join(ROOT, "scripts", "read-quotes.mjs"), `--supplier=${sid}`, `--event=${event}`], { cwd: ROOT, timeout: 280000, maxBuffer: 10 * 1024 * 1024 });
    const ex = JSON.parse(readFileSync(join(ROOT, "data", "extracted", `${event}.json`), "utf8")).suppliers[sid];
    const cells = Object.values(ex.cells) as { status: string; kind: string }[];
    const summary = {
      green: cells.filter((c) => c.status === "ok").length, amber: cells.filter((c) => c.status === "warn").length,
      red: cells.filter((c) => c.status === "bad").length, notQuoted: cells.filter((c) => c.kind === "not_quoted").length,
      issues: (ex.issues ?? []).map((i: { title: string }) => i.title).slice(0, 6), secs: Math.round((Date.now() - started) / 1000),
    };
    setStatus(event, msgId, { read_status: "read", read_summary: summary });
    logChange({ who: "AI", area: "Quotes", what: `${event}: read a new email from ${supName} (${files.map((f) => f.split("/").pop()!.replace(/^upload-\d+_/, "")).join(", ")}) in ${summary.secs} s: ${summary.green} green, ${summary.amber} amber, ${summary.red} red${summary.notQuoted ? `, ${summary.notQuoted} not quoted` : ""}${replaces ? ". Replaces their earlier quote" : ""}` });
  } catch (e) {
    // Couldn't read: put their earlier quote back in use, so the comparison keeps the last good reading.
    const x = loadInbox(event);
    for (const m of x.messages) if (m.supplier_id === sid && m.kind === "Superseded quote" && (m as MailMsg & { superseded_by?: string }).superseded_by === msgId) { m.kind = (m as MailMsg & { was?: string }).was ?? "Quote"; }
    const me = x.messages.find((m) => m.id === msgId);
    if (me) { me.read_status = "failed"; me.kind = "Unread email"; me.read_error = String((e as { stderr?: string }).stderr || (e as Error).message).split("\n").filter(Boolean).slice(-1)[0]?.slice(0, 200); }
    saveInbox(event, x);
    logChange({ who: "AI", area: "Quotes", tone: "warn", what: `Couldn't read the new email from ${supName} for ${event}. Their earlier quote is still used.` });
  }
  updateEventProgress(event);
  touch("sourcing_events", "event_id", event);
  reseed();
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const id = q.get("id") ?? "";
  const m = loadInbox(q.get("event") || DEMO).messages.find((x) => x.id === id);
  if (!m) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, status: m.read_status ?? "read", summary: m.read_summary, error: m.read_error });
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: "Couldn't read what was sent." }, { status: 400 });
  const event = /^RFQ-\d{4}-\d{3}$/.test(String(form.get("event") ?? "")) ? String(form.get("event")) : DEMO;
  const sid = String(form.get("supplier") ?? "");
  const subject = String(form.get("subject") ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 160);
  const body = String(form.get("text") ?? "").trim().slice(0, 8000);
  const replaces = form.get("replaces") !== "no";
  const files = form.getAll("files").filter((f): f is File => typeof f === "object" && "arrayBuffer" in f).slice(0, 6);
  if (!readable(event).includes(sid)) return NextResponse.json({ ok: false, error: event === DEMO ? "Pick one of the suppliers who replied (A to E)." : "Pick one of the suppliers this request was sent to." }, { status: 400 });
  if (!body && !files.length) return NextResponse.json({ ok: false, error: "Write the email or attach their file." }, { status: 400 });
  for (const f of files) {
    if (!OK_EXT.includes(extname(f.name).toLowerCase())) return NextResponse.json({ ok: false, error: `${f.name}: use Excel, Word, PDF, a photo or a text file.` }, { status: 400 });
    if (f.size > 15 * 1024 * 1024) return NextResponse.json({ ok: false, error: `${f.name} is over 15 MB.` }, { status: 400 });
  }
  if (event !== DEMO && !(await ensureItems(event)).length) return NextResponse.json({ ok: false, error: "This event has no line items to compare against yet. Approve its request first." }, { status: 409 });
  const x = loadInbox(event);
  if (x.messages.some((m) => m.supplier_id === sid && m.read_status === "reading")) return NextResponse.json({ ok: false, error: "Still reading this supplier's last email. Try again in a moment." }, { status: 409 });
  const sup = readCsv("suppliers").rows.find((s) => s.supplier_id === sid)!;
  const contact = readCsv("people").rows.find((p) => p.organisation === sup.name);

  // Save the email as it arrived: headers + body as the message file, attachments next to it.
  const at = nowIso();
  const stampId = at.slice(0, 19).replace(/\D/g, "");
  const msgId = `MSG-U${stampId}-${sid}`;
  const EV = evDir(event);
  mkdirSync(join(EV, sid), { recursive: true });
  const saved: string[] = [];
  for (const f of files) {
    const name = `${sid}/upload-${stampId}_${f.name.replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, "_").slice(-80)}`;
    writeFileSync(join(EV, name), Buffer.from(await f.arrayBuffer()));
    saved.push(name);
  }
  const evName = readCsv("sourcing_events").rows.find((e) => e.event_id === event)?.name ?? "";
  const subj = subject || `RE: ${event} ${evName}${files.length ? " - Quotation" : ""}`;
  const d = new Date(at);
  const dateLine = d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
  const email = `From: ${contact?.name ?? sup.contact_person} <${sup.email}>\nTo: Rishabh <${replyAddress(event)}>\nDate: ${dateLine}\nSubject: ${subj}\n\n${body || "(no message text)"}${saved.length ? `\n\nAttachments: ${saved.map((f) => f.split("/").pop()!.replace(/^upload-\d+_/, "")).join(", ")}` : ""}`;
  const textFile = `${sid}/upload-${stampId}_email.txt`;
  writeFileSync(join(EV, textFile), email + "\n");

  const keptCerts: string[] = [];
  if (replaces) for (const m of x.messages) if (m.supplier_id === sid && ["Quote", "Updated quote", "Price on a call"].includes(m.kind)) {
    Object.assign(m, { was: m.kind, superseded_by: msgId });
    m.kind = "Superseded quote";
    keptCerts.push(...m.attachments.filter(isCert));
  }
  x.messages.push({
    id: msgId, supplier_id: sid, channel: "Email", received_at: at, kind: replaces ? "Updated quote" : "Quote", subject: subj,
    text_file: textFile, attachments: [...saved, ...new Set(keptCerts)], text: email, read_status: "reading",
  });
  saveInbox(event, x);
  logChange({ who: sup.name, area: "Quotes", what: `Email arrived at ${replyAddress(event)}: "${subj}"${saved.length ? ` with ${saved.length} attachment${saved.length === 1 ? "" : "s"}` : ""} (email simulated)` });

  enqueue(() => readInBackground(event, msgId, sid, sup.name, [textFile, ...saved], replaces));
  return NextResponse.json({ ok: true, id: msgId, supplier: sup.name });
}
