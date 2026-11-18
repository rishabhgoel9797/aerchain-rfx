import { NextResponse } from "next/server";
import { readCsv, writeCsv, clean, logChange, stamp, touch, reseed } from "@/lib/csv-file";

/**
 * POST /api/check-decision { key, decision, label, what } — saves a Check-tab decision (accept, correct, ask, leave out)
 * in check_decisions.csv and logs it. Red items with a decision stop blocking the award.
 */
export const runtime = "nodejs";
const DECISIONS = ["Accepted", "Corrected", "Asked supplier", "Left out"];

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const key = clean(b.key, 20);
  // The demo event's keys look like "C05-B"; any other event's like "L1-A", saved with its event id.
  const event = /^RFQ-\d{4}-\d{3}$/.test(String(b.event ?? "")) && b.event !== "RFQ-2026-014" ? String(b.event) : "";
  const decision = clean(b.decision, 20);
  const what = clean(b.what, 300);
  if (!(event ? /^L\d+-[A-Z0-9]+$/ : /^C\d{2}-[A-Z]$/).test(key) || !DECISIONS.includes(decision) || !what) return NextResponse.json({ ok: false, error: "Nothing to save." }, { status: 400 });
  const t = readCsv("check_decisions");
  if (!t.head.includes("event_id")) t.head.push("event_id");
  t.rows = [...t.rows.filter((r) => !(r.key === key && (r.event_id ?? "") === event)), { key, decision, detail: what, when: stamp(), event_id: event }];
  writeCsv("check_decisions", t);
  logChange({ who: "Rishabh", area: "Check", tone: decision === "Accepted" ? "ok" : "warn", what });
  touch("sourcing_events", "event_id", event || "RFQ-2026-014"); // the event whose quotes are being checked
  reseed();
  return NextResponse.json({ ok: true });
}
