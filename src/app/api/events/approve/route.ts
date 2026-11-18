import { NextResponse } from "next/server";
import { readCsv, writeCsv, clean, reseed, logChange, stamp, nowIso } from "@/lib/csv-file";
import { ensureItems } from "@/lib/event-items";

/** POST /api/events/approve { id } — buyer approves the draft request; the event moves to choosing suppliers. */
export const runtime = "nodejs";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const id = clean(b.id, 20);
  const events = readCsv("sourcing_events");
  const ev = events.rows.find((e) => e.event_id === id);
  if (!ev) return NextResponse.json({ ok: false, error: "Sourcing event not found." }, { status: 404 });
  if (ev.stage !== "request") return NextResponse.json({ ok: true, already: true });
  ev.stage = "suppliers";
  ev.due = `Request approved ${stamp()}`;
  ev.updated_at = nowIso();
  writeCsv("sourcing_events", events);
  logChange({ who: "Rishabh", area: "Sourcing", what: `Approved the request for quotes for ${id} (${ev.name})` });
  // Freeze the line items suppliers will quote for; replies are read and compared against these.
  const items = await ensureItems(id).catch(() => []);
  if (items.length) logChange({ who: "AI", area: "Sourcing", what: `Fixed ${items.length} line item${items.length === 1 ? "" : "s"} for ${id}: ${items.map((i) => `${i.item_code} ${i.description}${i.our_code ? ` (= ${i.our_code})` : ""}`).join("; ").slice(0, 240)}` });
  reseed();
  return NextResponse.json({ ok: true });
}
