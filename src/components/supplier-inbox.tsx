"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Mail, MessageCircle, Paperclip, Phone, Send, Sparkles, X, AlertTriangle } from "lucide-react";
import { Button, toast } from "@/components/button";
import { InfoTip, Pill } from "@/components/ui";
import { FileViewerButton } from "@/components/source-panel";
import { goWhenReady } from "@/lib/go-when-ready";

export type InboxRow = {
  id: string; supplierId: string; supplier: string; channel: string; at: string; when: string; kind: string;
  subject: string; snippet: string; files: string[]; live: boolean;
  status?: "reading" | "read" | "failed"; summary?: { green: number; amber: number; red: number; notQuoted: number; issues: string[]; secs: number }; error?: string;
};

const CH = { Email: Mail, WhatsApp: MessageCircle, Phone: Phone } as Record<string, typeof Mail>;

/** Next steps after a reply is read: what to look at, straight from the result. */
function NextSteps({ r, eventId }: { r: InboxRow; eventId: string }) {
  const s = r.summary!;
  const flagged = s.amber + s.red;
  return (
    <div className="mt-2 rounded-xl border border-ok/25 bg-ok-bg/50 px-3 py-2.5 text-[12.5px] text-ink">
      <div className="flex flex-wrap items-center gap-1.5">
        <CheckCircle2 size={14} className="text-ok" /><b>Read by QuoteLens in {s.secs} s:</b>
        <Pill tone="ok">{s.green} green</Pill>{s.amber > 0 && <Pill tone="warn">{s.amber} amber</Pill>}{s.red > 0 && <Pill tone="bad">{s.red} red</Pill>}
        {s.notQuoted > 0 && <span className="text-muted">({s.notQuoted} not quoted)</span>}
      </div>
      {s.issues.length > 0 && <ul className="mt-1 list-disc pl-5 text-[12px] text-muted">{s.issues.map((i) => <li key={i}>{i}</li>)}</ul>}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Next</span>
        {flagged > 0 && <a href={`/events/${eventId}/check?sup=${r.supplierId}`} className="inline-flex items-center gap-1 rounded-lg bg-purple px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-[#1f6fd8]">Check {flagged} flagged value{flagged === 1 ? "" : "s"} <ArrowRight size={12} /></a>}
        <a href={`/events/${eventId}/compare`} className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-[12px] font-semibold text-ink hover:border-purple/40">See it in Compare <ArrowRight size={12} /></a>
        <a href={`/events/${eventId}/ask`} className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-[12px] font-semibold text-ink hover:border-purple/40"><Sparkles size={12} className="text-purple" /> Ask AI what changed</a>
      </div>
    </div>
  );
}

/** Reading in progress: polls the status, then refreshes the page so Compare, Check and Ask AI use the new prices. */
function Reading({ r, eventId, onDone }: { r: InboxRow; eventId: string; onDone: (x: Partial<InboxRow>) => void }) {
  const [secs, setSecs] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const tick = setInterval(() => setSecs((x) => x + 1), 1000);
    const poll = setInterval(async () => {
      try {
        const j = await (await fetch(`/api/replies?id=${encodeURIComponent(r.id)}&event=${eventId}`, { cache: "no-store" })).json();
        if (j.status === "read" || j.status === "failed") {
          clearInterval(poll); clearInterval(tick);
          done.current({ status: j.status, summary: j.summary, error: j.error });
          if (j.status === "read") { toast(`New reply from ${r.supplier} read. Next steps are in the inbox.`); goWhenReady(window.location.pathname, {}); }
        }
      } catch { /* server busy: keep polling */ }
    }, 2000);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [r.id, r.supplier, eventId]);
  return (
    <div className="mt-2 flex items-center gap-2 rounded-xl bg-tint px-3 py-2 text-[12.5px] text-ink">
      <Loader2 size={14} className="animate-spin text-purple" /> <b>QuoteLens is reading this reply… {secs} s</b>
      <span className="text-muted">Usually 20 to 60 s: every line read, matched to the items asked for, converted to the same basis, checked.</span>
    </div>
  );
}

