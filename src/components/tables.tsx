"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Mail, MessageCircle, Phone, MessageSquare, Ban, AlertTriangle, Check, ArrowDownLeft, ArrowUpRight, FileText } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { Pill, Person, Dot } from "@/components/ui";
import { AddSupplierButton } from "@/components/add-supplier";
import { ApprovalActions } from "@/components/approval-actions";
import { FileViewerButton } from "@/components/source-panel";
import { ALL_SUPPLIERS, SUPPLIERS, ITEMS, type Supplier, type Item } from "@/lib/fixtures";
import { EVENTS, REQUESTS, REQ_STATUS, APPROVALS, HISTORY, type EventRow, type InternalRequest } from "@/lib/portfolio";
import { EVENT_TABS, tabIndex } from "@/lib/event-tabs";
import { fmtUpdated } from "@/lib/dates";
import inboxData from "../../data/files/RFQ-2026-014/inbox.json";
import outboxData from "../../data/files/RFQ-2026-014/outbox.json";

const crore = (x: number) => "₹" + (x / 1e7).toFixed(2) + " Cr";
/** "Last updated" column used by every list. Sorts by the saved ISO date; newest first by default. */
function updatedCol<T>(get: (r: T) => string | undefined, info = "When this was last changed (India time). Lists open newest first."): Column<T> {
  return { key: "updated", label: "Last updated", info, sort: (r) => get(r) ?? "", render: (r) => { const t = fmtUpdated(get(r)); return t ? <span className="num whitespace-nowrap text-[12px] text-muted">{t}</span> : <span className="text-[12px] text-muted">—</span>; } };
}

/** "18 Nov 20:14" (as saved in change_history.csv) → "18 Nov, 8:14 pm", to match the other tables. */
const when12 = (w: string) => w.replace(/^(\d{1,2} \w{3}) (\d{1,2}):(\d{2})$/, (_, d, h, m) => `${d}, ${((Number(h) + 11) % 12) + 1}:${m} ${Number(h) < 12 ? "am" : "pm"}`);

const CH_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = { Email: Mail, WhatsApp: MessageCircle, Phone: Phone, Call: Phone, SMS: MessageSquare, Form: FileText, Chat: MessageSquare };

export function Channels({ list, preferred }: { list: string[]; preferred?: string }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {list.map((c) => {
        const I = CH_ICON[c] ?? Mail;
        const pref = c === preferred;
        return (
          <span key={c} title={pref ? `${c} (preferred)` : c} className={clsx("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]", pref ? "bg-tint font-semibold text-purple" : "bg-bg text-muted")}>
            <I size={11} /> {c}
          </span>
        );
      })}
    </span>
  );
}

