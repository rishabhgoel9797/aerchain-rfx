import { NextResponse } from "next/server";
import { readCsv, writeCsv, clean, reseed, logChange } from "@/lib/csv-file";
import { readRequestWithClaude } from "@/lib/read-request";
import { saveFields, itemLines, saveOverlapCheck, estimateValue, createEventFromRequest, logAiRead } from "@/lib/request-flow";

/**
 * POST /api/requests/convert { id } — turns an internal request into a sourcing event.
 * 1. Claude reads the request message and its files and saves the details (team_request_fields.csv).
 * 2. Code matches the attached item list to our items, checks overlap with the live boxes event, and estimates value.
 * 3. Adds the sourcing event, marks the request converted, logs everything, rebuilds the app data.
 * If the AI read fails, conversion still goes ahead with the details already on file, and says so.
 */
export const runtime = "nodejs";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const id = clean(b.id, 20);
  const reqs = readCsv("team_requests");
  const r = reqs.rows.find((x) => x.request_id === id);
  if (!r) return NextResponse.json({ ok: false, error: "Request not found." }, { status: 404 });
  if (r.status === "converted") return NextResponse.json({ ok: true, eventId: r.event_id, already: true });
  if (r.status === "covered") return NextResponse.json({ ok: false, error: "This request is already covered by a contract." }, { status: 409 });

  const person = readCsv("people").rows.find((p) => p.name === r.from_person);
  // Where it's for: what the request says (saved when it came in), else the requester's own plant.
  const plant = r.plant || (person?.location ?? "").replace(" plant", "").replace(" (Head office)", "") || "Haridwar";

  let ai: Awaited<ReturnType<typeof readRequestWithClaude>> | undefined;
  let aiError = "";
  try {
    ai = await readRequestWithClaude({ id, title: r.title, from: r.from_person, role: person?.role ?? "", plant, via: r.via, message: r.message });
    saveFields(id, ai.fields);
  } catch (e) {
    aiError = (e as Error).message || "AI read failed";
  }

  const lines = await itemLines(id);
  if (lines.length) {
    saveOverlapCheck(id, plant, lines);
    const est = estimateValue(lines);
    if (est.complete && !r.est_value_inr) { r.est_value_inr = String(est.total); writeCsv("team_requests", reqs); }
  }

  const eventId = createEventFromRequest(id, plant);
  if (ai) logAiRead(id, ai);
  logChange({ who: "Rishabh", area: "Requests", what: `Converted request ${id} (${r.from_person}, ${plant}) into sourcing event ${eventId}` });
  reseed();
  return NextResponse.json({ ok: true, eventId, ai: ai ? { fields: ai.fields.length, ms: ai.ms } : undefined, aiError: aiError || undefined });
}
