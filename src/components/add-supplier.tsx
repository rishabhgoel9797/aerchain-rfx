"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { X, Plus, Mail, MessageCircle, Phone, MessageSquare } from "lucide-react";
import { Button, toast } from "@/components/button";
import { InfoTip } from "@/components/ui";

const CHANNELS = [
  { key: "Email", icon: Mail, hint: "Requests sent as email with attachments" },
  { key: "WhatsApp", icon: MessageCircle, hint: "Requests sent on WhatsApp with a simple link, no login" },
  { key: "Phone", icon: Phone, hint: "Buyer calls them; the call is logged" },
  { key: "SMS", icon: MessageSquare, hint: "Short text with a link, for suppliers without WhatsApp" },
];

const EMPTY = { name: "", category: "Corrugated boxes", city: "", state: "Uttarakhand", contact_person: "", email: "", phone: "", whatsapp: "", gstin: "", found_via: "IndiaMART", preferred_channel: "Email" };

export function AddSupplierButton({ label = "Add supplier", variant = "primary" as const }: { label?: string; variant?: "primary" | "secondary" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}><Plus size={15} /> {label}</Button>
      {open && <AddSupplierDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function AddSupplierDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [f, setF] = useState(EMPTY);
  const [channels, setChannels] = useState<string[]>(["Email"]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const toggle = (c: string) => setChannels((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]));

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, channels }) });
    const data = await res.json();
    setSaving(false);
    if (!data.ok) { setErrors(data.errors ?? {}); return; }
    toast(`${data.name} added as a New supplier. Saved to suppliers.csv on this laptop.`);
    onClose();
    setTimeout(() => router.refresh(), 600);
  };

  const field = (k: keyof typeof EMPTY, label: string, opts: { placeholder?: string; info?: string; type?: string; required?: boolean } = {}) => (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-[12px] font-semibold text-ink">{label}{opts.required && <span className="text-bad">*</span>}{opts.info && <InfoTip text={opts.info} />}</span>
      <input type={opts.type ?? "text"} value={f[k]} onChange={set(k)} placeholder={opts.placeholder} className={clsx("w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:border-purple/60", errors[k] ? "border-bad/60 bg-bad-bg/30" : "border-line")} />
      {errors[k] && <span className="mt-1 block text-[12px] text-bad">{errors[k]}</span>}
    </label>
  );

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-navy/40 p-6" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Add supplier">
        <div className="flex items-start justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="text-[17px] font-semibold text-indigo">Add a new supplier</h2>
            <p className="text-[13px] text-muted">They&apos;ll be tagged <b>New</b> with no history. Papers and samples are needed before any award.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-bg" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            {field("name", "Company name", { placeholder: "e.g. Kumaon Kraft Packaging", required: true })}
            <label className="block">
              <span className="mb-1 flex items-center gap-1 text-[12px] font-semibold text-ink">Category <InfoTip text="What they supply. Box suppliers can be invited to box sourcing events." /></span>
              <select value={f.category} onChange={set("category")} className="w-full rounded-lg border border-line px-3 py-2 text-[13px]">
                {["Corrugated boxes", "Mono cartons", "PET bottles & caps", "Labels", "Raw herbs", "Packaging consumables", "Logistics", "Services"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            {field("city", "City", { placeholder: "e.g. Rudrapur", required: true })}
            {field("state", "State")}
            {field("gstin", "GSTIN", { placeholder: "15 characters", info: "Tax registration number. Checked for format and duplicates. Optional now, required before any award." })}
            <label className="block">
              <span className="mb-1 flex items-center gap-1 text-[12px] font-semibold text-ink">How did we find them? <InfoTip text="Helps track where good suppliers come from." /></span>
              <select value={f.found_via} onChange={set("found_via")} className="w-full rounded-lg border border-line px-3 py-2 text-[13px]">
                {["IndiaMART", "TradeIndia", "Referral", "They contacted us", "Trade fair", "Other"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-line p-4">
            <div className="mb-3 flex items-center gap-1 text-[13px] font-semibold text-indigo">Contact and how to reach them <InfoTip text="Requests, reminders and questions go out on the supplier's preferred channel. Tick every channel they use." /></div>
            <div className="grid grid-cols-2 gap-4">
              {field("contact_person", "Contact person", { placeholder: "Full name", required: true })}
              {field("email", "Email", { placeholder: "name@company.com", type: "email" })}
              {field("phone", "Phone", { placeholder: "+91 …" })}
              {field("whatsapp", "WhatsApp number", { placeholder: "Leave blank if same as phone" })}
            </div>
            <div className="mt-4">
              <div className="mb-1.5 text-[12px] font-semibold text-ink">Channels they use <span className="text-bad">*</span></div>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((c) => (
                  <button key={c.key} type="button" title={c.hint} onClick={() => toggle(c.key)} className={clsx("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px]", channels.includes(c.key) ? "border-purple bg-tint font-semibold text-purple" : "border-line text-ink hover:bg-bg")}>
                    <c.icon size={14} /> {c.key}
                  </button>
                ))}
              </div>
              {errors.channels && <span className="mt-1 block text-[12px] text-bad">{errors.channels}</span>}
            </div>
            {channels.length > 1 && (
              <label className="mt-3 block w-60">
                <span className="mb-1 flex items-center gap-1 text-[12px] font-semibold text-ink">Preferred channel <InfoTip text="The first channel we use. If it fails (bounce, no reply), the next one is tried." /></span>
                <select value={channels.includes(f.preferred_channel) ? f.preferred_channel : channels[0]} onChange={set("preferred_channel")} className="w-full rounded-lg border border-line px-3 py-2 text-[13px]">
                  {channels.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-line px-6 py-4">
          <span className="text-[12px] text-muted">Saved to <code>data/seed/suppliers.csv</code> on this laptop.</span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Add supplier"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
