import { CheckCircle2, Circle, Mail, FileText, AlertTriangle, Star, Lock } from "lucide-react";
import seed from "@/data/seed.json";
import { RESPONDERS, SUPPLIERS, QUOTES, ITEMS, QUALITY_RESULT, ANSWERS, crore, lakh } from "@/lib/fixtures";
import { splitAward, bestSingleSupplier, priceGaps, changeVsLastYear, performance } from "@/lib/analysis";
import { Card, Pill, Button, AiNote, SimBadge, Stat, InfoTip, Person } from "@/components/ui";
import { openCheckCounts } from "@/lib/check-state";
import { SubmitForApproval } from "@/components/approval-actions";

type Row = Record<string, string | number>;
const M = seed.master as unknown as Record<string, Row[]>;
const K = seed.answerKey as unknown as Record<string, Row[]>;
const byRole = (role: string) => String(M.people.find((p) => p.role === role)?.name ?? role);
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/* ---------- 8. Negotiate ---------- */
export function Negotiation() {
  const top = priceGaps().slice(0, 8);
  const change = changeVsLastYear();
  const list = top.map((g) => g.id).join(", ");
  return (
    <div className="grid grid-cols-[1fr_420px] gap-5">
      <div className="space-y-5">
        <AiNote>
          The middle quote per box is on average <b>{change >= 0 ? `${change.toFixed(1)}% higher` : `${Math.abs(change).toFixed(1)}% lower`} than last year&apos;s contract price</b>. I suggest a best-and-final round on the <b>8 boxes with the biggest price gaps</b>: {list}. If every supplier matched the lowest quote on these, the gap is worth up to <b>{lakh(top.reduce((a, g) => a + g.saving, 0))}</b> a year.
        </AiNote>
        <Card title="Boxes worth negotiating" info="Gap = (highest − lowest green price) ÷ lowest price, for each box. Only prices marked green are used.">
          <div className="grid grid-cols-4 gap-2">
            {top.map((g) => {
              const it = ITEMS.find((i) => i.id === g.id)!;
              return (
                <div key={g.id} className="rounded-lg bg-bg p-3 text-[12px]">
                  <div className="font-semibold text-navy">{g.id} · {it.ply}-ply</div>
                  <div className="text-muted">{it.use}</div>
                  <div className="mt-1 font-semibold text-warn">{g.gap}% gap</div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Best and final round" subtitle="Same message and deadline for everyone" info="All suppliers get the same request at the same time. We never tell a supplier what anyone else quoted. New prices are read and checked again, just like the first quotes.">
          <div className="space-y-2">
            {RESPONDERS.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-sm">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-tint text-xs font-bold text-indigo">{s.code}</span>
                <span className="flex-1 font-semibold text-navy"><Person name={s.name} kind="supplier" /></span>
                <Pill tone="none">Not sent yet</Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card title="Message to all suppliers" info="Written by the AI from the gap analysis. Edit it before sending if you like." action={<SimBadge />}>
        <div className="space-y-3 text-sm leading-relaxed">
          <p>Thank you for your quotation for RSG Herbal House&apos;s FY27 corrugated box contract.</p>
          <p>We invite your <b>best and final price</b> for boxes {list} by <b>19 Nov, 6 pm</b>. Other boxes stay as quoted unless you choose to revise them.</p>
          <p>Regards,<br />Rishabh, RSG Herbal House</p>
        </div>
        <Button className="mt-4 w-full" toast={`Best-and-final request sent to all ${RESPONDERS.length} suppliers with the same deadline (simulated).`}>Send to all {RESPONDERS.length} suppliers</Button>
      </Card>
    </div>
  );
}

/* ---------- 9.1 Pick winner ---------- */
export function Award() {
  const rec = splitAward();
  const withFailed = splitAward({ includeFailed: true });
  const single = bestSingleSupplier();
  const { bad: redLeft } = openCheckCounts();
  const saving = single ? single.total - rec.total : 0;
  const failed = RESPONDERS.filter((s) => QUALITY_RESULT[s.id].status === "bad");
  const failedWins = withFailed.allocations.filter((a) => failed.some((f) => f.id === a.id));
  const validity = K.quote_terms.filter((t) => rec.allocations.some((a) => a.id === t.supplier_id) && t.valid_until).sort((a, b) => String(a.valid_until).localeCompare(String(b.valid_until)))[0];
  const hop = byRole("Head of Procurement"), cfo = byRole("CFO");
  const needsCfo = rec.total > 1e7;
  // Om Sai: what their like-for-like boxes cost vs the same boxes in the split
  const cItems = ITEMS.filter((it) => QUOTES[it.id].C.value != null && QUOTES[it.id].C.kind !== "alternative" && QUOTES[it.id].C.status !== "bad");
  const cTotal = cItems.reduce((a, it) => a + QUOTES[it.id].C.value! * it.qty * 0.95, 0);
  const splitSame = cItems.reduce((a, it) => { const w = rec.allocations.find((x) => x.items.includes(it.id)); return a + (w ? QUOTES[it.id][w.id].value! * it.qty : 0); }, 0);
  const tr = (id: string) => M.supplier_track_record.find((r) => r.supplier_id === id);

  return (
    <div className="space-y-5">
      {redLeft > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-bad/25 bg-bad-bg px-5 py-3 text-sm text-bad">
          <Lock size={16} /> <span><b>{redLeft} red items</b> are still open in the Check tab. This recommendation is a preview: it can be sent for approval once they&apos;re fixed or left out with a reason.</span>
        </div>
      )}
      <div className="grid grid-cols-4 gap-4">
        <Stat label="Recommended award" value={crore(rec.total)} hint={`Split across ${rec.allocations.length} suppliers`} info="Cheapest supplier for each box, leaving out suppliers who failed quality and prices still marked red. Calculated from the comparison." />
        <Stat label="Saving" value={single ? lakh(saving) : "—"} hint={single ? `vs ${single.name} for all 30` : "No single supplier priced all 30"} tone="ok" info="Compared with the cheapest single supplier who priced all 30 boxes like-for-like and didn't fail quality." />
        <Stat label="Red items left" value={redLeft} hint={redLeft ? "Fix before sending" : "Ready to send"} tone={redLeft ? "bad" : undefined} info="A winner can only be picked once every red item is fixed or left out with a reason." />
        <Stat label="Prices valid until" value={validity ? fmtDate(String(validity.valid_until)) : "—"} hint={validity ? `${SUPPLIERS.find((s) => s.id === validity.supplier_id)?.name} expires first` : ""} tone="warn" info="If approval takes longer than this, the AI asks suppliers to reconfirm their prices." />
      </div>
      <div className="grid grid-cols-[1fr_400px] gap-5">
        <Card
          title="Recommended award"
          subtitle="Cheapest like-for-like price per box, among suppliers who didn't fail quality"
          info="You can change any part of this. If you go against the recommendation, you'll be asked for a short reason, which is saved."
          action={redLeft ? <Button variant="secondary" toast={`Fix the ${redLeft} red items in the Check tab first.`}>Send for approval</Button> : <SubmitForApproval id="APR-219" value={rec.total} waitingOn={hop} detail={needsCfo ? `Head of Procurement, then ${cfo} (CFO, above ₹1 Cr)` : "Head of Procurement"} note={`Split across ${rec.allocations.length} suppliers${single ? `, saves ${lakh(saving)} vs ${single.name} for all 30` : ""}.`} />}
        >
          <div className="space-y-3">
            {rec.allocations.map((a) => {
              const flag = QUALITY_RESULT[a.id];
              return (
                <div key={a.id} className="rounded-xl border border-line p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-tint text-sm font-bold text-indigo">{a.id}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-navy"><Person name={a.name} kind="supplier" /></div>
                      <div className="text-[12px] text-muted">{a.items.length} box sizes: {a.items.join(", ")}</div>
                    </div>
                    <div className="text-right">
                      <div className="num text-lg font-semibold text-navy">{crore(a.value)}</div>
                      <Pill tone={flag.status}>Quality: {flag.label}</Pill>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-line"><div className="brand-gradient h-full rounded-full" style={{ width: `${(a.value / rec.total) * 100}%` }} /></div>
                </div>
              );
            })}
            {rec.uncovered.length > 0 && <div className="rounded-lg bg-bg px-3 py-2 text-[12px] text-muted">No usable price yet for: {rec.uncovered.join(", ")}</div>}
          </div>
          {failedWins.length > 0 && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-warn-bg p-3 text-[13px] text-warn">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span><b>Trade-off:</b> including {failedWins.map((f) => f.name).join(", ")} would save another {lakh(rec.total - withFailed.total)} ({failedWins.map((f) => `${f.items.length} boxes`).join(", ")}), but they failed the quality check{failedWins.map((f) => (tr(f.id) ? ` and delivered on time only ${tr(f.id)!.on_time_pct}% last year` : "")).join("")}.</span>
            </div>
          )}
        </Card>
        <div className="space-y-5">
          <Card title="Why this decision" info="Written by the AI for your approver from the numbers on this page. Every number links back to the original quote." action={<FileText size={16} className="text-muted" />}>
            <div className="space-y-2 text-[13px] leading-relaxed text-ink">
              <p>Splitting the order between {rec.allocations.map((a) => a.name).join(", ")} costs {crore(rec.total)} a year{single ? `, ${lakh(saving)} less than giving all 30 boxes to ${single.name}` : ""}.</p>
              {failed.map((f) => <p key={f.id}><b>Why not {f.name}?</b> {ANSWERS[f.id].filter((a) => a.status === "bad").map((a) => a.note).join("; ")}.</p>)}
              {cItems.length > 0 && <p><b>Why not Om Sai for everything?</b> They priced {cItems.length} of 30 boxes like-for-like. With their 5% all-items discount those boxes cost {crore(cTotal)}, against {crore(splitSame)} for the same boxes in the split.</p>}
              {rec.allocations.some((a) => a.id === "E") && <p><b>Watch:</b> Mahalaxmi hasn&apos;t answered the quality questions and one price was given only on a call. Get both in writing before the order.</p>}
            </div>
          </Card>
          <Card title="Approvals" info="From company rules: above ₹25 lakh the Head of Procurement approves; above ₹1 crore the CFO also approves.">
            <ol className="space-y-3 text-[13px]">
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-ok" /> <Person name="Rishabh" kind="buyer" /> recommends</li>
              <li className="flex items-center gap-2"><Circle size={16} className="text-muted" /> <Person name={hop} kind="buyer" detail="Head of Procurement" /></li>
              {needsCfo && <li className="flex items-center gap-2"><Circle size={16} className="text-muted" /> <Person name={cfo} kind="company" detail="CFO, needed above ₹1 Cr" /></li>}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------- 9.2 Notify & order ---------- */
export function Close() {
  const rec = splitAward();
  const winners = rec.allocations;
  const losers = SUPPLIERS.filter((s) => s.invited && !winners.some((w) => w.id === s.id));
  return (
    <div className="grid grid-cols-[1fr_380px] gap-5">
      <Card title="Messages to suppliers" info="Winners get an award letter. Others get a polite regret with general feedback. We never share another supplier's exact prices." action={<SimBadge />}>
        <div className="space-y-2">
          {winners.map((w) => (
            <div key={w.id} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-sm">
              <Mail size={15} className="text-indigo" />
              <span className="w-64 shrink-0 font-semibold text-navy"><Person name={w.name} kind="supplier" /></span>
              <span className="flex-1 text-ink">Award letter for {w.items.length} box sizes{w.id === "E" ? ". Asked to confirm the phone price and quality answers in writing." : ""}</span>
              <Pill tone={w.id === "E" ? "warn" : "ok"}>Award</Pill>
            </div>
          ))}
          {losers.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-sm">
              <Mail size={15} className="text-indigo" />
              <span className="w-64 shrink-0 font-semibold text-navy"><Person name={s.name} kind="supplier" /></span>
              <span className="flex-1 text-ink">Regret: {s.id === "F" ? "no quotation received" : QUALITY_RESULT[s.id]?.status === "bad" ? "“did not meet our quality requirements”" : "“your prices were higher on most boxes”"}</span>
              <Pill tone="none">Regret</Pill>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Purchase orders" info="Ready to be created in RSG Herbal House's purchasing system. That connection isn't part of this demo.">
        <div className="space-y-3 text-sm">
          {winners.map((w, i) => (
            <div key={w.id} className="flex items-center justify-between rounded-xl bg-bg px-3 py-2.5">
              <span><span className="font-semibold text-navy">PO-{88120 + i} · {w.name}</span><span className="block text-[12px] text-muted">{w.items.length} sizes · {crore(w.value)} a year</span></span>
              <Pill tone="info">Ready</Pill>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------- 10. After delivery ---------- */
export function Learn() {
  const perf = performance();
  return (
    <div className="grid grid-cols-2 gap-5">
      <Card title="How suppliers performed last year" info="From supplier_track_record.csv: on-time %, rejected deliveries and invoice mismatches, turned into a simple 1–5 rating. Shown whenever you consider inviting them.">
        <div className="space-y-3">
          {perf.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-sm">
              <span className="flex-1"><span className="block font-semibold text-navy"><Person name={p.name} kind="supplier" /></span><span className="text-[12px] text-muted">{p.year}: {p.notes}</span></span>
              <span className="flex items-center gap-1">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} className={i < p.stars ? "fill-orange text-orange" : "text-line"} />)}</span>
            </div>
          ))}
        </div>
      </Card>
      <div className="space-y-5">
        <AiNote>Next year, when a supplier writes <b>“same as last year”</b>, the AI will already know the exact price for every box.</AiNote>
        <Card title="Saved for next time" info="Everything from this event is kept, so the next one starts smarter.">
          <ul className="space-y-2 text-sm text-ink">
            <li>• Final prices for all 30 boxes, for every supplier</li>
            <li>• Every correction you made, and why</li>
            <li>• Delivery and quality record for each supplier</li>
            <li>• The award decision, reasons and approvals</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
