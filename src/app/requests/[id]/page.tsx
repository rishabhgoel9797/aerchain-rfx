import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { MessageCircle, Mail, FileText, ClipboardList, Sparkles, ShieldCheck, History, ArrowRight, CircleAlert, CircleCheck, Info } from "lucide-react";
import { PageHeader, Pill, Section, Field, Button, InfoTip, Person } from "@/components/ui";
import { ConvertRequest } from "@/components/convert-request";
import { RequestStatusButtons } from "@/components/approval-actions";
import { REQUESTS, REQ_STATUS, HISTORY, requestById, eventById } from "@/lib/portfolio";
import { requestFiles } from "@/lib/request-files";
import { requestSaved } from "@/lib/csv-file";
import { EventPending } from "@/components/event-pending";
import { FileViewerButton } from "@/components/source-panel";

export function generateStaticParams() {
  return REQUESTS.map((r) => ({ id: r.id }));
}

const VIA = { WhatsApp: MessageCircle, Email: Mail, Form: FileText, Chat: MessageCircle };
const CHECK_STYLE = {
  ok: { icon: CircleCheck, cls: "border-ok/25 bg-ok-bg/50", ic: "text-ok" },
  warn: { icon: CircleAlert, cls: "border-orange/30 bg-[#fff8f1]", ic: "text-orange" },
  bad: { icon: CircleAlert, cls: "border-bad/25 bg-bad-bg/50", ic: "text-bad" },
  info: { icon: Info, cls: "border-purple/20 bg-tint", ic: "text-purple" },
};

/** One short question per missing detail, so the requester can answer on WhatsApp in one go. */
function question(label: string, title: string) {
  const l = label.toLowerCase();
  if (/type|spec/.test(l)) return /chair/i.test(title) ? "Which type: ergonomic or basic, with arms or without, mesh or fabric?" : /box|carton/i.test(title) ? "Any board grade, flute or printing needs, or same as our current boxes?" : "Any specific type or specification we should ask for?";
  if (/needed|date|when/.test(l)) return "By when do you need them?";
  if (/budget/.test(l)) return "What is the approved budget?";
  if (/contract/.test(l)) return "Is this a one-time purchase, or a yearly price agreement?";
  if (/quantity/.test(l)) return "How many do you need?";
  if (/^what/.test(l)) return "What exactly do you need: type, size and any spec?";
  if (/deliver/.test(l)) return "Where should it be delivered?";
  return `Could you share: ${label}?`;
}

