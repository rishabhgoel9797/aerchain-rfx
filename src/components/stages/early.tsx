import { MessageCircle, Mail, Phone, Sparkles, Check, Ban, AlertTriangle, Clock, Send as SendIcon, Eye, Paperclip } from "lucide-react";
import { ITEMS, SUPPLIERS, RESPONDERS, QUESTIONS, LAST_YEAR_F, totalQty, estValue, crore, lakh } from "@/lib/fixtures";
import { Card, Pill, Button, AiNote, SimBadge, Stat, InfoTip, Person } from "@/components/ui";
import { SupplierTable, MessagesTable, ItemsTable } from "@/components/tables";
import { costWithoutLastYearsCheapest } from "@/lib/analysis";
import { quotesFrom, filesFrom, dayOf, fmtDate, isLiveReply } from "@/lib/inbox";
import { replyAddress } from "@/lib/mailbox";
import { FileViewerButton } from "@/components/source-panel";

/* ---------- 1.1 Factory's message ---------- */
export function Need() {
  return (
    <div className="grid grid-cols-2 gap-5">
      <Card
        title="Message from the factory"
        subtitle="Sandeep Rawat, Stores Manager, Haridwar plant · WhatsApp · 2 Nov, 9:14 am"
        info="Requests often arrive as a WhatsApp or email, not a form. You don't need to retype it. The AI reads it and fills in the request for you."
        action={<MessageCircle size={18} className="text-ok" />}
      >
        <div className="rounded-2xl rounded-tl-md bg-[#e9f7ee] p-4 text-sm leading-relaxed text-ink">
          Rishabh ji, FY27 boxes ka annual contract banana hai. Same 30 sizes as this year, volume roughly 10% more because of the new line. Need rates finalised before Dec 15. Drawings same as last year. — Sandeep
        </div>
        <p className="mt-3 text-[12px] text-muted">In English: we need next year&apos;s box contract. Same 30 sizes, about 10% more volume, prices fixed before 15 Dec.</p>
      </Card>
      <Card title="What the AI understood" info="The AI pulls out the key facts from the message. Check them before you start the request. If something is missing, it asks Sandeep instead of guessing." action={<Pill tone="ok">Looks complete</Pill>}>
        <dl className="grid grid-cols-[150px_1fr] gap-y-2.5 text-sm">
          <dt className="text-muted">What to buy</dt><dd className="font-semibold text-navy">Corrugated boxes</dd>
          <dt className="text-muted">Box sizes</dt><dd className="font-semibold text-navy">Same 30 sizes as last year</dd>
          <dt className="text-muted">Quantity</dt><dd className="font-semibold text-navy">{(totalQty / 1e5).toFixed(1)} lakh boxes a year (last year + 10%)</dd>
          <dt className="text-muted">Estimated value</dt><dd className="font-semibold text-navy">{crore(estValue)} a year</dd>
          <dt className="text-muted">Prices needed by</dt><dd className="font-semibold text-navy">15 Dec 2026</dd>
        </dl>
        <div className="mt-4">
          <AiNote title="Checked for you">The current box contract with Doon Corrupack <b>ends 31 Mar 2027</b>, so a new request is needed. No other team has asked for the same boxes.</AiNote>
        </div>
        <div className="mt-4 flex gap-2"><Button>Start the request</Button><Button variant="secondary">Ask Sandeep a question</Button></div>
      </Card>
    </div>
  );
}

