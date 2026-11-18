import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, AlertTriangle, AlertOctagon, TrendingUp, Lightbulb, MessageCircle, Mail, FileText } from "lucide-react";
import { Card, Pill, Stat, InfoTip, Person } from "@/components/ui";
import { AskBox } from "@/components/ask-box";
import { EventsTable } from "@/components/tables";
import { SpendChart, SavingsChart } from "@/components/home/charts";
import { EVENTS, INSIGHTS, REQUESTS, REQ_STATUS, SAVINGS_BY_MONTH, spendByCategory } from "@/lib/portfolio";

const crore = (x: number) => "₹" + (x / 1e7).toFixed(2) + " Cr";
const VIA = { WhatsApp: MessageCircle, Email: Mail, Form: FileText, Chat: MessageCircle };

const INSIGHT_STYLE = {
  bad: { icon: AlertOctagon, chip: "bg-bad-bg text-bad", label: "Risk" },
  warn: { icon: AlertTriangle, chip: "bg-warn-bg text-warn", label: "Heads-up" },
  info: { icon: Lightbulb, chip: "bg-sky text-purple", label: "Opportunity" },
  ok: { icon: TrendingUp, chip: "bg-ok-bg text-ok", label: "Good news" },
};

export default function Home() {
  const totalValue = EVENTS.reduce((a, e) => a + e.value, 0);
  const saved = SAVINGS_BY_MONTH.reduce((a, m) => a + m.lakh, 0);
  const openReqs = REQUESTS.filter((r) => r.status === "new" || r.status === "needs_info");

  return (
    <div>
      <div className="hero-wash border-b border-line px-8 pb-9 pt-9">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <div className="text-[13px] text-muted">Good morning, Rishabh · RSG Herbal House</div>
            <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-indigo">What do you need to buy?</h1>
            <p className="mt-1 text-[14px] text-muted">Describe it, paste a team&apos;s message, or attach a file. The AI drafts it for you to check.</p>
          </div>
          <div className="mt-5"><AskBox mode="any" /></div>
        </div>
      </div>

      <div className="space-y-6 px-8 py-6">
        <div className="grid grid-cols-4 gap-4">
          <Stat label="Requests waiting" value={openReqs.length} hint="From company teams" tone="warn" info="Internal requests from teams that you haven't started sourcing for yet." />
          <Stat label="Live sourcing events" value={EVENTS.length} hint={`${crore(totalValue)} a year`} info="Requests for quotes currently open with suppliers, and their total yearly value." />
          <Stat label="Saved this year" value={`₹${saved.toFixed(1)} L`} hint="vs last prices paid, Jun to Nov" tone="ok" info="Savings on events awarded since June, compared with the price paid before." />
          <Stat label="Need your action" value={EVENTS.filter((e) => e.attention).length} hint="Events blocked on something" tone="bad" info="Sourcing events with something blocking progress: prices to fix, approvals pending or silent suppliers." />
        </div>

        <div>
          <div className="mb-3 flex items-center gap-1.5">
            <h2 className="text-[15px] font-semibold text-indigo">AI insights across your company</h2>
            <InfoTip text="The AI watches all your requests, sourcing events, contracts, suppliers and market prices, and flags what deserves attention today." />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {INSIGHTS.map((i) => {
              const st = INSIGHT_STYLE[i.tone];
              return (
                <Link key={i.title} href={i.href} className="flex flex-col rounded-xl border border-line bg-white p-4 transition-colors hover:border-purple/40">
                  <div className="flex items-center justify-between">
                    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", st.chip)}><st.icon size={12} /> {st.label}</span>
                    <InfoTip text={i.info} />
                  </div>
                  <div className="mt-2.5 font-semibold leading-snug text-navy">{i.title}</div>
                  <p className="mt-1 flex-1 text-[13px] leading-relaxed text-muted">{i.body}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-purple">{i.action} <ArrowRight size={13} /></span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6">
          <div className="space-y-6">
            <Card title="Requests from teams" subtitle="Company teams asking you to buy something" info="Internal requests (team → buyer). Open one to review it and convert it into a sourcing event." action={<Link href="/requests" className="text-[13px] font-semibold text-purple">View all</Link>} flush>
              {openReqs.map((r) => {
                const V = VIA[r.via];
                return (
                  <Link key={r.id} href={`/requests/${r.id}`} className="flex items-center gap-4 border-b border-line px-5 py-3 last:border-0 hover:bg-bg/60">
                    <V size={16} className="shrink-0 text-muted" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-indigo">{r.title}</div>
                      <div className="flex flex-wrap items-center gap-1 text-[12px] text-muted"><Person name={r.from} kind="company" detail={r.plant} /> · {r.when} · {r.checks[0]?.title ?? (r.understood.some((u) => u.missing) ? `${r.understood.filter((u) => u.missing).length} details missing` : "Ready to source")}</div>
                    </div>
                    <Pill tone={REQ_STATUS[r.status].tone}>{REQ_STATUS[r.status].label}</Pill>
                  </Link>
                );
              })}
            </Card>
            <Card title="Sourcing events" subtitle="Requests for quotes with suppliers, across all plants" info="Sourcing events (buyer → suppliers). Click one to open it. The bar shows its stage." action={<Link href="/events" className="text-[13px] font-semibold text-purple">View all</Link>} flush>
              <EventsTable compact />
            </Card>
          </div>
          <div className="space-y-6">
            <Card title="Spend being sourced" subtitle="By category, ₹ crore per year" info="Yearly value of all live sourcing events, grouped by category.">
              <SpendChart data={spendByCategory()} />
            </Card>
            <Card title="Savings by month" subtitle="₹ lakh saved on awarded events" info="Difference between the price awarded and the price paid before, for events awarded each month.">
              <SavingsChart data={SAVINGS_BY_MONTH} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
