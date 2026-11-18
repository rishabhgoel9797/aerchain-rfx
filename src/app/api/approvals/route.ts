import { NextResponse } from "next/server";
import { readCsv, writeCsv, clean, logChange, reseed, nowIso, stamp } from "@/lib/csv-file";
import { openCheckCounts } from "@/lib/check-state";
import { eventResults, openFlags, recommend } from "@/lib/event-results";

/**
 * POST /api/approvals { id, action: "approve" | "reject" | "submit", comment?, value?, waitingOn?, detail? }
 * approve / reject: an approver's decision (reject needs a comment). submit: the buyer sends an award for approval —
 * refused while red items are still open in Check. Saved in approvals.csv and logged.
 */
export const runtime = "nodejs";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const id = clean(b.id, 20);
  const action = clean(b.action, 10);
  const comment = clean(b.comment, 240);
  const t = readCsv("approvals");
  // Any event other than the demo: create its approval from the recommended award (worked out by code).
  if (action === "create") {
    const event = clean(b.event, 20);
    const ev = readCsv("sourcing_events").rows.find((e) => e.event_id === event);
    if (!ev) return NextResponse.json({ ok: false, error: "Sourcing event not found." }, { status: 404 });
    const r = eventResults(event);
    const bad = openFlags(r).filter((f) => f.tone === "bad").length;
    if (bad) return NextResponse.json({ ok: false, error: `Fix the ${bad} red item${bad === 1 ? "" : "s"} in the Check tab first.` }, { status: 409 });
    const rec = recommend(r);
    if (!rec.total) return NextResponse.json({ ok: false, error: "No usable prices yet, so there's nothing to award." }, { status: 409 });
    const people = readCsv("people").rows;
    const hop = people.find((p) => p.role === "Head of Procurement")?.name ?? "Head of Procurement";
    const cfo = people.find((p) => p.role === "CFO")?.name ?? "CFO";
    const needsCfo = rec.total > 1e7;
    const winners = [...new Set(rec.lines.filter((l) => l.best).map((l) => l.best!.name))];
    const existing = t.rows.find((x) => x.event_id === event && x.state !== "rejected");
    const n = Math.max(0, ...t.rows.map((x) => Number(x.approval_id.replace(/\D/g, "")) || 0)) + 1;
    const row = existing ?? ({ approval_id: `APR-${n}` } as Record<string, string>);
    Object.assign(row, {
      decision: `Award: ${ev.name}`, event_id: event, yearly_value_inr: String(rec.total), raised_by: "Rishabh",
      waiting_on: hop, waiting_detail: needsCfo ? `Head of Procurement, then ${cfo} (CFO, above ₹1 Cr)` : "Head of Procurement",
      since: `Sent ${stamp().split(" ").slice(0, 2).join(" ")}`, state: "pending",
      note: `${winners.length > 1 ? `Split across ${winners.length} suppliers` : `All to ${winners[0]}`}${rec.uncovered.length ? `; ${rec.uncovered.length} line(s) without a usable price` : ""}.`,
      updated_at: nowIso(),
    });
    if (!existing) t.rows.unshift(row);
    writeCsv("approvals", t);
    logChange({ who: "Rishabh", area: "Award", what: `Sent the award for ${event} (${ev.name}) for approval to ${hop}: ₹${rec.total.toLocaleString("en-IN")} a year` });
    reseed();
    return NextResponse.json({ ok: true, id: row.approval_id });
  }
  const a = t.rows.find((r) => r.approval_id === id);
  if (!a) return NextResponse.json({ ok: false, error: "Approval not found." }, { status: 404 });
  const day = stamp().split(" ").slice(0, 2).join(" ");

  if (action === "submit") {
    if (a.event_id === "RFQ-2026-014") {
      const { bad } = openCheckCounts();
      if (bad) return NextResponse.json({ ok: false, error: `Fix the ${bad} red items in the Check tab first.` }, { status: 409 });
    }
    a.state = "pending";
    a.waiting_on = clean(b.waitingOn, 60) || a.waiting_on;
    a.waiting_detail = clean(b.detail, 80) || "Head of Procurement";
    if (b.value) a.yearly_value_inr = String(Math.round(Number(b.value)));
    a.since = `Sent ${day}`;
    a.note = clean(b.note, 240) || a.note;
    logChange({ who: "Rishabh", area: "Award", what: `Sent ${a.decision} (${a.event_id}) for approval to ${a.waiting_on}` });
  } else if (action === "approve" || action === "reject") {
    if (a.state !== "pending") return NextResponse.json({ ok: false, error: "This approval isn't waiting for a decision." }, { status: 409 });
    if (action === "reject" && comment.length < 3) return NextResponse.json({ ok: false, error: "Add a short reason so the buyer knows what to change." }, { status: 400 });
    a.state = action === "approve" ? "approved" : "rejected";
    a.since = `${action === "approve" ? "Approved" : "Sent back"} ${day}`;
    if (comment) a.note = `${action === "approve" ? "Approved" : "Sent back"}: ${comment}`;
    logChange({ who: a.waiting_on || "Approver", area: "Approvals", tone: action === "approve" ? "ok" : "warn", what: `${action === "approve" ? "Approved" : "Sent back"} ${a.decision} (${a.event_id})${comment ? `: ${comment}` : ""}` });
  } else {
    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  }
  a.updated_at = nowIso();
  writeCsv("approvals", t);
  reseed();
  return NextResponse.json({ ok: true, state: a.state });
}
