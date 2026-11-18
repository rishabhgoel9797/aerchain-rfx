"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button, toast } from "@/components/button";
import { goWhenReady } from "@/lib/go-when-ready";

/** Turns a team request into a real sourcing event (saved to the data files), then opens it. */
export function ConvertRequest({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch("/api/requests/convert", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
          const j = await res.json();
          if (!res.ok || !j.ok) { toast(j.error ?? "Couldn't create the sourcing event.", "info"); return; }
          toast(j.already ? `Already converted: opening ${j.eventId}` : j.aiError ? `Sourcing event ${j.eventId} created. The AI couldn't re-read the request (${j.aiError}), so the details on file were used.` : `QuoteLens read the request and its files. Sourcing event ${j.eventId} created.`);
          // Full page load: the app data is being rebuilt right now, and a soft navigation can lose the race
          // and stay on this page. The event page shows "Setting up…" until the new event is ready.
          await goWhenReady(`/events/${j.eventId}/request`, { event: j.eventId });
        } catch {
          toast("Couldn't reach the app server. Is it still running?", "info");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <><Loader2 size={14} className="animate-spin" /> QuoteLens is reading…</> : <>Convert to sourcing event <ArrowRight size={14} /></>}
    </Button>
  );
}