/* ---------- 1.2 Write with AI ---------- */
export function Draft() {
  const chat: ["ai" | "me", string][] = [
    ["me", "Start from last year's box request. Add 10% volume. Prices delivered to Haridwar."],
    ["ai", "Done. I copied last year's request and changed two things: quantities are up 10% on all 30 boxes, and prices are now delivered to the Haridwar plant. Before sending, two questions:"],
    ["ai", "1) Last year, 4 suppliers quoted per box and 1 quoted per 100 boxes. Shall I ask everyone to quote per box?  2) I've added each box's weight, so if someone quotes per kg we can still compare."],
    ["me", "Yes, per box. Add the usual quality questions."],
    ["ai", "Added 5 quality questions and asked suppliers to attach certificates and test reports as proof."],
  ];
  return (
    <div className="grid grid-cols-[400px_1fr] gap-5">
      <div className="flex flex-col rounded-2xl border border-line bg-white">
        <div className="flex items-center gap-2 border-b border-line px-5 py-4 text-[15px] font-semibold text-indigo">
          <Sparkles size={16} className="text-purple" /> Chat with the AI
          <InfoTip text="Describe what you need in your own words. The AI writes the request on the right and asks you about anything unclear, like the unit or who pays for delivery." />
        </div>
        <div className="flex-1 space-y-3 p-5">
          {chat.map(([who, t], i) => (
            <div key={i} className={who === "me" ? "ml-10 rounded-2xl rounded-br-md bg-navy px-4 py-2.5 text-sm text-white" : "mr-6 rounded-2xl rounded-bl-md bg-tint px-4 py-2.5 text-sm text-ink"}>{t}</div>
          ))}
        </div>
        <div className="border-t border-line p-4"><div className="rounded-xl border border-line bg-bg px-4 py-2.5 text-sm text-muted">Tell the AI what to change…</div></div>
      </div>
      <div className="space-y-5">
        <Card title="Your request (draft)" subtitle="Changes from last year are highlighted in orange" info="This is what suppliers will receive. Everything here was written by the AI from your chat, and you can edit any of it." action={<Button href="/events/RFQ-2026-014/suppliers" toast="Request approved. Next: choose who receives it.">Approve request</Button>}>
          <div className="mb-4 grid grid-cols-4 gap-3 text-sm">
            {[["Price unit", "₹ per box", "Every supplier must quote in the same unit, so prices can be compared fairly."], ["Delivery", "Delivered to Haridwar plant", "The price must include delivery to our factory."], ["Currency", "Indian rupees", "Suppliers are asked to say clearly if they quote in another currency."], ["Deadline", "12 Nov, 6 pm", "The same deadline for every supplier."]].map(([k, v, i]) => (
              <div key={k} className="rounded-xl bg-bg px-3 py-2">
                <div className="flex items-center gap-1 text-[11px] font-semibold uppercase text-muted">{k} <InfoTip text={i} /></div>
                <div className="font-semibold text-navy">{v}</div>
              </div>
            ))}
          </div>
          <ItemsTable />
        </Card>
        <Card title="Quality questions" subtitle="Suppliers are asked to attach proof" info="Every supplier answers the same questions. Answers are checked against the attached documents, such as certificates and test reports.">
          <ol className="space-y-1.5 text-sm">{QUESTIONS.map((q, i) => <li key={q} className="flex gap-2"><span className="text-muted">{i + 1}.</span>{q}</li>)}</ol>
        </Card>
      </div>
    </div>
  );
}

/* ---------- 2.1 Choose suppliers ---------- */
export function Suppliers() {
  return (
    <div className="space-y-4">
      <AiNote>I suggested 6 suppliers from your approved list and past orders. Company rule: invite <b>at least 3</b> ✓. Doon Corrupack got <b>38%</b> of last year&apos;s box spend, so keep at least one backup. Need someone new? Use <b>Add supplier</b>.</AiNote>
      <SupplierTable mode="invite" />
    </div>
  );
}

/* ---------- 2.2 Send request ---------- */
export function Send() {
  const icon = { Email: Mail, WhatsApp: MessageCircle, Call: Phone };
  return (
    <div className="grid grid-cols-[1fr_420px] gap-5">
      <Card title="Sent to each supplier" info="Each supplier gets the request the way they prefer: email, or WhatsApp with a simple link. No app or login needed." action={<SimBadge />}>
        <div className="space-y-2">
          {SUPPLIERS.filter((s) => s.invited).map((s) => {
            const I = icon[s.channel];
            return (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
                <I size={16} className="text-indigo" />
                <div className="flex-1"><div className="text-sm font-semibold text-navy">{s.name}</div><div className="text-[12px] text-muted">{s.channel === "WhatsApp" ? "WhatsApp with a simple link, no login" : "Email with the request as PDF, plus an optional Excel sheet"}</div></div>
                <Pill tone="ok"><SendIcon size={11} /> Sent 3 Nov</Pill>
                <Pill tone={s.id === "F" ? "none" : "info"}><Eye size={11} /> {s.id === "F" ? "Not opened" : "Opened"}</Pill>
              </div>
            );
          })}
        </div>
      </Card>
      <Card title="Message preview" info="Every supplier receives exactly the same message and deadline. This keeps the process fair.">
        <div className="space-y-3 text-sm leading-relaxed text-ink">
          <p>Dear Supplier,</p>
          <p>RSG Herbal House invites your quotation for our <b>FY27 corrugated box contract</b> (30 sizes, about 10 lakh boxes a year for our Ayurvedic product range), delivered to our Haridwar plant.</p>
          <p><b>Reply in any format you like</b>: your own quotation, Excel, PDF, even a photo. Please quote <b>₹ per box</b>, say whether GST and delivery are included, and attach your ISO certificate and test reports.</p>
          <p>Deadline: <b>12 Nov 2026, 6 pm</b>. Questions? Just reply. Answers are shared with all invited suppliers.</p>
          <p className="rounded-lg bg-bg px-3 py-2 text-[12.5px]">Reply-to: <b className="font-mono">{replyAddress("RFQ-2026-014")}</b>. Every reply sent here is read by QuoteLens as soon as it arrives.</p>
          <p>Regards,<br />Rishabh, Category Buyer<br />RSG Herbal House, New Delhi</p>
        </div>
      </Card>
    </div>
  );
}

