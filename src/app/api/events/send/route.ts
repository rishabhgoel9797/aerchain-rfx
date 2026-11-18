import { NextResponse } from "next/server";
import { readCsv, writeCsv, clean, reseed, logChange, stamp, nowIso } from "@/lib/csv-file";
import { quoteDeadline, MIN_SUPPLIERS } from "@/lib/event-flow";
import { loadOverrides } from "@/lib/draft";

/**
 * POST /api/events/send { id, suppliers: string[] } — sends the request for quotes.
 * The actual email / WhatsApp is simulated (no messages leave this laptop); everything else is saved:
 * who was invited and how (event_invites.csv), the event moves to "quotes", and the change is logged.
 */
export const runtime = "nodejs";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const id = clean(b.id, 20);
  const ids: string[] = Array.isArray(b.suppliers) ? [...new Set(b.suppliers.map((x: unknown) => clean(x, 10)))] as string[] : [];
  const events = readCsv("sourcing_events");
  const ev = events.rows.find((e) => e.event_id === id);
  if (!ev) return NextResponse.json({ ok: false, error: "Sourcing event not found." }, { status: 404 });
  if (ev.stage === "request") return NextResponse.json({ ok: false, error: "Approve the request first." }, { status: 409 });

  const sups = readCsv("suppliers").rows;
  const chosen = ids.map((s) => sups.find((x) => x.supplier_id === s)).filter((s): s is Record<string, string> => !!s && s.status !== "Blocked");
  if (chosen.length < MIN_SUPPLIERS) return NextResponse.json({ ok: false, error: `Company rule: invite at least ${MIN_SUPPLIERS} suppliers.` }, { status: 400 });

  const inv = readCsv("event_invites");
  inv.rows = inv.rows.filter((r) => r.event_id !== id);
  const at = new Date().toISOString();
  for (const s of chosen) inv.rows.push({ event_id: id, supplier_id: s.supplier_id, channel: s.preferred_channel === "WhatsApp" ? "WhatsApp" : "Email", sent_at: at });
  writeCsv("event_invites", inv);

  // The deadline in the approved draft (the buyer may have changed it with the AI), else the default.
  const deadline = (loadOverrides(id).terms.deadline ?? quoteDeadline()).replace(/,?\s*6\s*pm$/i, "");
  ev.stage = "quotes";
  ev.suppliers_status = `0 of ${chosen.length} replied`;
  ev.due = `Quotes due ${deadline}`;
  ev.updated_at = nowIso();
  writeCsv("sourcing_events", events);

  const wa = chosen.filter((s) => s.preferred_channel === "WhatsApp").length;
  logChange({ who: "Rishabh", area: "Sourcing", what: `Sent ${id} to ${chosen.length} suppliers (${chosen.length - wa} by email, ${wa} on WhatsApp; simulated). Quotes due ${deadline}, 6 pm` });
  reseed();
  return NextResponse.json({ ok: true, sent: chosen.length, at: stamp() });
}
