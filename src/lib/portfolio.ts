/**
 * Company-wide data: internal requests (team → buyer) and sourcing events (buyer → suppliers).
 * Only the corrugated boxes event (RFQ-2026-014) has full demo data behind it.
 */
import { estValue } from "@/lib/fixtures";
import seed from "@/data/seed.json";
import { splitAward } from "@/lib/analysis";

export const DEMO_EVENT = "RFQ-2026-014";

// ---------- Sourcing events (buyer → suppliers) ----------

export type EventTab = "request" | "suppliers" | "quotes" | "compare" | "check" | "ask" | "award";

export type EventRow = {
  id: string;
  name: string;
  category: string;
  plant: string;
  owner: string;
  stage: EventTab;
  value: number; // ₹ per year
  suppliers: string;
  due: string;
  fromRequest?: string;
  updatedAt: string; // ISO, last change
  attention?: { tone: "warn" | "bad"; text: string };
};

type Row = Record<string, string | number>;
const M = seed.master as unknown as Record<string, Row[]>;
const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));
const person = (name: string) => M.people.find((p) => p.name === name);
const kindOf = (name: string): "company" | "buyer" | "supplier" => {
  const side = str(person(name)?.side);
  return side === "Buyer team" ? "buyer" : side === "Supplier" ? "supplier" : "company";
};

/** From data/seed/sourcing_events.csv. The boxes event's value is calculated from its items. */
export const EVENTS: EventRow[] = M.sourcing_events.map((r) => ({
  id: str(r.event_id),
  name: str(r.name),
  category: str(r.category),
  plant: str(r.plant),
  owner: str(r.buyer),
  stage: str(r.stage) as EventTab,
  value: r.yearly_value_inr === "" ? estValue : Number(r.yearly_value_inr),
  suppliers: str(r.suppliers_status),
  due: str(r.due),
  fromRequest: str(r.from_request) || undefined,
  updatedAt: str(r.updated_at),
  attention: r.attention_tone ? { tone: str(r.attention_tone) as "warn" | "bad", text: str(r.attention_text) } : undefined,
}));

export const eventById = (id: string) => EVENTS.find((e) => e.id === id);

// ---------- Internal requests (company team → buyer) ----------

export type ReqStatus = "new" | "needs_info" | "converted" | "covered" | "closed";

export type Check = { tone: "ok" | "warn" | "bad" | "info"; title: string; body: string };

export type InternalRequest = {
  id: string;
  title: string;
  from: string;
  role: string;
  plant: string;
  via: "WhatsApp" | "Email" | "Form" | "Chat";
  when: string;
  status: ReqStatus;
  message: string;
  translation?: string;
  understood: { label: string; value: string; info: string; missing?: boolean }[];
  checks: Check[];
  event?: string;
  estValue?: number;
  updatedAt: string;
};

/** From data/seed/team_requests.csv (+ team_request_fields.csv, team_request_checks.csv, people.csv). */
export const REQUESTS: InternalRequest[] = M.team_requests.map((r) => {
  const id = str(r.request_id);
  const p = person(str(r.from_person));
  return {
    id,
    title: str(r.title),
    from: str(r.from_person),
    role: str(p?.role),
    plant: str(r.plant) || str(p?.location).replace(" plant", "").replace(" (Head office)", ""),
    via: str(r.via) as InternalRequest["via"],
    when: str(r.received),
    status: str(r.status) as ReqStatus,
    message: str(r.message),
    translation: str(r.translation) || undefined,
    understood: M.team_request_fields.filter((f) => f.request_id === id).map((f) => ({ label: str(f.label), value: str(f.value), info: str(f.info), missing: f.missing === "yes" })),
    checks: M.team_request_checks.filter((c) => c.request_id === id).map((c) => ({ tone: str(c.tone) as Check["tone"], title: str(c.title), body: str(c.body) })),
    event: str(r.event_id) || undefined,
    estValue: r.est_value_inr === "" ? undefined : Number(r.est_value_inr),
    updatedAt: str(r.updated_at),
  };
});

export const requestById = (id: string) => REQUESTS.find((r) => r.id === id);

export const REQ_STATUS: Record<ReqStatus, { label: string; tone: "brand" | "warn" | "ok" | "none" }> = {
  new: { label: "New", tone: "brand" },
  needs_info: { label: "Waiting for details", tone: "warn" },
  converted: { label: "Sourcing started", tone: "ok" },
  covered: { label: "Covered by contract", tone: "none" },
  closed: { label: "Closed", tone: "none" },
};

// ---------- Insights ----------

export type Insight = { tone: "ok" | "warn" | "bad" | "info"; title: string; body: string; action: string; href: string; info: string };

/** From data/seed/insights.csv */
export const INSIGHTS: Insight[] = M.insights.map((r) => ({ tone: str(r.tone) as Insight["tone"], title: str(r.title), body: str(r.body), action: str(r.action), href: str(r.link), info: str(r.info) }));

export function spendByCategory() {
  const m: Record<string, number> = {};
  for (const e of EVENTS) m[e.category] = (m[e.category] ?? 0) + e.value / 1e7;
  return Object.entries(m).map(([category, cr]) => ({ category, cr: Math.round(cr * 100) / 100 })).sort((a, b) => b.cr - a.cr);
}

/** From data/seed/savings_by_month.csv */
export const SAVINGS_BY_MONTH = M.savings_by_month.map((r) => ({ month: str(r.month), lakh: Number(r.saved_lakh) }));

/** From data/seed/approvals.csv */
export const APPROVALS = M.approvals.map((r) => {
  const state = str(r.state);
  return {
    id: str(r.approval_id),
    what: str(r.decision),
    event: str(r.event_id),
    value: r.yearly_value_inr === "" ? splitAward().total : Number(r.yearly_value_inr),
    by: str(r.raised_by),
    waitingOn: str(r.waiting_on),
    waitingKind: kindOf(str(r.waiting_on)),
    waitingDetail: str(r.waiting_detail),
    since: str(r.since),
    tone: (state === "pending" ? "warn" : state === "approved" ? "ok" : state === "rejected" ? "bad" : "none") as "warn" | "ok" | "bad" | "none",
    state,
    note: str(r.note),
    updatedAt: str(r.updated_at),
  };
});

/** From data/seed/change_history.csv */
export const HISTORY = M.change_history.map((r) => ({ when: str(r.when), sortKey: Number(r.order), who: str(r.who), area: str(r.area), tone: str(r.tone) as "ok" | "warn" | "bad" | "none", what: str(r.what) }));
