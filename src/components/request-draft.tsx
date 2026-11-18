import { AlertTriangle, Info, Sparkles } from "lucide-react";
import { Card, InfoTip, Pill } from "@/components/ui";
import { FileViewerButton } from "@/components/source-panel";
import { HISTORY, type EventRow, type InternalRequest } from "@/lib/portfolio";
import { itemListFile } from "@/lib/request-files";
import { currentDraft } from "@/lib/draft";

const fmtQty = (n: number) => n.toLocaleString("en-IN");

/**
 * Draft request for quotes for a new sourcing event, built from the team request it came from:
 * the AI's reading of the request, the item list from their attachment, and suggested terms
 * copied from the last boxes request. The buyer checks it; nothing is sent from here.
 */
export async function RequestDraft({ ev, req }: { ev: EventRow; req: InternalRequest }) {
  const file = itemListFile(req.id);
  const draft = await currentDraft(ev, req);
  const lines = draft.lines;
  const matched = lines.filter((l) => l.code).length;
  const total = lines.reduce((s, l) => s + l.qty, 0);
  const missing = req.understood.filter((u) => u.missing);
  const aiRead = [...HISTORY].reverse().find((h) => new RegExp(`^Read request ${req.id} with (Claude|QuoteLens AI)`).test(h.what));
  // Compare the list's total with the quantity written in the message ("Approx 4 lakh boxes"). Done by code.
  const said = (() => { const m = (req.message).match(/([\d.]+)\s*(lakh|lac|crore|k|thousand)?\s*(boxes|pcs|units|nos)/i); if (!m) return 0; const n = Number(m[1]); const u = (m[2] ?? "").toLowerCase(); return n * (u.startsWith("la") ? 1e5 : u === "crore" ? 1e7 : u === "k" || u === "thousand" ? 1e3 : 1); })();
  const qtyGap = said && total ? Math.abs(total - said) / said : 0;
  const lakhs = (n: number) => `${(n / 1e5).toLocaleString("en-IN", { maximumFractionDigits: 2 })} lakh`;
  const changedCount = draft.terms.filter((t) => t.changed).length + lines.filter((l) => l.changed || l.added).length + draft.questions.filter((q) => q.added).length;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 rounded-xl bg-tint px-4 py-3 text-[13px] text-ink">
        <Sparkles size={15} className="mt-0.5 shrink-0 text-purple" />
        <span>
          Drafted from <b>{req.id}</b>: {req.from}&apos;s message{file ? <>, and the item list they attached</> : ""}. Terms and quality questions are copied from the last boxes request.
          {" "}Check it, change anything below, then send it to suppliers.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
        <Card
          title="Your request (draft)"
          subtitle={lines.length ? `${lines.length} items · about ${fmtQty(total)} a year${changedCount ? ` · ${changedCount} change${changedCount === 1 ? "" : "s"} by you in orange` : ` · from ${req.from}'s list`}` : "Items from the request"}
          info="This is what suppliers will receive. Built from the team's request: their own item list where they attached one. Nothing is sent until you approve it."
          action={file ? <span className="text-[12px]"><FileViewerButton file={file} label="Their list" /></span> : undefined}
        >
          <div className="mb-4 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
            {draft.terms.map((t) => (
              <div key={t.key} className={`rounded-xl px-3 py-2 ${t.changed ? "bg-orange/10 ring-1 ring-orange/40" : "bg-bg"}`}>
                <div className="flex items-center gap-1 text-[11px] font-semibold uppercase text-muted">{t.label} <InfoTip text={t.info} /></div>
                <div className="font-semibold text-navy">{t.value}</div>
              </div>
            ))}
          </div>

          {lines.length ? (
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full text-[13px]">
                <thead className="bg-bg text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Size (mm)</th>
                    <th className="px-3 py-2">Ply</th>
                    {lines.some((l) => l.note) && <th className="px-3 py-2">Used for</th>}
                    <th className="px-3 py-2 text-right">Qty / year</th>
                    <th className="px-3 py-2"><span className="inline-flex items-center gap-1">Our code <InfoTip text="Matched to your existing item list by size and ply. 'New size' means you haven't bought this box before, so there's no past price to compare." /></span></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.n} className={`border-t border-line ${l.added ? "bg-orange/10" : ""}`}>
                      <td className="px-3 py-1.5 text-muted">{l.n}</td>
                      <td className="num whitespace-nowrap px-3 py-1.5 text-ink">{l.size}</td>
                      <td className="px-3 py-1.5">{l.ply ?? "—"}</td>
                      {lines.some((x) => x.note) && <td className="px-3 py-1.5 text-[12px] text-muted">{l.note ?? ""}</td>}
                      <td className={`num px-3 py-1.5 text-right ${l.changed ? "font-semibold text-orange" : ""}`}>{fmtQty(l.qty)}</td>
                      <td className="px-3 py-1.5">{l.added ? <Pill tone="warn">Added by you</Pill> : l.code ? <span className="font-semibold text-indigo">{l.code}</span> : <Pill tone="warn">New size</Pill>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-2">
              {req.understood.filter((u) => !u.missing).map((u) => (
                <div key={u.label} className="flex gap-3 rounded-lg bg-bg px-3 py-2 text-[13px]"><span className="w-28 shrink-0 text-muted">{u.label}</span><span className="font-semibold text-navy">{u.value}</span></div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card title="What the AI took from the request" subtitle={aiRead ? `Read by QuoteLens AI on ${aiRead.when} · ${aiRead.what.match(/in [\d.]+ s$/)?.[0] ?? ""}` : "Details on file from when the request arrived"} info={aiRead ? `QuoteLens AI read ${req.from}'s message and every attached file. ${aiRead.what}` : "The details saved when the request arrived."}>
            <div className="space-y-2 text-[13px]">
              {req.understood.map((u) => (
                <div key={u.label} className={`rounded-lg px-3 py-2 ${u.missing ? "bg-orange/10" : "bg-bg"}`}>
                  <div className="text-[11px] font-semibold uppercase text-muted">{u.label}</div>
                  <div className="font-semibold text-navy">{u.value}</div>
                  <div className="text-[11.5px] text-muted">{u.info}</div>
                </div>
              ))}
              {lines.length > 0 && (
                <div className="rounded-lg bg-bg px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase text-muted">Matched to your items</div>
                  <div className="font-semibold text-navy">{matched} of {lines.length} sizes</div>
                  <div className="text-[11.5px] text-muted">{lines.length - matched} new {lines.length - matched === 1 ? "size has" : "sizes have"} no past price.</div>
                </div>
              )}
            </div>
          </Card>

          {(missing.length > 0 || req.checks.length > 0 || qtyGap > 0.1) && (
            <Card title="Before you send" info="Gaps in the request and things worth knowing, found by the AI.">
              <div className="space-y-2 text-[13px]">
                {qtyGap > 0.1 && <div className="flex gap-2"><AlertTriangle size={14} className="mt-0.5 shrink-0 text-orange" /><span><b>Quantities don&apos;t add up.</b> The attached list totals {lakhs(total)} boxes a year, but the message says about {lakhs(said)}. Worth confirming with {req.from} before suppliers price it.</span></div>}
                {missing.map((m) => <div key={m.label} className="flex gap-2"><AlertTriangle size={14} className="mt-0.5 shrink-0 text-orange" /><span><b>{m.label}</b> not given. {m.info}</span></div>)}
                {req.checks.map((c) => <div key={c.title} className="flex gap-2"><Info size={14} className="mt-0.5 shrink-0 text-purple" /><span><b>{c.title}.</b> {c.body}</span></div>)}
              </div>
            </Card>
          )}
        </div>
      </div>

      {draft.questions.length > 0 && (
        <Card title="Quality questions" subtitle={draft.isBoxes ? "Copied from the last boxes request · suppliers attach proof" : "Added by you"} info="Every supplier answers the same questions, so answers can be compared.">
          <ol className="space-y-1.5 text-sm">{draft.questions.map((q, i) => <li key={i} className={`flex gap-2 ${q.added ? "rounded-md bg-orange/10 px-1" : ""}`}><span className="text-muted">{i + 1}.</span>{q.text}{q.added && <Pill tone="warn" className="ml-1">Added by you</Pill>}</li>)}</ol>
        </Card>
      )}
    </div>
  );
}
