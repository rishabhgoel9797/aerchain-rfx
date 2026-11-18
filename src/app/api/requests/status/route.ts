import { NextResponse } from "next/server";
import { readCsv, writeCsv, clean, logChange, reseed, nowIso } from "@/lib/csv-file";

/**
 * POST /api/requests/status { id, action: "close" | "ask", reason?, questions? }
 * close: the buyer closes a request (a reason is required). ask: questions go to the requester —
 * the WhatsApp / email itself is simulated; the status change and the questions are saved and logged.
 */
export const runtime = "nodejs";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const id = clean(b.id, 20);
  const action = clean(b.action, 10);
  const t = readCsv("team_requests");
  const r = t.rows.find((x) => x.request_id === id);
  if (!r) return NextResponse.json({ ok: false, error: "Request not found." }, { status: 404 });
  if (r.status === "converted" || r.status === "covered" || r.status === "closed") return NextResponse.json({ ok: false, error: "This request is already settled." }, { status: 409 });
  if (action === "close") {
    const reason = clean(b.reason, 240);
    if (reason.length < 3) return NextResponse.json({ ok: false, error: "Add a short reason. The requester will see it." }, { status: 400 });
    r.status = "closed";
    logChange({ who: "Rishabh", area: "Requests", what: `Closed request ${id} (${r.from_person}): ${reason}` });
  } else if (action === "ask") {
    const qs = Array.isArray(b.questions) ? b.questions.map((q: unknown) => clean(q, 160)).filter(Boolean).slice(0, 6) : [];
    r.status = "needs_info";
    logChange({ who: "Rishabh", area: "Requests", what: `Asked ${r.from_person} ${qs.length || "some"} question${qs.length === 1 ? "" : "s"} about ${id} on ${r.via === "Email" ? "email" : "WhatsApp"} (sending simulated)${qs.length ? `: ${qs.join(" / ")}` : ""}` });
  } else {
    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  }
  r.updated_at = nowIso();
  writeCsv("team_requests", t);
  reseed();
  return NextResponse.json({ ok: true, status: r.status });
}
