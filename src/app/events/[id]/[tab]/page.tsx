import Link from "next/link";
import { notFound } from "next/navigation";
import { Inbox, Users, Send as SendIcon, MessagesSquare, BookOpen, Mail, Handshake, Trophy, Megaphone, ArrowRight } from "lucide-react";
import { DEMO_EVENT, eventById, requestById } from "@/lib/portfolio";
import { EVENT_TABS } from "@/lib/event-tabs";
import { eventSaved, liveEventRow, invitesFor } from "@/lib/csv-file";
import { ApproveDraft, SupplierPicker } from "@/components/event-actions";
import { quoteDeadline, supplierCategoryFor, MIN_SUPPLIERS } from "@/lib/event-flow";
import { ALL_SUPPLIERS, RESPONDERS } from "@/lib/fixtures";
import { Section, Pill } from "@/components/ui";
import { RequestDraft } from "@/components/request-draft";
import { DraftCopilot } from "@/components/draft-copilot";
import { loadOverrides } from "@/lib/draft";
import { checkDecisions } from "@/lib/check-state";
import { eventResults, recommend, openFlags, type EventResults } from "@/lib/event-results";
import { EventCompare, EventCheck, SendEventForApproval } from "@/components/event-results-view";
import { SupplierInbox, type InboxRow } from "@/components/supplier-inbox";
import { readInbox, replyAddress, subjectOf } from "@/lib/mailbox";
import { Draft, Suppliers, Send, Responses, Messages } from "@/components/stages/early";
import { Reading } from "@/components/stages/reading";
import { Comparison } from "@/components/stages/comparison";
import { Review } from "@/components/stages/review";
import { Analyst } from "@/components/stages/analyst";
import { Negotiation, Award, Close } from "@/components/stages/late";

