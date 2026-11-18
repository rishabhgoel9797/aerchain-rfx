import Link from "next/link";
import { FileSpreadsheet, FileText, Image as ImageIcon, MessageCircle, ArrowRight, BookOpen, Link2, Ruler, ShieldCheck } from "lucide-react";
import { ITEMS, QUOTES, RESPONDERS, aiIssues } from "@/lib/fixtures";
import { quotesFrom, filesFrom, dayOf, fmtDate, isLiveReply } from "@/lib/inbox";
import { FileViewerButton } from "@/components/source-panel";
import { Card, Pill, InfoTip, StatusLegend } from "@/components/ui";

const META: Record<string, { icon: React.ComponentType<{ size?: number; className?: string }>; files: string[]; found: string[] }> = {
  A: { icon: FileSpreadsheet, files: ["SGC_Quotation_FY27.xlsx", "ISO certificate (PDF)"], found: ["Used their own Excel layout. Matched to our 30 boxes.", "Used their own product codes. Mapped to ours.", "Quoted per 100 boxes. Converted to per box."] },
  B: { icon: FileText, files: ["PPW-Q-2611-044.pdf (3 pages)", "Box-strength test report (PDF)"], found: ["Prices in US dollars, including GST.", "Found a 2% discount hidden in the small print on page 3.", "One box has two different prices, and the total doesn't add up."] },
  C: { icon: FileText, files: ["Offer_Letter_OmSai.docx"], found: ["Prices were written inside paragraphs. Pulled them out.", "Offers 5% off only if we give them all 30 boxes.", "Offers a 7-ply box instead of 5-ply for one size.", "Says “yes, we're ISO certified” but sent no certificate."] },
  D: { icon: ImageIcon, files: ["Photo of printed price list (taken at an angle, with pen corrections)"], found: ["Priced 27 of our 30 boxes.", "One price is blurry; one looks 10× too low.", "Their ISO certificate has expired."] },
  E: { icon: MessageCircle, files: ["WhatsApp message, 10 Nov, 7:48 pm", "Phone call note, 11 Nov, 4:12 pm"], found: ["Quoted per kg. Converted to per box using each box's weight.", "Said “rest same as last year”. Found last year's price for 2 of 5 boxes.", "Delivery is extra, so an estimate was added.", "One price was only given on a phone call."] },
};

const STEPS = [
  { icon: BookOpen, t: "Read", d: "Opens any file: Excel, PDF, Word, photo or chat message, including handwriting." },
  { icon: Link2, t: "Match", d: "Matches each line to one of our 30 boxes, even when the supplier uses their own codes." },
  { icon: Ruler, t: "Convert", d: "Converts to ₹ per box, before GST, delivered. Shows every step of the maths." },
  { icon: ShieldCheck, t: "Check", d: "Checks for problems and colours each value green, amber or red." },
];

export function Reading() {
  return (
    <div className="space-y-5">
      <Card title="How the AI reads every reply" info="Every reply goes through the same 4 steps, whatever its format. Nothing is typed in by hand, and every value keeps a link to the exact spot in the original file.">
        <div className="grid grid-cols-4 gap-3">
          {STEPS.map((s, i) => (
            <div key={s.t} className="relative rounded-xl bg-bg p-4">
              <div className="flex items-center gap-2"><span className="brand-gradient grid h-7 w-7 place-items-center rounded-lg text-white"><s.icon size={14} /></span><span className="font-semibold text-navy">{i + 1}. {s.t}</span></div>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-navy">Results for each supplier</h2>
        <StatusLegend />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {RESPONDERS.map((s) => {
          const live = quotesFrom(s.id).some(isLiveReply);
          // A reply added live: show what the AI and the checks actually found, not the demo's prepared notes.
          const m = live ? { ...META[s.id], found: aiIssues(s.id).length ? aiIssues(s.id).map((i) => `${i.title}. ${i.note}`) : ["No problems found by the checks."] } : META[s.id];
          const cells = ITEMS.map((it) => QUOTES[it.id][s.id]);
          const ok = cells.filter((c) => c.status === "ok").length;
          const warn = cells.filter((c) => c.status === "warn").length;
          const bad = cells.filter((c) => c.status === "bad").length;
          const I = m.icon;
          return (
            <Card
              key={s.id}
              title={<span className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-md bg-tint text-xs">{s.code}</span>{s.name}</span>}
              subtitle={live ? "Updated reply, read live by QuoteLens" : `Sent: ${s.format}`}
              info={`How the AI read ${s.name}'s reply: what files they sent, what it found, and how many of the 30 prices it's sure about.`}
              action={<I size={20} className="text-indigo" />}
            >
              <div className="mb-1.5 flex items-center justify-between text-[12px] text-muted">
                <span className="flex items-center gap-1">30 box prices <InfoTip text="Green = read correctly. Amber = please check. Red = must be fixed before you can pick a winner." /></span>
                <span>{ok} green · {warn} amber{bad ? ` · ${bad} red` : ""}</span>
              </div>
              <div className="mb-4 flex h-2.5 overflow-hidden rounded-full bg-line">
                <div className="bg-ok" style={{ width: `${(ok / 30) * 100}%` }} />
                <div className="bg-orange" style={{ width: `${(warn / 30) * 100}%` }} />
                <div className="bg-bad" style={{ width: `${(bad / 30) * 100}%` }} />
              </div>
              <div className="mb-3">
                <div className="mb-1 text-[11px] text-muted">{quotesFrom(s.id).map((q) => `${q.kind === "Price on a call" ? "Call" : q.channel} on ${fmtDate(q.received_at)} (day ${dayOf(q.received_at)})`).join(" · ")}</div>
                <div className="flex flex-wrap gap-1">{filesFrom(s.id).map((f) => <FileViewerButton key={f} file={f} chip />)}</div>
              </div>
              <div className="border-t border-line pt-3">
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">What the AI found</div>
                <ul className="space-y-1.5 text-[13px] text-ink">
                  {m.found.map((f) => <li key={f} className="flex gap-2"><span className="text-purple">•</span>{f}</li>)}
                </ul>
              </div>
              {warn + bad > 0 && (
                <div className="mt-4 flex justify-end">
                  <Link href="/events/RFQ-2026-014/check" className="flex items-center gap-1 text-[13px] font-semibold text-purple">Check {warn + bad} flagged {warn + bad === 1 ? "value" : "values"} <ArrowRight size={13} /></Link>
                </div>
              )}
            </Card>
          );
        })}
        <Card title={<span className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-md bg-tint text-xs">F</span>Doon Corrupack</span>} subtitle="Did not reply" info="Suppliers who don't reply are never given a guessed price.">
          <p className="text-sm text-muted">Nothing to read. Their prices are never guessed. They appear as “No reply” in every comparison.</p>
          <Pill tone="none" className="mt-3">No reply</Pill>
        </Card>
      </div>
    </div>
  );
}