// ------------------------------------------------------------------ Suppliers
export function SupplierTable({ mode, query = "" }: { mode: "directory" | "invite"; query?: string }) {
  const rows = mode === "directory" ? ALL_SUPPLIERS() : SUPPLIERS;
  const [picked, setPicked] = useState<Set<string>>(new Set(rows.filter((s) => s.invited).map((s) => s.id)));
  const prefOf = (s: Supplier) => (s.channel === "Call" ? "Phone" : s.channel);
  const cols: Column<Supplier>[] = [
    ...(mode === "invite"
      ? [{
          key: "pick", label: "", info: "Ticked suppliers receive the request. Blocked suppliers can't be ticked.",
          render: (s: Supplier) => s.blocked ? <Ban size={16} className="text-bad" /> : (
            <button onClick={(e) => { e.stopPropagation(); setPicked((p) => { const n = new Set(p); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; }); }}
              className={clsx("grid h-4 w-4 place-items-center rounded border", picked.has(s.id) ? "border-purple bg-purple text-white" : "border-line bg-white")} aria-label={`Invite ${s.name}`}>
              {picked.has(s.id) && <Check size={11} strokeWidth={3} />}
            </button>
          ),
        } as Column<Supplier>]
      : []),
    { key: "name", label: "Supplier", info: "Company name, with tags like Approved, New, or notes such as last year's cheapest.", sort: (s) => s.name,
      render: (s) => <div><div className="font-semibold text-navy">{s.name}</div><div className="mt-0.5 flex gap-1">{s.tags.map((t) => <Pill key={t} tone={t === "New" ? "info" : t.includes("cheapest") ? "warn" : "brand"}>{t}</Pill>)}{s.blocked && <Pill tone="bad">Blocked</Pill>}</div></div> },
    ...(mode === "directory" ? [{ key: "cat", label: "Category", info: "What they supply.", sort: (s: Supplier) => s.category, filter: (s: Supplier) => s.category, render: (s: Supplier) => s.category } as Column<Supplier>] : []),
    { key: "city", label: "Location", info: "Where the supplier's factory is. Closer usually means cheaper, faster delivery.", sort: (s) => s.city, filter: (s) => s.city.split(", ").at(-1) ?? s.city, render: (s) => s.city },
    { key: "contact", label: "Contact & channels", info: "Who we deal with and every channel they accept. The highlighted one is preferred: requests and reminders go there first.", filter: (s) => s.channels, sort: (s) => s.contact,
      render: (s) => <div className="space-y-1"><Person name={s.contact} kind="supplier" /><div className="text-[11px] text-muted">{[s.email, s.whatsapp || s.phone].filter(Boolean).join(" · ")}</div><Channels list={s.channels} preferred={prefOf(s)} /></div> },
    { key: "ontime", label: "On-time", info: "Share of last year's deliveries that arrived on time. New suppliers show 'No history', never zero.", align: "right", sort: (s) => s.onTime,
      render: (s) => s.onTime != null ? <span className={s.onTime < 80 ? "font-semibold text-warn" : ""}>{s.onTime}%</span> : <span className="text-[12px] text-muted">No history</span> },
    { key: "share", label: "Share of spend", info: "How much of last year's spend in this category went to them. High share means we depend on them.", align: "right", sort: (s) => s.share,
      render: (s) => s.share != null ? `${s.share}%` : <span className="text-[12px] text-muted">—</span> },
    { key: "status", label: "Status", info: "Approved: can be invited. New: no history yet, papers and samples needed before award. Blocked: can't be invited.", sort: (s) => s.status, filter: (s) => s.status,
      render: (s) => <Pill tone={s.status === "Approved" ? "ok" : s.status === "New" ? "info" : "bad"}>{s.status}</Pill> },
    { key: "notes", label: "Notes", info: "Warnings to read before inviting.",
      render: (s) => s.blocked ? <span className="text-[12px] font-semibold text-bad">{s.blocked}</span> : s.warning ? <span className="flex items-start gap-1 text-[12px] font-semibold text-warn"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{s.warning}</span> : null },
    updatedCol<Supplier>((x) => x.updatedAt, "When this supplier was added or last changed."),
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <DataTable rows={rows} columns={cols} rowKey={(s) => s.id} initialQuery={query} searchText={(s) => [s.name, s.city, s.contact, s.email, s.gstin, s.category, s.status].join(" ")}
        searchPlaceholder="Search name, city, contact, GSTIN…" initialSort={{ key: "updated", dir: "desc" }}
        toolbarRight={mode === "invite" ? <div className="flex items-center gap-3"><span className="text-[12px] font-semibold text-ink">{picked.size} selected</span><AddSupplierButton variant="secondary" /></div> : undefined} />
    </div>
  );
}

// ------------------------------------------------------------------ Requests
export function RequestsTable() {
  const cols: Column<InternalRequest>[] = [
    { key: "title", label: "Request", info: "What the team needs, and its request number.", sort: (r) => r.title, render: (r) => <div><div className="font-semibold text-indigo">{r.title}</div><div className="text-[12px] text-muted">{r.id}</div></div> },
    { key: "from", label: "From", info: "The person who raised it.", sort: (r) => r.from, filter: (r) => r.from, render: (r) => <div><Person name={r.from} kind="company" /><div className="text-[12px] text-muted">{r.role}</div></div> },
    { key: "plant", label: "Plant", info: "Where the request came from.", sort: (r) => r.plant, filter: (r) => r.plant, render: (r) => r.plant },
    { key: "via", label: "Received", info: "How and when it arrived. Sorting uses the request number (newer = higher).", sort: (r) => r.id, filter: (r) => r.via, render: (r) => { const I = CH_ICON[r.via]; return <span className="flex items-center gap-1.5"><I size={14} className="text-muted" />{r.via} · {r.when}</span>; } },
    { key: "checks", label: "AI checks", info: "What the AI noticed: missing details, overlap with another event, an existing contract, or urgency.", render: (r) => <span className="block max-w-[260px] truncate" title={r.checks[0]?.body ?? ""}>{r.checks[0]?.title ?? (r.understood.some((u) => u.missing) ? `${r.understood.filter((u) => u.missing).length} details missing` : "No issues found")}</span> },
    { key: "status", label: "Status", info: "New · Waiting for details · Sourcing started · Covered by contract.", sort: (r) => r.status, filter: (r) => REQ_STATUS[r.status].label, render: (r) => <Pill tone={REQ_STATUS[r.status].tone}>{REQ_STATUS[r.status].label}</Pill> },
    updatedCol<InternalRequest>((x) => x.updatedAt, "When this request last changed: received, read by the AI, or converted."),
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <DataTable rows={REQUESTS} columns={cols} rowKey={(r) => r.id} rowHref={(r) => `/requests/${r.id}`} searchText={(r) => [r.title, r.id, r.from, r.plant, r.message].join(" ")} searchPlaceholder="Search requests, people, message text…" initialSort={{ key: "updated", dir: "desc" }} />
    </div>
  );
}

