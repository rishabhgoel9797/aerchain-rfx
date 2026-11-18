import clsx from "clsx";
import { Info, ChevronDown } from "lucide-react";
import Link from "next/link";
import type { Status } from "@/lib/fixtures";

/** Small ⓘ icon that explains something on hover. Pure CSS, works everywhere. */
export function InfoTip({ text, side = "bottom", className }: { text: React.ReactNode; side?: "bottom" | "top"; className?: string }) {
  return (
    <span className={clsx("group/tip relative inline-flex align-middle", className)} tabIndex={0}>
      <Info size={14} className="cursor-help text-muted/70 transition-colors group-hover/tip:text-purple" />
      <span
        role="tooltip"
        className={clsx(
          "pointer-events-none invisible absolute left-1/2 z-50 w-64 -translate-x-1/2 rounded-xl bg-navy px-3 py-2.5 text-left text-[12px] font-normal normal-case leading-relaxed tracking-normal text-white opacity-0 shadow-xl transition-opacity group-hover/tip:visible group-hover/tip:opacity-100 group-focus/tip:visible group-focus/tip:opacity-100",
          side === "bottom" ? "top-6" : "bottom-6",
        )}
      >
        {text}
      </span>
    </span>
  );
}

export function Card({ className, children, title, action, subtitle, info, flush }: { className?: string; children: React.ReactNode; title?: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; info?: React.ReactNode; flush?: boolean }) {
  return (
    <section className={clsx("rounded-xl border border-line bg-surface", className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h3 className="flex items-center gap-1.5 text-[14px] font-semibold text-indigo">
              {title}
              {info && <InfoTip text={info} />}
            </h3>
            {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}

export { Button } from "@/components/button";

const PILL: Record<Status | "none" | "info" | "brand", string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  bad: "bg-bad-bg text-bad",
  none: "bg-[#eef0f5] text-muted",
  info: "bg-sky text-navy",
  brand: "bg-tint text-indigo",
};

export function Pill({ tone, children, className, title }: { tone: Status | "none" | "info" | "brand"; children: React.ReactNode; className?: string; title?: string }) {
  return <span title={title} className={clsx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", PILL[tone], className)}>{children}</span>;
}

export function Dot({ tone }: { tone: Status | "none" }) {
  const c = { ok: "bg-ok", warn: "bg-orange", bad: "bg-bad", none: "bg-[#c3c8d4]" }[tone];
  return <span className={clsx("inline-block h-2 w-2 shrink-0 rounded-full", c)} />;
}

export function Stat({ label, value, hint, tone, info }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: Status; info?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-5 py-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
        {info && <InfoTip text={info} />}
      </div>
      <div className={clsx("num mt-1 text-2xl font-semibold", tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : "text-navy")}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function SimBadge() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Pill tone="none">Demo: not actually sent</Pill>
      <InfoTip text="For this prototype, emails and WhatsApp messages are simulated. Everything else, including reading replies and the AI answers, is real." />
    </span>
  );
}

export function AiNote({ children, title = "AI suggestion" }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-purple/15 bg-[linear-gradient(135deg,rgba(90,53,207,0.07),rgba(55,49,146,0.03))] p-4 text-sm text-ink">
      <span className="brand-gradient mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white">AI</span>
      <div className="leading-relaxed">
        <div className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-purple">{title}</div>
        {children}
      </div>
    </div>
  );
}

/** Explains green / amber / red in words. */
export function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      <span className="flex items-center gap-1.5"><Dot tone="ok" /> Green: read correctly</span>
      <span className="flex items-center gap-1.5"><Dot tone="warn" /> Amber: please check</span>
      <span className="flex items-center gap-1.5"><Dot tone="bad" /> Red: must fix before awarding</span>
      <InfoTip text="The AI colours every value by how sure it is. Green means it read the value clearly and it passed all checks. Amber means something is unusual, like a blurry photo or an unclear unit. Red means a real problem, like two different prices for one box. You can't pick a winner while red items remain." />
    </div>
  );
}

