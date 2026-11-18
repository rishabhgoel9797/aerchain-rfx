"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { Check, ChevronDown, Package, Users, CalendarClock, Inbox } from "lucide-react";
import { EVENTS, type EventRow } from "@/lib/portfolio";
import { EVENT_TABS, tabIndex } from "@/lib/event-tabs";
import { FileViewerButton } from "@/components/source-panel";
import { InfoTip } from "@/components/ui";

const crore = (x: number) => "₹" + (x / 1e7).toFixed(2) + " Cr";

export function EventHeader({ ev, checkCount, checkRed, files = [] }: { ev: EventRow; checkCount: number; checkRed: number; files?: { path: string }[] }) {
  const path = usePathname();
  const router = useRouter();
  const current = tabIndex(ev.stage);
  const activeKey = path.split("/")[3] ?? ev.stage;
  const active = EVENT_TABS.find((t) => t.key === activeKey) ?? EVENT_TABS[current];

  return (
    <div className="border-b border-line bg-white px-8 pt-5">
      <div className="mb-2 flex items-center gap-1.5 text-[12px]">
        <Link href="/" className="text-muted hover:text-purple">Home</Link><span className="text-muted">›</span>
        <Link href="/events" className="text-muted hover:text-purple">Sourcing events</Link><span className="text-muted">›</span>
        <span className="font-semibold text-purple">{ev.id}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="relative inline-flex items-center">
            <select
              value={ev.id}
              onChange={(e) => router.push(`/events/${e.target.value}`)}
              className="cursor-pointer appearance-none rounded-lg bg-transparent py-0.5 pl-0 pr-8 text-[22px] font-semibold text-indigo outline-none hover:bg-bg"
              aria-label="Switch sourcing event"
            >
              {(EVENTS.some((e) => e.id === ev.id) ? EVENTS : [ev, ...EVENTS]).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <ChevronDown size={18} className="pointer-events-none absolute right-1.5 text-muted" />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-[13px] text-muted">
            <span className="flex items-center gap-1.5"><Package size={14} /> {ev.category} · {ev.plant}</span>
            <span className="flex items-center gap-1.5"><Users size={14} /> {ev.suppliers}</span>
            <span className="flex items-center gap-1.5"><CalendarClock size={14} /> {ev.due}</span>
            {ev.fromRequest && <Link href={`/requests/${ev.fromRequest}`} className="flex items-center gap-1.5 text-purple hover:underline"><Inbox size={14} /> From request {ev.fromRequest}</Link>}
          </div>
          {files.length > 0 && (
            <div data-tour="request-files" className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
              <span className="inline-flex items-center gap-1 font-semibold">Request files <InfoTip text="What the team sent with their request: their message and any attachments. Shown on every step, so you can always check what was asked for." />:</span>
              {files.map((f) => <FileViewerButton key={f.path} file={f.path} chip />)}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Estimated yearly value <InfoTip text="Quantity × last prices paid. Updated once quotes are compared." /></div>
          <div className="num text-[20px] font-semibold text-navy">{ev.value ? crore(ev.value) : <span className="text-[14px] text-muted">Not estimated yet</span>}</div>
        </div>
      </div>

      <div className="mt-5 flex items-stretch overflow-x-auto">
        {EVENT_TABS.map((t, i) => {
          const done = i < current;
          const isCurrent = i === current;
          const isActive = t.key === active.key;
          return (
            <Link
              key={t.key}
              href={`/events/${ev.id}/${t.key}`}
              title={t.info}
              className={clsx("relative flex min-w-0 flex-1 items-center gap-2 border-b-2 px-3 pb-3 pt-1 text-[13px] transition-colors", isActive ? "border-purple font-semibold text-purple" : "border-transparent text-ink hover:text-purple")}
            >
              <span className={clsx("grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold", done ? "bg-ok text-white" : isCurrent ? "bg-orange text-white" : "border border-line text-muted")}>
                {done ? <Check size={11} strokeWidth={3} /> : i + 1}
              </span>
              <span className="truncate">{t.label}</span>
              {t.key === "check" && checkCount > 0 && (
                <span className={clsx("rounded-full px-1.5 text-[10px] font-semibold text-white", checkRed ? "bg-bad" : "bg-orange")}>{checkCount}</span>
              )}
              {i < EVENT_TABS.length - 1 && <span className="ml-auto hidden h-px w-4 bg-line xl:block" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function TabIntro({ ev, nextNote }: { ev: EventRow; nextNote?: string }) {
  const path = usePathname();
  const key = path.split("/")[3] ?? ev.stage;
  const t = EVENT_TABS.find((x) => x.key === key) ?? EVENT_TABS[0];
  const idx = tabIndex(t.key);
  const cur = tabIndex(ev.stage);
  // Once replies are in (Compare or later), Check and Ask AI can be used any time, not "coming up".
  const repliesIn = cur >= tabIndex("compare");
  const anytime = repliesIn && idx > cur && (t.key === "ask" || t.key === "check");
  const status = idx < cur ? "Done" : idx === cur ? "Current stage" : anytime ? (t.key === "ask" ? "Available any time" : "Ready") : "Coming up";
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
      <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-semibold", idx < cur ? "bg-ok-bg text-ok" : idx === cur ? "bg-warn-bg text-warn" : anytime ? "bg-tint text-purple" : "bg-[#eef0f5] text-muted")}>{status}</span>
      <span className="text-ink">{t.what}</span>
      <span className="text-muted">·</span>
      <span className="text-muted"><span className="font-semibold text-orange">Next:</span> {nextNote ? nextNote : ev.id === "RFQ-2026-014" ? t.todo : ev.stage === "request" ? ev.fromRequest ? "Check the draft built from the team's request, then approve it." : "Describe what suppliers should quote for, then send it." : ev.stage === "suppliers" ? "Pick who gets the request, then send it." : ev.stage === "quotes" ? `Waiting for replies. ${ev.due}, 6 pm.` : ev.fromRequest ? ({ compare: "Click any price to see where it came from, then check the flagged ones.", check: "Fix red items first. Then the award can go for approval.", ask: "Pick a suggested question on the right, or type your own. Every number in the answer comes from code.", award: "Check the recommended award, then send it for approval." } as Record<string, string>)[key] ?? "Open Compare to see the replies side by side." : "Demo data is filled in for Corrugated boxes FY27 only."}</span>
    </div>
  );
}