// ------------------------------------------------------------------ Sourcing events
export function EventsTable({ compact }: { compact?: boolean }) {
  const cols: Column<EventRow>[] = [
    { key: "name", label: "Sourcing event", info: "The request for quotes sent to suppliers.", sort: (e) => e.name, render: (e) => <div><div className="font-semibold text-indigo">{e.name}</div><div className="text-[12px] text-muted">{compact ? `${e.category} · ${e.plant} · ${e.owner}` : e.id}</div></div> },
    { key: "cat", label: "Category", info: "What is being bought.", sort: (e) => e.category, filter: (e) => e.category, render: (e) => e.category },
    { key: "plant", label: "Plant", info: "Where the goods will be delivered.", sort: (e) => e.plant, filter: (e) => e.plant, render: (e) => e.plant },
    { key: "owner", label: "Buyer", info: "The buyer running this event.", sort: (e) => e.owner, filter: (e) => e.owner, render: (e) => <Person name={e.owner} kind="buyer" /> },
    { key: "stage", label: "Stage", info: "7 stages: Request, Suppliers, Quotes, Compare, Check, Ask AI, Award.", sort: (e) => tabIndex(e.stage), filter: (e) => EVENT_TABS[tabIndex(e.stage)].label,
      render: (e) => { const idx = tabIndex(e.stage); return <div><div className="flex w-24 gap-0.5">{EVENT_TABS.map((t, i) => <span key={t.key} className={clsx("h-1.5 flex-1 rounded-full", i < idx ? "bg-purple" : i === idx ? "bg-orange" : "bg-line")} />)}</div><div className="mt-1 text-[12px] text-muted">{EVENT_TABS[idx].label}</div></div>; } },
    { key: "sup", label: "Suppliers", info: "How many invited suppliers have replied.", render: (e) => e.suppliers },
    { key: "value", label: "Yearly value", info: "Estimated yearly spend: quantity × last prices paid.", align: "right", sort: (e) => e.value, render: (e) => <span className="num font-semibold text-navy">{e.value ? crore(e.value) : "—"}</span> },
    { key: "att", label: "Needs attention", info: "Anything blocking progress. Otherwise, the next deadline.", sort: (e) => (e.attention?.tone === "bad" ? 0 : e.attention ? 1 : 2), filter: (e) => (e.attention ? "Needs attention" : "On track"),
      render: (e) => e.attention ? <Pill tone={e.attention.tone}>{e.attention.text}</Pill> : <span className="text-[12px] text-muted">{e.due}</span> },
    updatedCol<EventRow>((x) => x.updatedAt, "When this sourcing event last changed: drafted, approved, sent, or a value checked."),
  ];
  const shown = compact ? cols.filter((c) => !["cat", "plant", "owner", "sup"].includes(c.key)) : cols;
  return <DataTable rows={EVENTS} columns={shown} rowKey={(e) => e.id} rowHref={(e) => `/events/${e.id}`} compact={compact} searchText={(e) => [e.name, e.id, e.category, e.plant, e.owner].join(" ")} searchPlaceholder="Search events…" initialSort={{ key: "updated", dir: "desc" }} />;
}