export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = requestById(id);
  if (!r) {
    if (requestSaved(id)) return <EventPending id={id} label="request" />; // just created, data still reloading
    notFound();
  }
  const V = VIA[r.via];
  const st = REQ_STATUS[r.status];
  const ev = r.event ? eventById(r.event) : undefined;
  const missing = r.understood.filter((u) => u.missing).length;
  const files = requestFiles(r.id);
  // Raised by the buyer in the request chat: there's no requester to ask, so missing details are shown as a to-do instead.
  const byBuyer = r.from === "Rishabh";
  // Dates from the change history, so the activity shows when things really happened.
  const logged = (re: RegExp) => [...HISTORY].reverse().find((h) => re.test(h.what));
  const convertedAt = logged(new RegExp(`Converted request ${r.id}\\b`))?.when ?? r.checks.at(-1)?.body.match(/on (\d+ \w+)/)?.[1] ?? "";
  const aiRead = logged(new RegExp(`Read request ${r.id} with (Claude|QuoteLens AI)`));

  const actions =
    r.status === "converted" && ev ? (
      <Button href={`/events/${ev.id}`}>Open sourcing event <ArrowRight size={14} /></Button>
    ) : r.status === "covered" ? (
      <Button variant="secondary" toast="Purchase order PO-87990 was raised against the Sunrise Tapes contract. It lives in the company's ERP, which isn't connected in this demo.">View purchase order</Button>
    ) : (
      <>
        <RequestStatusButtons id={r.id} first={r.from.split(" ")[0]} via={r.via} missing={missing} questions={byBuyer ? [] : r.understood.filter((u) => u.missing).map((u) => question(u.label, r.title))} />
        <ConvertRequest id={r.id} />
      </>
    );

  return (
    <div>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Requests", href: "/requests" }, { label: r.id }]}
        title={<>{r.title} <Pill tone={st.tone}>{st.label}</Pill></>}
        subtitle={<span className="inline-flex flex-wrap items-center gap-1.5"><Person name={r.from} kind={byBuyer ? "buyer" : "company"} detail={byBuyer ? r.role : `${r.role}, ${r.plant}`} />{byBuyer && r.plant && <span>· for {r.plant}</span>} <span>· via {r.via} · {r.when}</span></span>}
        actions={actions}
      />
      <div className="grid grid-cols-[1fr_340px] gap-5 px-8 py-6">
        <div className="space-y-4">
          <Section title="Original message" icon={<V size={16} />} info="Exactly what the requester sent. Kept unchanged, so you can always check what was really asked for.">
            <div className={clsx("rounded-xl p-4 text-[14px] leading-relaxed text-ink", r.via === "WhatsApp" ? "rounded-tl-sm bg-[#e9f7ee]" : "bg-bg")}>{r.message}</div>
            {r.translation && <p className="mt-2 text-[12px] text-muted"><span className="font-semibold">In English:</span> {r.translation}</p>}
            {files.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                <span className="font-semibold">Files:</span>
                {files.map((f) => <FileViewerButton key={f.path} file={f.path} chip />)}
              </div>
            )}
          </Section>

          <Section title="What the AI understood" icon={<ClipboardList size={16} />} info="The AI turned the message into structured details. Orange fields are missing, and the AI will ask the requester instead of guessing." count={missing ? <Pill tone="warn">{missing} missing</Pill> : <Pill tone="ok">Complete</Pill>}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-5 pt-2">
              {r.understood.map((u) => <Field key={u.label} label={u.label} value={u.value} info={u.info} missing={u.missing} />)}
            </div>
          </Section>

          {missing > 0 && byBuyer && (
            <Section title="Details still missing" icon={<Sparkles size={16} />} info="You raised this yourself, so there's nobody to ask. Fill these in on the draft after converting, by telling the AI.">
              <ul className="list-disc space-y-1 pl-5 text-[13px] text-ink">{r.understood.filter((u) => u.missing).map((u) => <li key={u.label}><b>{u.label}:</b> {u.info}</li>)}</ul>
            </Section>
          )}
          {missing > 0 && !byBuyer && (
            <Section title="Questions for the requester" icon={<Sparkles size={16} />} info="Drafted by the AI. Short and simple, so the requester can answer on WhatsApp in one go.">
              <div className="rounded-xl bg-bg p-4 text-[13px] leading-relaxed text-ink">
                <p>Hi {r.from.split(" ")[0]}, to get you the best price on the {r.title.replace(/^./, (c) => c.toLowerCase())}, could you confirm:</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  {r.understood.filter((u) => u.missing).map((u) => <li key={u.label}>{question(u.label, r.title)}</li>)}
                </ol>
                <p className="mt-2">Thanks, Rishabh</p>
              </div>
              <div className="mt-3 flex gap-2"><RequestStatusButtons id={r.id} first={r.from.split(" ")[0]} via={r.via} missing={missing} questions={r.understood.filter((u) => u.missing).map((u) => question(u.label, r.title))} /></div>
            </Section>
          )}

          <Section title="Activity" icon={<History size={16} />} open={false} info="Everything that happened on this request.">
            <ol className="space-y-2 text-[13px] text-ink">
              <li className="flex flex-wrap items-center gap-1"><span className="text-muted">{r.when}</span> · {byBuyer ? "Raised by" : "Received from"} <Person name={r.from} kind={byBuyer ? "buyer" : "company"} /> via {r.via}</li>
              <li><span className="text-muted">{r.when}</span> · Read by AI, {r.checks.length} {r.checks.length === 1 ? "check" : "checks"} done</li>
              {ev && <li><span className="text-muted">{convertedAt}</span> · Converted by <Person name="Rishabh" kind="buyer" /> to {ev.id}</li>}
              {aiRead && <li><span className="text-muted">{aiRead.when}</span> · {aiRead.what.replace(/^Read request \S+ with (Claude|QuoteLens AI)/, "Re-read by QuoteLens AI")}</li>}
            </ol>
          </Section>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-white">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-[14px] font-semibold text-indigo"><ShieldCheck size={16} className="text-purple" /> AI checks <InfoTip text="Before you start sourcing, the AI checks for an existing contract, duplicate requests from other teams, overlap with live events, urgency and missing details." /></div>
            <div className="space-y-3 p-4">
              {r.checks.length === 0 && <p className="text-[12.5px] text-muted">{missing ? `No overlap with live events found. ${missing} ${missing === 1 ? "detail is" : "details are"} missing; see What the AI understood.` : "No overlap with live events, and no missing details."}</p>}
              {r.checks.map((c) => {
                const s = CHECK_STYLE[c.tone];
                return (
                  <div key={c.title} className={clsx("rounded-lg border p-3", s.cls)}>
                    <div className="flex items-start gap-2"><s.icon size={15} className={clsx("mt-0.5 shrink-0", s.ic)} /><div><div className="text-[13px] font-semibold text-navy">{c.title}</div><div className="mt-0.5 text-[12px] leading-relaxed text-ink">{c.body}</div></div></div>
                  </div>
                );
              })}
            </div>
          </div>
          {ev && (
            <Link href={`/events/${ev.id}`} className="block rounded-xl border border-line bg-white p-4 hover:border-purple/40">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Linked sourcing event</div>
              <div className="mt-1 font-semibold text-indigo">{ev.name}</div>
              <div className="text-[12px] text-muted">{ev.id} · {ev.suppliers}</div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
