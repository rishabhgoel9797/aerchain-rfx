"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button, toast } from "@/components/button";
import { goWhenReady } from "@/lib/go-when-ready";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.ok) throw new Error(j.error ?? "Couldn't save. Try again.");
  return j;
}

/** Approve, or send back with a reason. Saved in approvals.csv and Change history. */
export function ApprovalActions({ id, name }: { id: string; name: string }) {
  const [mode, setMode] = useState<"idle" | "reject" | "busy">("idle");
  const [reason, setReason] = useState("");
  const act = async (action: "approve" | "reject") => {
    setMode("busy");
    try {
      await post("/api/approvals", { id, action, comment: action === "reject" ? reason : "" });
      toast(action === "approve" ? `${name}: approved. Saved in Change history.` : `${name}: sent back to the buyer with your reason.`);
      await goWhenReady(window.location.pathname, {});
    } catch (e) {
      toast((e as Error).message, "info");
      setMode(action === "reject" ? "reject" : "idle");
    }
  };
  if (mode === "busy") return <span className="inline-flex items-center gap-1.5 text-[12px] text-muted"><Loader2 size={13} className="animate-spin" /> Saving…</span>;
  if (mode === "reject")
    return (
      <div className="flex min-w-[260px] flex-col gap-1.5">
        <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} onKeyDown={(e) => e.key === "Enter" && act("reject")} placeholder="Why? e.g. Get a second quote for C14" className="rounded-lg border border-line px-2.5 py-1.5 text-[12px] outline-none focus:border-purple" />
        <div className="flex gap-2"><Button variant="secondary" onClick={() => setMode("idle")}>Cancel</Button><Button onClick={() => act("reject")}>Send back</Button></div>
      </div>
    );
  return (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={() => setMode("reject")}>Reject</Button>
      <Button onClick={() => act("approve")}>Approve</Button>
    </div>
  );
}

/** Award tab: send the recommended award for approval (refused by the server while red items are open). */
export function SubmitForApproval({ id, value, waitingOn, detail, note, label = "Send for approval" }: { id: string; value: number; waitingOn: string; detail: string; note: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await post("/api/approvals", { id, action: "submit", value, waitingOn, detail, note });
          await goWhenReady("/approvals", {});
        } catch (e) {
          toast((e as Error).message, "info");
          setBusy(false);
        }
      }}
    >
      {busy ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Send size={14} /> {label}</>}
    </Button>
  );
}

/** Request page: close with a reason, or send the AI's questions to the requester (sending simulated, status saved). */
export function RequestStatusButtons({ id, first, via, missing, questions }: { id: string; first: string; via: string; missing: number; questions: string[] }) {
  const [closing, setClosing] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (action: "close" | "ask") => {
    setBusy(true);
    try {
      await post("/api/requests/status", { id, action, reason, questions });
      toast(action === "close" ? `Request closed. ${first} will see your reason.` : `Questions sent to ${first} on ${via === "Email" ? "email" : "WhatsApp"} (sending simulated). Status: Waiting for details.`);
      await goWhenReady(window.location.pathname, {});
    } catch (e) {
      toast((e as Error).message, "info");
      setBusy(false);
    }
  };
  if (closing)
    return (
      <div className="flex items-center gap-2">
        <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run("close")} placeholder="Reason, e.g. Covered by the Sunrise Tapes contract" className="w-72 rounded-lg border border-line px-3 py-1.5 text-[13px] outline-none focus:border-purple" />
        <Button variant="secondary" onClick={() => setClosing(false)}>Cancel</Button>
        <Button disabled={busy} onClick={() => run("close")}>Close request</Button>
      </div>
    );
  return (
    <>
      <Button variant="secondary" disabled={busy} onClick={() => setClosing(true)}>Close request</Button>
      {questions.length > 0 && <Button variant="secondary" disabled={busy} onClick={() => run("ask")}>{missing ? `Ask ${first} (${missing} questions)` : `Ask ${first} a question`}</Button>}
    </>
  );
}