// ------------------------------------------------------------------ Approvals
type Approval = (typeof APPROVALS)[number];
export function ApprovalsTable() {
  const cols: Column<Approval>[] = [
    { key: "what", label: "Decision", info: "The award waiting for sign-off, with the AI's summary.", sort: (a) => a.what, render: (a) => <div><Link href={`/events/${a.event}/award`} onClick={(e) => e.stopPropagation()} className="font-semibold text-indigo hover:text-purple">{a.what}</Link><div className="text-[12px] text-muted">{a.note}</div></div> },
    { key: "by", label: "Raised by", info: "The buyer who recommended it.", filter: (a) => a.by, render: (a) => <Person name={a.by} kind="buyer" /> },
    { key: "value", label: "Yearly value", info: "Above ₹25 L needs the Head of Procurement; above ₹1 Cr also the CFO.", align: "right", sort: (a) => a.value, render: (a) => <span className="num font-semibold text-navy">{crore(a.value)}</span> },
    { key: "wait", label: "Waiting on", info: "Who needs to approve next, and for how long.", filter: (a) => a.waitingDetail, render: (a) => <div className="space-y-1">{a.waitingOn && <Person name={a.waitingOn} kind={a.waitingKind} />}<div><Pill tone={a.tone}>{a.waitingDetail}</Pill></div><div className="text-[12px] text-muted">{a.since}</div></div> },
    { key: "act", label: "Action", info: "Approve or send back. The decision and reason are recorded.", render: (a) => a.state === "pending" ? <ApprovalActions id={a.id} name={a.what} /> : a.state === "approved" ? <Pill tone="ok">{a.since}</Pill> : a.state === "rejected" ? <span className="space-y-1"><Pill tone="bad">{a.since}</Pill><span className="block max-w-[220px] text-[11.5px] text-muted">{a.note}</span></span> : <Link href={`/events/${a.event}/award`} className="text-[13px] font-semibold text-purple">View</Link> },
    updatedCol<Approval>((x) => x.updatedAt, "When this approval last changed."),
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <DataTable rows={APPROVALS} columns={cols} rowKey={(a) => a.id} searchText={(a) => [a.what, a.by, a.waitingOn, a.note].join(" ")} searchPlaceholder="Search approvals…" initialSort={{ key: "updated", dir: "desc" }} />
    </div>
  );
}

// ------------------------------------------------------------------ Change history
const LOG = HISTORY;
export function HistoryTable() {
  const cols: Column<(typeof LOG)[number]>[] = [
    { key: "when", label: "When", info: "Date and time of the change.", sort: (r) => r.sortKey, render: (r) => <span className="num whitespace-nowrap text-muted">{when12(r.when)}</span> },
    { key: "who", label: "Who", info: "The person who made the change, or AI for automatic steps.", filter: (r) => r.who, render: (r) => r.who === "AI" ? <span className="inline-flex items-center gap-1.5">AI <span className="rounded bg-[#efeafd] px-1.5 py-px text-[10.5px] font-semibold text-[#5a35cf]">Automatic</span></span> : <Person name={r.who} kind="buyer" /> },
    { key: "area", label: "Where", info: "Which part of the sourcing event it happened in.", filter: (r) => r.area, sort: (r) => r.area, render: (r) => r.area },
    { key: "what", label: "What changed", info: "What changed, old and new values, and the reason.", render: (r) => <span className="flex items-center gap-2"><Dot tone={r.tone} />{r.what}</span> },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <DataTable rows={LOG} columns={cols} rowKey={(r) => String(r.sortKey)} searchText={(r) => [r.who, r.what, r.area].join(" ")} searchPlaceholder="Search changes…" initialSort={{ key: "when", dir: "desc" }} />
    </div>
  );
}