/* ---------- 3.1 Reply tracker ---------- */
export function Responses() {
  const fGap = costWithoutLastYearsCheapest();
  const rows: [string, "ok" | "warn" | "none", string][] = [
    ["A", "ok", "Sent an Excel sheet"],
    ["B", "ok", "Sent a PDF quotation (their updated version)"],
    ["C", "ok", "Sent a Word letter"],
    ["D", "ok", "Sent a photo of their price list on WhatsApp"],
    ["E", "warn", "Sent a one-line WhatsApp, then gave one price on a call"],
    ["F", "none", "No reply. Auto-reply ‘out of office’ on day 1. Reminded on days 2, 5 and 8."],
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <Stat label="Replied" value="5 of 6" info="Number of invited suppliers who sent a quote before the deadline." />
        <Stat label="Questions answered" value="2" hint="Answers shared with everyone" info="When one supplier asks a question, the answer goes to all suppliers so nobody gets an advantage." />
        <Stat label="Reminders sent" value="3" hint="To Doon Corrupack" info="Friendly reminders go out automatically on days 2, 5 and 8 to suppliers who haven't replied." />
        <Stat label="If F doesn't reply" value={`+${lakh(fGap)}`} hint="Estimated extra cost" tone="warn" info="Doon Corrupack was last year's cheapest. This estimates how much more we may pay without them, based on last year's prices. We never guess their new price." />
      </div>
      <div className="grid grid-cols-[1fr_380px] gap-5">
        <Card title="Who has replied" subtitle="Request sent 3 Nov (day 0) · quotes accepted until 12 Nov, 6 pm" info="Shows each supplier's status during the bidding window, with the day and date (India time) each reply arrived. Click a file to open it.">
          <div className="space-y-2">
            {rows.map(([id, tone, text0]) => {
              let text = text0;
              const s = SUPPLIERS.find((x) => x.id === id)!;
              const msgs = quotesFrom(id);
              const files = filesFrom(id);
              // A reply added live in the app replaces the demo description with what actually arrived.
              const live = msgs.find(isLiveReply);
              const late = live && dayOf(live.received_at) > 9; // quotes were due 12 Nov (day 9)
              if (live) text = `Sent an updated reply, read live by QuoteLens${late ? ". Arrived after the 12 Nov deadline: accepting it is your call" : ""}`;
              const shownTone = live ? (late ? "warn" : "ok") : tone;
              return (
                <div key={id} className="flex items-start gap-3 rounded-xl border border-line px-4 py-3 text-sm">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-tint text-xs font-bold text-indigo">{id}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-navy"><Person name={s.name} kind="supplier" /></div>
                    <div className="text-[12px] text-muted">{text}</div>
                    {files.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{files.map((f) => <FileViewerButton key={f} file={f} chip />)}</div>}
                  </div>
                  <div className="shrink-0 text-right text-[12px] text-muted">
                    {msgs.length ? msgs.map((m) => (
                      <div key={m.id} className="flex items-center justify-end gap-1 whitespace-nowrap" title={`${m.kind}, received ${fmtDate(m.received_at)} (India time)`}>
                        <Clock size={12} /><span className="font-semibold text-ink">Day {dayOf(m.received_at)}</span> · <span className="num">{fmtDate(m.received_at)}</span>{msgs.length > 1 && <span className="text-[11px]">({m.channel === "Phone" || /call/i.test(m.kind) ? "call" : m.channel})</span>}
                      </div>
                    )) : <div className="flex items-center justify-end gap-1"><Clock size={12} />—</div>}
                    <div className="mt-1.5"><Pill tone={shownTone}>{live ? (late ? "Late reply" : "Received") : tone === "none" ? "No reply" : tone === "warn" ? "Partly in writing" : "Received"}</Pill></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <div className="space-y-5">
          <Card title="Supplier questions" info="Similar questions are grouped together. You answer once and everyone gets the same answer.">
            <div className="space-y-3 text-[13px]">
              <div className="rounded-xl bg-bg p-3"><div className="font-semibold text-navy">“Is printing our logo in one colour included?”</div><div className="mt-1 text-muted">Asked by A and C. Answered once (“Yes”) and sent to all 6.</div></div>
              <div className="rounded-xl bg-bg p-3"><div className="font-semibold text-navy">“Can we quote per kg?”</div><div className="mt-1 text-muted">Asked by E. Answered (“Yes, box weights are in the request”) and sent to all 6.</div></div>
            </div>
          </Card>
          <AiNote>Doon Corrupack was last year&apos;s cheapest supplier. Without them you may pay about <b>{lakh(fGap)}</b> more. Worth a phone call. We will never guess their price.</AiNote>
        </div>
      </div>
    </div>
  );
}

/* ---------- 3.2 Supplier messages ---------- */
export function Messages() {
  return <MessagesTable />;
}