export default async function EventTabPage({ params, searchParams }: { params: Promise<{ id: string; tab: string }>; searchParams: Promise<{ sup?: string }> }) {
  const { id, tab } = await params;
  const { sup = "" } = await searchParams;
  const ev = eventById(id);
  const def = EVENT_TABS.find((t) => t.key === tab);
  if (!def) notFound();
  if (!ev) {
    if (eventSaved(id)) return null; // the layout shows "Setting up…"
    notFound();
  }

  if (id !== DEMO_EVENT) {
    const src = ev.fromRequest ? requestById(ev.fromRequest) : undefined;
    const row = liveEventRow(id);
    const stage = row?.stage || ev.stage;
    const invites = invitesFor(id);
    const results = eventResults(id);
    const replied = new Set(results.suppliers.map((s) => s.id));
    const all = ALL_SUPPLIERS();
    const cat = supplierCategoryFor(ev);
    return (
      <div className="space-y-5">
        {tab === "request" && src && (
          <Section title="Where this came from" icon={<Inbox size={16} />} open={false} info="The team's original request that this sourcing event was created from.">
            <Link href={`/requests/${src.id}`} className="block rounded-lg bg-bg px-4 py-3 text-[13px] hover:bg-tint">
              <span className="font-semibold text-indigo">{src.id} · {src.title}</span>
              <span className="block text-muted">{src.from}{src.role ? `, ${src.role}` : ""} · {src.via} · {src.when}</span>
              <span className="mt-2 block text-ink">“{src.message}”</span>
            </Link>
          </Section>
        )}
        {tab === "request" && src && <RequestDraft ev={ev} req={src} />}
        {tab === "request" && src && (stage === "request" ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
            <span className="text-[13px] text-ink">Happy with the draft? Approving it saves it and moves on to choosing suppliers.</span>
            <ApproveDraft id={id} />
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ok-bg/60 px-4 py-3 text-[13px] text-ink">
            <span><b>Approved.</b> This is the request suppliers {invites.length ? "received" : "will receive"}.</span>
            <Link href={`/events/${id}/${invites.length ? "quotes" : "suppliers"}`} className="inline-flex items-center gap-1 font-semibold text-purple">{invites.length ? "See replies" : "Choose suppliers"} <ArrowRight size={13} /></Link>
          </div>
        ))}
        {tab === "request" && stage === "request" && src && <DraftCopilot id={id} chat={loadOverrides(id).chat} />}

        {tab === "suppliers" && stage === "request" && (
          <Gate text="Approve the request first. Then you can choose who receives it." href={`/events/${id}/request`} cta="Go to the request" />
        )}
        {tab === "suppliers" && stage !== "request" && !invites.length && (
          <Section title="Choose suppliers" icon={<Users size={16} />} info={`Approved ${cat.toLowerCase()} suppliers from your list are suggested. Blocked suppliers can't be invited; warnings are shown so you can decide.`}>
            <SupplierPicker
              id={id}
              min={MIN_SUPPLIERS}
              address={replyAddress(id)}
              deadline={(loadOverrides(id).terms.deadline ?? quoteDeadline()).replace(/,?\s*6\s*pm$/i, "")}
              suppliers={all.filter((s) => s.category === cat).map((s) => ({
                id: s.id, name: s.name, city: s.city, status: s.status, channel: s.channel, contact: s.contact,
                onTime: s.onTime, share: s.share, warning: s.warning, blocked: s.blocked,
                suggested: s.status === "Approved" && !s.warning && !s.blocked,
              }))}
            />
          </Section>
        )}
        {tab === "quotes" && invites.length > 0 && (
          <Section title="Supplier inbox" icon={<Mail size={16} />} info="Every email from suppliers for this event, newest first. A new reply is read by QuoteLens as soon as it arrives, then shows what to do next.">
            <SupplierInbox eventId={id} eventName={ev.name} address={replyAddress(id)} rows={inboxRows(id)} suppliers={invites.map((iv) => ({ id: iv.supplier_id, name: all.find((x) => x.id === iv.supplier_id)?.name ?? iv.supplier_id }))} />
          </Section>
        )}
        {(tab === "suppliers" || tab === "quotes") && invites.length > 0 && (
          <Section title={tab === "quotes" ? (replied.size ? `Replies: ${replied.size} of ${invites.length}` : "Waiting for replies") : "Sent to suppliers"} icon={tab === "quotes" ? <MessagesSquare size={16} /> : <SendIcon size={16} />} info="Who received the request, how and when. Replies will appear here as they arrive and the AI reads them.">
            <div className="mb-3 text-[13px] text-muted">{row?.due ?? ev.due}, 6 pm · {invites.length} suppliers · same request and deadline for everyone</div>
            <div className="space-y-2">
              {invites.map((iv) => {
                const s = all.find((x) => x.id === iv.supplier_id);
                return (
                  <div key={iv.supplier_id} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-sm">
                    <div className="min-w-0 flex-1"><div className="font-semibold text-navy">{s?.name ?? iv.supplier_id}</div><div className="text-[12px] text-muted">{iv.channel === "WhatsApp" ? "WhatsApp with a simple link, no login" : "Email with the request as PDF and an Excel sheet"} · sent {fmtSent(iv.sent_at)}</div></div>
                    <Pill tone="ok"><SendIcon size={11} /> Sent</Pill>
                    {tab === "quotes" && (replied.has(iv.supplier_id) ? <Pill tone="ok">Replied, read</Pill> : <Pill tone="none">No reply yet</Pill>)}
                  </div>
                );
              })}
            </div>
            {tab === "suppliers" && <Link href={`/events/${id}/quotes`} className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-purple">Track replies <ArrowRight size={13} /></Link>}
            {tab === "quotes" && <p className="mt-3 text-[12px] text-muted">Sending is simulated, so replies don&apos;t arrive by themselves. Use <b>Simulate an incoming email</b> above to play a supplier: their reply is read for real and lands in Compare.</p>}
          </Section>
        )}

        {invites.length > 0 && tab === "compare" && (
          <Section title="Side by side" icon={<BookOpen size={16} />} info="Every reply on the same basis: the same lines, ₹ per unit, before GST, delivered. Click any price to see the exact spot in the supplier's file and how it was converted.">
            <EventCompare items={results.items} suppliers={results.suppliers} rec={recommend(results)} />
          </Section>
        )}
        {invites.length > 0 && tab === "check" && <EventCheck eventId={id} items={results.items} suppliers={results.suppliers} decisions={results.decisions} initialSup={sup} />}
        {invites.length > 0 && tab === "ask" && (
          <Analyst eventId={id} intro={results.suppliers.length ? `Hi Rishabh. I've got ${results.suppliers.length} repl${results.suppliers.length === 1 ? "y" : "ies"} for ${ev.name} (${results.items.length} line${results.items.length === 1 ? "" : "s"}), converted to ₹ per unit before GST. Ask who's cheapest, what-ifs, or what's still missing. I run the sums in code.` : `No replies read yet for ${ev.name}. Once a supplier's email arrives, ask me anything about it.`} suggestions={["Who is cheapest for each line?", "What's the best award, and what did you leave out?", "What if we leave out the most expensive supplier?", "Which prices still need checking, and why?"]} />
        )}
        {invites.length > 0 && tab === "award" && <EventAward id={id} name={ev.name} results={results} />}
        {!(tab === "request" && src) && !(tab === "suppliers") && !(tab === "quotes" && invites.length) && !(invites.length && ["compare", "check", "ask", "award"].includes(tab)) && <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
          <div className="text-[15px] font-semibold text-indigo">{ev.name}: {def.label}</div>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-muted">{stage === "request" || stage === "suppliers" ? "This event is still being set up. Quotes and comparison fill in once the request is sent and suppliers reply." : stage === "quotes" ? "Waiting for supplier replies. This fills in once quotes arrive." : "This demo has full data only for the corrugated boxes event. Other events show their stage and key details so you can see the whole company at a glance."}</p>
          <Link href={`/events/${DEMO_EVENT}/${tab}`} className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-purple">See this stage for Corrugated boxes FY27 <ArrowRight size={13} /></Link>
        </div>}
      </div>
    );
  }

  switch (tab) {
    case "request":
      return (
        <div className="space-y-4">
          <Section title="Where this came from" icon={<Inbox size={16} />} open={false} info="The team's original request that this sourcing event was created from.">
            <Link href="/requests/REQ-0142" className="flex items-center justify-between rounded-lg bg-bg px-4 py-3 text-[13px] hover:bg-tint">
              <span><span className="font-semibold text-indigo">REQ-0142 · Corrugated boxes FY27, Haridwar</span><span className="block text-muted">Sandeep Rawat, Stores Manager · WhatsApp · 2 Nov</span></span>
              <Pill tone="ok">Converted 2 Nov</Pill>
            </Link>
          </Section>
          <Draft />
        </div>
      );
    case "suppliers":
      return (
        <div className="space-y-4">
          <Section title="Choose suppliers" icon={<Users size={16} />} info="Suggested from your approved list and past orders, with track record and warnings."><Suppliers /></Section>
          <Section title="Send the request" icon={<SendIcon size={16} />} info="Each supplier gets the request the way they prefer: email or WhatsApp."><Send /></Section>
        </div>
      );
    case "quotes":
      return (
        <div className="space-y-4">
          <Section title="Supplier inbox" icon={<Mail size={16} />} info="Every email and message from suppliers, newest first. A new reply is read by QuoteLens as soon as it arrives, then shows what to do next."><SupplierInbox address={replyAddress(DEMO_EVENT)} rows={inboxRows()} suppliers={RESPONDERS.map((r) => ({ id: r.id, name: r.name }))} /></Section>
          <Section title="Who has replied" icon={<MessagesSquare size={16} />} info="Status of every invited supplier during the bidding window."><Responses /></Section>
          <Section title="What the AI read from each reply" icon={<BookOpen size={16} />} info="Every reply read the same way: read, match to our items, convert, check."><Reading /></Section>
          <Section title="All supplier messages" icon={<Mail size={16} />} open={false} info="Every message from suppliers, sorted automatically."><Messages /></Section>
        </div>
      );
    case "compare":
      return <Comparison />;
    case "check":
      return <Review initial={checkDecisions()} initialSup={/^[A-E]$/.test(sup) ? sup : ""} />;
    case "ask":
      return <Analyst />;
    case "award":
      return (
        <div className="space-y-4">
          <Section title="Negotiate (optional)" icon={<Handshake size={16} />} open={false} info="Ask all suppliers for a best and final price on the boxes with the biggest price gaps."><Negotiation /></Section>
          <Section title="Pick the winners" icon={<Trophy size={16} />} info="Recommended award with written reasons and approvals."><Award /></Section>
          <Section title="Notify suppliers and place orders" icon={<Megaphone size={16} />} open={false} info="Award letters, polite regrets and purchase orders."><Close /></Section>
        </div>
      );
  }
  notFound();
}