/** Collapsible section, like Aerchain's "General Details" / "Scope of Work" blocks. */
export function Section({ title, icon, info, open = true, action, children, count }: { title: React.ReactNode; icon?: React.ReactNode; info?: React.ReactNode; open?: boolean; action?: React.ReactNode; children: React.ReactNode; count?: React.ReactNode }) {
  return (
    <details open={open} className="group/sec rounded-xl border border-line bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-5 py-3.5 [&::-webkit-details-marker]:hidden">
        <ChevronDown size={16} className="text-muted transition-transform group-open/sec:rotate-0 -rotate-90" />
        {icon && <span className="text-purple">{icon}</span>}
        <span className="text-[15px] font-semibold text-indigo">{title}</span>
        {count}
        {info && <InfoTip text={info} />}
        <span className="ml-auto">{action}</span>
      </summary>
      <div className="border-t border-line px-5 py-4">{children}</div>
    </details>
  );
}

/** Read-only field with the label on the border, like Aerchain's form fields. */
export function Field({ label, value, info, missing, className }: { label: string; value: React.ReactNode; info?: React.ReactNode; missing?: boolean; className?: string }) {
  return (
    <div className={clsx("relative rounded-lg border px-3 pb-2 pt-3", missing ? "border-orange/50 bg-[#fffaf4]" : "border-line bg-white", className)}>
      <span className="absolute -top-2 left-2.5 flex items-center gap-1 bg-white px-1 text-[11px] text-muted">
        {label}
        {info && <InfoTip text={info} />}
      </span>
      <div className={clsx("text-[13px]", missing ? "font-semibold text-warn" : "text-ink")}>{value}</div>
    </div>
  );
}

/** Page title block with breadcrumb and actions. */
export function PageHeader({ crumbs, title, subtitle, actions, info, children }: { crumbs?: { label: string; href?: string }[]; title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; info?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="border-b border-line bg-white px-8 pt-5">
      {crumbs && (
        <div className="mb-2 flex items-center gap-1.5 text-[12px]">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-muted">›</span>}
              {c.href ? <Link href={c.href} className="text-muted hover:text-purple">{c.label}</Link> : <span className="font-semibold text-purple">{c.label}</span>}
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-5">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-[22px] font-semibold text-indigo">{title}{info && <InfoTip text={info} />}</h1>
          {subtitle && <div className="mt-1 text-[13px] text-muted">{subtitle}</div>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export type PersonKind = "company" | "buyer" | "supplier";

const PERSON: Record<PersonKind, { label: string; cls: string; info: string }> = {
  company: { label: "Company team", cls: "bg-sky text-[#1f5fbf]", info: "Works at our company (a plant, admin, IT, finance). Raises requests to the buyer team or approves decisions." },
  buyer: { label: "Buyer team", cls: "bg-[#efeafd] text-[#5a35cf]", info: "Procurement team. Runs sourcing events and makes award recommendations." },
  supplier: { label: "Supplier", cls: "bg-[#fff1e6] text-[#b4560b]", info: "Outside company that quotes prices to us." },
};

/** A person's name with a tag saying which side they're on: company team, buyer team, or supplier. */
export function Person({ name, kind, detail, className }: { name: string; kind: PersonKind; detail?: string; className?: string }) {
  const p = PERSON[kind];
  return (
    <span className={clsx("inline-flex flex-wrap items-center gap-1.5", className)}>
      <span>{name}</span>
      <span title={`${p.label}${detail ? " · " + detail : ""}: ${p.info}`} className={clsx("whitespace-nowrap rounded px-1.5 py-px text-[10.5px] font-semibold", p.cls)}>
        {p.label}{detail ? ` · ${detail}` : ""}
      </span>
    </span>
  );
}

/** Table column header with an optional info icon. */
export function Th({ children, info, className, align }: { children?: React.ReactNode; info?: React.ReactNode; className?: string; align?: "right" }) {
  return (
    <th className={clsx("px-3 py-2.5 font-semibold", align === "right" && "text-right", className)}>
      <span className={clsx("inline-flex items-center gap-1", align === "right" && "justify-end")}>{children}{info && <InfoTip text={info} />}</span>
    </th>
  );
}
