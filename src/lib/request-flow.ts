/**
 * Server-side steps for team requests: save Claude's read, check overlap with the live boxes event,
 * estimate yearly value, and turn a request into a sourcing event. Used by the Convert button
 * and by the request chat. All counting and money maths here is code, not AI.
 */
import { readCsv, writeCsv, logChange, reseed, nowIso } from "@/lib/csv-file";
import { itemListFile, readItemList, type ItemLine } from "@/lib/request-files";
import type { ReadField } from "@/lib/read-request";

const LIVE_BOXES_EVENT = "RFQ-2026-014"; // Haridwar's corrugated boxes event: our 30 item codes

export const CATEGORY: [RegExp, string][] = [
  [/box|carton|bottle|cap|label|tape|pouch|packag/i, "Packaging"],
  [/herb|root|amla|ashwagandha|tulsi|ghee|oil|honey/i, "Raw herbs"],
  [/laptop|monitor|printer|computer|\bit\b/i, "IT hardware"],
  [/freight|transport|lane|logistic/i, "Logistics"],
  [/chair|desk|furniture|office/i, "Office supplies"],
];

/** Replace a request's details with Claude's read. */
export function saveFields(id: string, fields: ReadField[]) {
  const f = readCsv("team_request_fields");
  f.rows = [...f.rows.filter((x) => x.request_id !== id), ...fields.map((x) => ({ request_id: id, label: x.label, value: x.value, info: x.source, missing: x.missing ? "yes" : "" }))];
  writeCsv("team_request_fields", f);
}

/** Item lines from the request's attached list (empty if none). */
export async function itemLines(id: string): Promise<ItemLine[]> {
  const file = itemListFile(id);
  return file ? readItemList(file).catch(() => []) : [];
}

/** Overlap with Haridwar's live boxes event, counted by code. Replaces any earlier overlap check for this request. */
export function saveOverlapCheck(id: string, plant: string, lines: ItemLine[]) {
  const c = readCsv("team_request_checks");
  c.rows = c.rows.filter((x) => !(x.request_id === id && /buying the same/i.test(x.title)));
  const codes = lines.filter((l) => l.code).map((l) => l.code!);
  if (codes.length && plant !== "Haridwar") {
    c.rows.push({ request_id: id, tone: "info", title: "Haridwar is buying the same boxes", body: `${codes.length} of the ${lines.length} sizes (${codes.join(", ")}) are already in the Haridwar boxes event ${LIVE_BOXES_EVENT}. Combining both plants could get a better price on the larger volume.` });
  } else if (codes.length) {
    c.rows.push({ request_id: id, tone: "info", title: "Already buying some of these sizes", body: `${codes.length} of the ${lines.length} sizes (${codes.join(", ")}) are already being sourced in the Haridwar boxes event ${LIVE_BOXES_EVENT}. Consider adding this volume there instead of running a separate request for those sizes.` });
  }
  writeCsv("team_request_checks", c);
}

/** Yearly value estimate: quantity × last year's contract price. Only complete when every size has a past price (`complete`). */
export function estimateValue(lines: ItemLine[]) {
  const last = readCsv("last_year_prices").rows;
  let total = 0, priced = 0;
  for (const l of lines) {
    const p = l.code ? last.find((r) => r.item_code === l.code) : undefined;
    if (p) { total += l.qty * Number(p.price_per_box_inr); priced++; }
  }
  return { total: Math.round(total), priced, of: lines.length, complete: lines.length > 0 && priced === lines.length };
}

/** Next free id like REQ-0152 / RFQ-2026-018. */
export function nextRequestId() {
  const n = readCsv("team_requests").rows.map((r) => Number(r.request_id.replace(/\D/g, ""))).filter(Boolean);
  return `REQ-${String((n.length ? Math.max(...n) : 0) + 1).padStart(4, "0")}`;
}
function nextEventId() {
  const year = new Date().getFullYear();
  const nums = readCsv("sourcing_events").rows.map((e) => e.event_id.match(/^RFQ-(\d{4})-(\d{3})$/)).filter((m) => m && Number(m[1]) === year).map((m) => Number(m![2]));
  return `RFQ-${year}-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0")}`;
}

/** Turns a request (already saved in team_requests.csv) into a sourcing event at the "request" stage. */
export function createEventFromRequest(id: string, plant: string, categoryHint?: string) {
  const reqs = readCsv("team_requests");
  const r = reqs.rows.find((x) => x.request_id === id);
  if (!r) throw new Error("Request not found.");
  const eventId = nextEventId();
  const category = categoryHint && categoryHint !== "General" ? categoryHint : CATEGORY.find(([re]) => re.test(r.title + " " + r.message))?.[1] ?? "General";
  const missing = readCsv("team_request_fields").rows.filter((f) => f.request_id === id && f.missing === "yes").length;
  const events = readCsv("sourcing_events");
  events.rows.unshift({
    event_id: eventId, name: r.title, category, plant: plant || "Haridwar", buyer: "Rishabh", stage: "request",
    yearly_value_inr: r.est_value_inr || "0", suppliers_status: "Not sent yet", due: "Draft started today",
    from_request: id, attention_tone: missing ? "warn" : "", attention_text: missing ? `${missing} details still missing from the request` : "",
    updated_at: nowIso(),
  });
  writeCsv("sourcing_events", events);
  r.status = "converted";
  r.event_id = eventId;
  r.updated_at = nowIso();
  writeCsv("team_requests", reqs);
  return eventId;
}

export const logAiRead = (id: string, ai: { model: string; files: string[]; fields: ReadField[]; ms: number }) =>
  logChange({ who: "AI", area: "Requests", what: `Read request ${id} with QuoteLens AI (${ai.model}${ai.files.length ? `, message + ${ai.files.join(", ")}` : ", message"}): ${ai.fields.length} details, ${ai.fields.filter((f) => f.missing).length} missing, in ${(ai.ms / 1000).toFixed(1)} s` });

export { reseed };