// ------------------------------------------------------------------ Supplier messages (received + sent)
type Msg = { id: string; dir: "Received" | "Sent"; supplier: string; channel: string; at: string; kind: string; text: string; attachments: string[]; textFile?: string; status?: string };
const supName = (id: string) => ALL_SUPPLIERS().find((s) => s.id === id)?.name ?? id;
const MESSAGES: Msg[] = [
  ...inboxData.messages.map((m) => ({ id: m.id, dir: "Received" as const, supplier: supName(m.supplier_id), channel: m.channel, at: m.received_at, kind: m.kind, text: (m as { text?: string }).text ?? "", attachments: m.attachments, textFile: m.text_file })),
  ...outboxData.messages.map((m) => ({ id: m.id, dir: "Sent" as const, supplier: supName(m.to_supplier), channel: m.channel, at: m.sent_at, kind: m.kind, text: m.text, attachments: [], status: m.status })),
];
const fmtAt = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export function MessagesTable() {
  const cols: Column<Msg>[] = [
    { key: "at", label: "When", info: "When it was sent or received (India time).", sort: (m) => m.at, render: (m) => <span className="num whitespace-nowrap text-muted">{fmtAt(m.at)}</span> },
    { key: "dir", label: "Direction", info: "Received from a supplier, or sent by us. Sending is simulated in this demo.", filter: (m) => m.dir, render: (m) => m.dir === "Received" ? <span className="inline-flex items-center gap-1 text-ok"><ArrowDownLeft size={14} /> Received</span> : <span className="inline-flex items-center gap-1 text-purple"><ArrowUpRight size={14} /> Sent</span> },
    { key: "sup", label: "Supplier", info: "Who it was from or to.", sort: (m) => m.supplier, filter: (m) => m.supplier, render: (m) => <Person name={m.supplier} kind="supplier" /> },
    { key: "ch", label: "Channel", info: "Email, WhatsApp or a phone call.", filter: (m) => m.channel, render: (m) => { const I = CH_ICON[m.channel] ?? Mail; return <span className="inline-flex items-center gap-1.5"><I size={14} className="text-muted" />{m.channel}</span>; } },
    { key: "kind", label: "Type", info: "Sorted automatically: quote, updated quote, question, out of office, reminder, answer shared with all…", filter: (m) => m.kind, sort: (m) => m.kind, render: (m) => <Pill tone={m.kind.includes("Quote") || m.kind === "Updated quote" ? "ok" : m.kind === "Question" ? "brand" : m.kind.includes("call") || m.kind.includes("confirmation") ? "warn" : "none"}>{m.kind}</Pill> },
    { key: "text", label: "Message", info: "The message text. Attachments are listed underneath.", render: (m) => <div className="max-w-[420px]"><div className="line-clamp-2 text-ink" title={m.text}>{m.text.replace(/^\[.*?\]\s*/gm, "").replace(/^(From|To|Date|Subject):.*$/gm, "").trim()}</div>{(m.textFile || m.attachments.length > 0) && <div className="mt-1 flex flex-wrap gap-1">{m.textFile && <FileViewerButton file={m.textFile} chip label="Full message" />}{m.attachments.map((a) => <FileViewerButton key={a} file={a} chip />)}</div>}{m.status && <div className="mt-1 text-[11px] text-muted">{m.status}</div>}</div> },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <DataTable rows={MESSAGES} columns={cols} rowKey={(m) => m.id} searchText={(m) => [m.supplier, m.text, m.kind, m.channel].join(" ")} searchPlaceholder="Search messages…" initialSort={{ key: "at", dir: "desc" }} maxHeight={560} compact />
    </div>
  );
}

// ------------------------------------------------------------------ Box list (in the request)
export function ItemsTable() {
  const cols: Column<Item>[] = [
    { key: "id", label: "Code", info: "Our own item code for this box size.", sort: (i) => i.id, render: (i) => <span className="font-mono text-[12px] text-muted">{i.id}</span> },
    { key: "desc", label: "Box", info: "Number of layers (ply) and inside size: length × width × height.", sort: (i) => i.l * i.w * i.h, filter: (i) => `${i.ply}-ply`, render: (i) => <span className="font-semibold text-navy">{i.desc}</span> },
    { key: "use", label: "Ships", info: "Which RSG Herbal House product this box is used for.", sort: (i) => i.use, render: (i) => <span className="text-muted">{i.use}</span> },
    { key: "kg", label: "Weight", info: "Weight of one box. Needed if a supplier quotes per kg.", align: "right", sort: (i) => i.kg, render: (i) => <span className="num">{i.kg} kg</span> },
    { key: "qty", label: "Boxes a year", info: "Expected yearly quantity (last year + 10%).", align: "right", sort: (i) => i.qty, render: (i) => <span className="num rounded bg-orange/15 px-1">{i.qty.toLocaleString("en-IN")}</span> },
  ];
  return <div className="overflow-hidden rounded-lg border border-line"><DataTable rows={ITEMS} columns={cols} rowKey={(i) => i.id} searchText={(i) => [i.id, i.desc, i.use].join(" ")} searchPlaceholder="Search boxes or products…" maxHeight={360} compact /></div>;
}
