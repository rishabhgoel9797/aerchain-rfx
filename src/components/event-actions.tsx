"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, Ban, Loader2, Mail, MessageCircle, Send } from "lucide-react";
import { Button, toast } from "@/components/button";
import { InfoTip, Pill } from "@/components/ui";
import { goWhenReady } from "@/lib/go-when-ready";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.ok) throw new Error(j.error ?? "Something went wrong.");
  return j;
}

/** "Approve and choose suppliers" at the end of the draft. Saves the approval, then opens the Suppliers step. */
export function ApproveDraft({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await post("/api/events/approve", { id });
          await goWhenReady(`/events/${id}/suppliers`, { event: id, stage: "suppliers" });
        } catch (e) {
          toast((e as Error).message, "info");
          setBusy(false);
        }
      }}
    >
      {busy ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <>Approve and choose suppliers <ArrowRight size={14} /></>}
    </Button>
  );
}

export type PickSupplier = {
  id: string; name: string; city: string; status: string; channel: string; contact: string;
  onTime?: number; share?: number; warning?: string; blocked?: string; suggested: boolean;
};

/** Choose who receives the request, then send it. Sending is simulated; who was invited is saved. */
export function SupplierPicker({ id, suppliers, deadline, min, address }: { id: string; suppliers: PickSupplier[]; deadline: string; min: number; address?: string }) {
  const [on, setOn] = useState<Set<string>>(new Set(suppliers.filter((s) => s.suggested).map((s) => s.id)));
  const [busy, setBusy] = useState(false);
  const n = on.size;
  const toggle = (sid: string) => setOn((x) => { const y = new Set(x); if (y.has(sid)) y.delete(sid); else y.add(sid); return y; });

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        {suppliers.map((s) => {
          const disabled = !!s.blocked;
          const checked = on.has(s.id);
          const C = s.channel === "WhatsApp" ? MessageCircle : Mail;
          return (
            <label key={s.id} className={`flex items-start gap-3 border-b border-line px-4 py-3 last:border-0 ${disabled ? "cursor-not-allowed bg-bg/60 opacity-70" : "cursor-pointer hover:bg-bg"}`}>
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[#5a35cf]" checked={checked} disabled={disabled} onChange={() => toggle(s.id)} aria-label={`Invite ${s.name}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-navy">
                  {s.name}
                  <Pill tone={s.status === "Approved" ? "ok" : s.status === "Blocked" ? "bad" : "warn"}>{s.status === "New" ? "New supplier" : s.status}</Pill>
                  {s.suggested && !disabled && <Pill tone="brand">Suggested</Pill>}
                </div>
                <div className="text-[12px] text-muted">{s.city} · {s.contact}{s.onTime != null ? ` · ${s.onTime}% on time last year` : " · no history with us"}{s.share ? ` · ${s.share}% of last year's box spend` : ""}</div>
                {s.blocked && <div className="mt-1 flex items-start gap-1 text-[12px] text-bad"><Ban size={12} className="mt-0.5 shrink-0" />{s.blocked}</div>}
                {s.warning && <div className="mt-1 flex items-start gap-1 text-[12px] text-orange"><AlertTriangle size={12} className="mt-0.5 shrink-0" />{s.warning}</div>}
              </div>
              <span className="flex shrink-0 items-center gap-1 text-[12px] text-muted"><C size={13} /> {s.channel === "WhatsApp" ? "WhatsApp" : "Email"}</span>
            </label>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
        <div className="text-[13px] text-ink">
          <b>{n}</b> selected · quotes due <b>{deadline}, 6 pm</b>
          <span className="ml-1 inline-flex align-middle"><InfoTip text={`Company rule: invite at least ${min} suppliers. Everyone gets the same request and deadline, on the channel they prefer.`} /></span>
          {n < min && <span className="ml-2 text-orange">Pick at least {min}.</span>}
        </div>
        <Button
          disabled={busy || n < min}
          onClick={async () => {
            setBusy(true);
            try {
              await post("/api/events/send", { id, suppliers: [...on] });
              await goWhenReady(`/events/${id}/quotes`, { event: id, stage: "quotes" });
            } catch (e) {
              toast((e as Error).message, "info");
              setBusy(false);
            }
          }}
        >
          {busy ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Send size={14} /> Send request to {n} suppliers</>}
        </Button>
      </div>
      {address && <p className="text-[12px] text-ink">Replies go to <b className="font-mono">{address}</b>, this event&apos;s own address, and are read by QuoteLens as they arrive.</p>}
      <p className="text-[11.5px] text-muted">Sending is simulated in this demo: no email or WhatsApp leaves this laptop. Who was invited, how and when is saved and logged in Change history.</p>
    </div>
  );
}
