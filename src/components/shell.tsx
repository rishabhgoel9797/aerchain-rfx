"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Home, Inbox, Boxes, Stamp, Building2, History, Settings, Bell, Search, Leaf, ChevronDown } from "lucide-react";
import { REQUESTS, EVENTS, APPROVALS } from "@/lib/portfolio";
import { toast } from "@/components/button";
import { GlobalSearch } from "@/components/global-search";
import { GuidedTour, TourButton } from "@/components/guided-tour";

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const newReqs = REQUESTS.filter((r) => r.status === "new" || r.status === "needs_info").length;
  const pendingApprovals = APPROVALS.filter((a) => a.tone === "warn").length;

  const nav = [
    { href: "/", label: "Home", icon: Home, exact: true, hint: "Raise anything, see insights" },
    { href: "/requests", label: "Requests", icon: Inbox, badge: newReqs, hint: "From company teams to you" },
    { href: "/events", label: "Sourcing events", icon: Boxes, badge: EVENTS.length, muted: true, hint: "From you to suppliers" },
    { href: "/approvals", label: "Approvals", icon: Stamp, badge: pendingApprovals, hint: "Awards waiting for sign-off" },
    { href: "/suppliers", label: "Suppliers", icon: Building2, hint: "Directory and performance" },
    { href: "/history", label: "Change history", icon: History, hint: "Every edit and decision" },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-[240px] shrink-0 flex-col border-r border-line bg-white">
        <Link href="/" className="flex h-14 items-center gap-2 border-b border-line px-5">
          <Image src="/aerchain-logo.png" alt="Aerchain" width={118} height={17} priority className="h-[17px] w-auto" />
          <span className="rounded bg-tint px-1.5 py-0.5 text-[10px] font-semibold text-purple">QuoteLens</span>
        </Link>
        <button type="button" onClick={() => toast("RSG Herbal House is the only company in this demo.", "info")} className="mx-3 mt-3 flex items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-left hover:bg-bg" title="Company workspace">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e8f5ec] text-[#2e7d4f]"><Leaf size={16} /></span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-semibold text-navy">RSG Herbal House</span>
            <span className="block text-[11px] text-muted">Ayurvedic products</span>
          </span>
          <ChevronDown size={14} className="text-muted" />
        </button>
        <nav className="flex-1 space-y-0.5 px-3 pt-3">
          {nav.map((n) => {
            const active = n.exact ? path === n.href : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} title={n.hint} className={clsx("flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition-colors", active ? "bg-tint font-semibold text-purple" : "text-ink hover:bg-bg")}>
                <n.icon size={17} strokeWidth={1.8} className={active ? "text-purple" : "text-muted"} />
                <span className="flex-1">{n.label}</span>
                {n.badge ? <span className={clsx("rounded-full px-1.5 text-[11px] font-semibold", n.muted ? "bg-[#eef0f5] text-muted" : "bg-orange text-white")}>{n.badge}</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-purple text-xs font-semibold text-white">R</span>
            <div className="leading-tight">
              <div className="text-[13px] font-semibold text-navy">Rishabh</div>
              <div className="text-[11px] text-muted">Category buyer · Packaging</div>
            </div>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-line bg-white px-8">
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-5 text-muted">
            <TourButton />
            <Link href="/requests" title="4 updates: 3 new requests, 1 approval waiting" className="relative hover:text-purple"><Bell size={19} strokeWidth={1.8} /><span className="absolute -right-1.5 -top-1.5 rounded-full bg-orange px-1 text-[9px] font-semibold text-white">4</span></Link>
            <button type="button" title="Settings" onClick={() => toast("Settings (approval limits, company rules) aren't part of this demo.", "info")} className="hover:text-purple"><Settings size={19} strokeWidth={1.8} /></button>
          </div>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
        <GuidedTour />
      </div>
    </div>
  );
}