const fmtSent = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

function Gate({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
      <p className="text-[14px] text-ink">{text}</p>
      <Link href={href} className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-purple">{cta} <ArrowRight size={13} /></Link>
    </div>
  );
}

/** Supplier inbox rows, newest first, read fresh from inbox.json so a reply that just arrived shows at once. */
function inboxRows(eventId = DEMO_EVENT): InboxRow[] {
  const prefix = eventId === DEMO_EVENT ? "" : `${eventId}/`; // other events' files live in data/files/<event>/
  const names = Object.fromEntries(ALL_SUPPLIERS().map((x) => [x.id, x.name]));
  return readInbox(eventId)
    .sort((a, b) => b.received_at.localeCompare(a.received_at))
    .map((m) => ({
      id: m.id, supplierId: m.supplier_id, supplier: names[m.supplier_id] ?? m.supplier_id, channel: m.channel, at: m.received_at,
      when: new Date(m.received_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }),
      kind: m.kind, subject: subjectOf(m),
      snippet: m.text.replace(/^(From|To|Date|Subject|Attachments):.*$/gm, "").replace(/^\[[^\]]*\]\s*[^:]+:\s*/gm, "").replace(/\s+/g, " ").trim().slice(0, 180),
      files: [m.text_file, ...m.attachments].filter(Boolean).map((f) => prefix + f), live: m.id.startsWith("MSG-U"),
      status: m.read_status, summary: m.read_summary, error: m.read_error,
    }));
}