export function SupplierInbox({ eventId = "RFQ-2026-014", eventName = "", address, rows: initial, suppliers }: { eventId?: string; eventName?: string; address: string; rows: InboxRow[]; suppliers: { id: string; name: string }[] }) {
  const [rows, setRows] = useState(initial);
  const [compose, setCompose] = useState(false);
  const [sid, setSid] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [replaces, setReplaces] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const send = async () => {
    if (!sid) { toast("Pick who the email is from.", "info"); return; }
    if (!body.trim() && !files.length) { toast("Write the email or attach their file.", "info"); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("event", eventId); fd.append("supplier", sid); fd.append("subject", subject); fd.append("text", body); fd.append("replaces", replaces ? "yes" : "no");
      files.forEach((f) => fd.append("files", f));
      const res = await fetch("/api/replies", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) { toast(j.error ?? "Couldn't deliver the email.", "info"); return; }
      const sup = suppliers.find((s) => s.id === sid)!;
      setRows((x) => [{ id: j.id, supplierId: sid, supplier: sup.name, channel: "Email", at: new Date().toISOString(), when: "Just now", kind: replaces ? "Updated quote" : "Quote", subject: subject || `RE: ${eventId} ${eventName}`, snippet: body.slice(0, 160), files: [], live: true, status: "reading" }, ...x]);
      setCompose(false); setSid(""); setSubject(""); setBody(""); setFiles([]);
    } catch {
      toast("Couldn't reach the app server. Is it still running?", "info");
    } finally {
      setBusy(false);
    }
  };

  const shown = showAll ? rows : rows.slice(0, 6);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-bg px-4 py-2.5 text-[12.5px]">
        <span className="flex items-center gap-1.5 text-ink"><Mail size={14} className="text-purple" /> Suppliers reply to <b className="font-mono text-[12px]">{address}</b>
          <InfoTip text="Each sourcing event has its own reply address, so replies land on the right event. Email delivery is simulated in this demo; reading every reply is real." />
        </span>
        {!compose && <Button variant="secondary" onClick={() => setCompose(true)}><Send size={13} /> Simulate an incoming email</Button>}
      </div>

      {compose && (
        <div className="rounded-2xl border border-[#d9dcf5] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-indigo">
            <Mail size={16} className="text-purple" /> New email to {address}
            <InfoTip text="Play the supplier: write their email and attach whatever they'd send (Excel, PDF, Word, a photo). When you press Send it arrives in this inbox and QuoteLens reads it straight away." />
            <button onClick={() => setCompose(false)} className="ml-auto text-muted hover:text-ink" aria-label="Close"><X size={16} /></button>
          </div>
          <div className="grid gap-2 text-[13px]">
            <label className="flex items-center gap-2"><span className="w-16 text-muted">From</span>
              <select value={sid} onChange={(e) => setSid(e.target.value)} disabled={busy} className="flex-1 rounded-lg border border-line bg-white px-2.5 py-1.5 outline-none focus:border-purple">
                <option value="">Pick supplier…</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2"><span className="w-16 text-muted">Subject</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={busy} placeholder={`RE: ${eventId} ${eventName} - Quotation`} className="flex-1 rounded-lg border border-line px-2.5 py-1.5 outline-none focus:border-purple" />
            </label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} disabled={busy} rows={4} placeholder="Dear Rishabh ji, please find our revised rates attached…  (or paste their WhatsApp / email text)" className="w-full resize-y rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-purple" />
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileRef} type="file" multiple accept=".xlsx,.docx,.pdf,.jpg,.jpeg,.png,.txt" className="hidden" onChange={(e) => { const n = Array.from(e.target.files ?? []); if (n.length) setFiles((x) => [...x, ...n].slice(0, 6)); e.target.value = ""; }} />
              <Button variant="secondary" disabled={busy} onClick={() => fileRef.current?.click()}><Paperclip size={13} /> Attach</Button>
              {files.map((f, i) => (
                <span key={f.name + i} className="flex items-center gap-1 rounded-md border border-line bg-bg px-2 py-1 text-[12px]">{f.name}
                  <button onClick={() => setFiles((x) => x.filter((_, k) => k !== i))} className="text-muted hover:text-ink" aria-label="Remove"><X size={12} /></button>
                </span>
              ))}
              <label className="ml-1 flex items-center gap-1.5 text-[12px] text-ink">
                <input type="checkbox" checked={replaces} onChange={(e) => setReplaces(e.target.checked)} className="accent-[#5a35cf]" /> Replaces their earlier quote
                <InfoTip text="Usually yes: a revised quote replaces the old one (their certificates are kept). Untick only if this email adds to their earlier quote." />
              </label>
              <div className="ml-auto"><Button disabled={busy} onClick={send}>{busy ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Send size={14} /> Send</>}</Button></div>
            </div>
          </div>
        </div>
      )}

      {rows.length === 0 && <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[13px] text-muted">No replies yet. When a supplier replies to {address}, it appears here and QuoteLens reads it straight away. Use <b>Simulate an incoming email</b> to play a supplier.</div>}
      <div className={`divide-y divide-line overflow-hidden rounded-xl border border-line bg-white ${rows.length ? "" : "hidden"}`}>
        {shown.map((r) => {
          const I = CH[r.channel] ?? Mail;
          return (
            <div key={r.id} className={`px-4 py-3 ${r.live ? "bg-[#fbfaff]" : ""}`}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tint text-[12px] font-bold text-indigo">{r.supplierId}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    <b className="text-navy">{r.supplier}</b>
                    <span className="flex items-center gap-1 text-[11.5px] text-muted"><I size={12} /> {r.channel}</span>
                    {r.live && <Pill tone="brand">New</Pill>}
                    <Pill tone={/quote/i.test(r.kind) && !/superseded/i.test(r.kind) ? "ok" : /superseded/i.test(r.kind) ? "none" : r.kind === "Unread email" ? "bad" : "info"}>{/superseded/i.test(r.kind) ? "Replaced by a newer quote" : r.kind}</Pill>
                    <span className="ml-auto whitespace-nowrap text-[12px] text-muted">{r.when}</span>
                  </div>
                  <div className="truncate text-[13px] font-semibold text-ink">{r.subject}</div>
                  {r.snippet && <div className="line-clamp-2 text-[12.5px] text-muted">{r.snippet}</div>}
                  {r.files.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{r.files.map((f) => <FileViewerButton key={f} file={f} chip />)}</div>}
                  {r.status === "reading" && <Reading r={r} eventId={eventId} onDone={(x) => setRows((all) => all.map((y) => (y.id === r.id ? { ...y, ...x } : y)))} />}
                  {r.status === "read" && r.summary && <NextSteps r={r} eventId={eventId} />}
                  {r.status === "failed" && <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-bad-bg px-3 py-2 text-[12.5px] text-bad"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> QuoteLens couldn&apos;t read this email{r.error ? ` (${r.error})` : ""}. Their earlier quote is still used. Open the attachment and check it, or ask them to resend.</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {rows.length > 6 && <button onClick={() => setShowAll((x) => !x)} className="text-[12.5px] font-semibold text-purple">{showAll ? "Show fewer" : `Show all ${rows.length} messages`}</button>}
    </div>
  );
}