/** Award for any event other than the demo: cheapest usable price per line, worked out by code, then approval. */
function EventAward({ id, name, results }: { id: string; name: string; results: EventResults }) {
  const rec = recommend(results);
  const reds = openFlags(results).filter((f) => f.tone === "bad").length;
  const fmt = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  if (!results.suppliers.length) return <div className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-[13px] text-muted">No replies read yet, so there&apos;s nothing to award.</div>;
  return (
    <Section title="Recommended award" icon={<Trophy size={16} />} info="Cheapest usable price for each line, among suppliers who replied. Red prices count only once fixed in Check; unquoted lines are never zero.">
      {reds > 0 && <div className="mb-3 rounded-xl border border-bad/25 bg-bad-bg px-4 py-2.5 text-[13px] text-bad"><b>{reds} red item(s)</b> still open in Check. This is a preview until they&apos;re fixed or left out with a reason.</div>}
      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-[13px]">
          <thead className="bg-bg text-left text-[11px] font-semibold uppercase tracking-wide text-muted"><tr><th className="px-3 py-2">Line</th><th className="px-3 py-2">Item</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2">Winner</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2 text-right">Per year</th></tr></thead>
          <tbody>{rec.lines.map((l) => <tr key={l.line} className="border-t border-line"><td className="px-3 py-2 font-mono text-[12px] text-muted">{l.line}</td><td className="px-3 py-2">{l.description}</td><td className="num px-3 py-2 text-right">{l.qty.toLocaleString("en-IN")}</td><td className="px-3 py-2">{l.best ? l.best.name : <Pill tone="warn">No usable price</Pill>}</td><td className="num px-3 py-2 text-right">{l.best ? fmt(l.best.price) : "—"}</td><td className="num px-3 py-2 text-right">{l.cost != null ? fmt(l.cost) : "—"}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-tint px-4 py-3 text-[13px]">
        <span><b>Total {fmt(rec.total)} a year.</b>{rec.bestSingle ? ` Best single supplier: ${rec.bestSingle.name} at ${fmt(rec.bestSingle.total)}.` : ""}{rec.uncovered.length ? ` ${rec.uncovered.length} line(s) not covered yet.` : ""}</span>
        <SendEventForApproval eventId={id} disabled={reds > 0 || !rec.total} />
      </div>
      <p className="mt-2 text-[12px] text-muted">All sums by code. {name}: winners and reasons go to the approver; letters to suppliers follow approval.</p>
    </Section>
  );
}
