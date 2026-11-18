import { notFound } from "next/navigation";
import { EventHeader, TabIntro } from "@/components/event-header";
import { eventById } from "@/lib/portfolio";
import { openCheckCounts } from "@/lib/check-state";
import { eventResults, openFlags } from "@/lib/event-results";
import { eventSaved, liveEventRow } from "@/lib/csv-file";
import { EventPending } from "@/components/event-pending";
import { requestFiles } from "@/lib/request-files";
import { latestLiveReply } from "@/lib/mailbox";
import { ALL_SUPPLIERS } from "@/lib/fixtures";

/** After a new reply is read: say so, and what to look at. Only for the last few hours, then the normal hint returns. */
function replyNote() {
  const m = latestLiveReply();
  if (!m || Date.now() - Date.parse(m.received_at) > 6 * 3600000) return undefined;
  const who = ALL_SUPPLIERS().find((s) => s.id === m.supplier_id)?.name ?? m.supplier_id;
  if (m.read_status === "reading") return `New reply from ${who} is being read now. It lands in Compare in under a minute.`;
  if (m.read_status === "failed") return `New reply from ${who} couldn\u2019t be read. Open it in the Quotes tab and check it.`;
  const s = m.read_summary;
  if (!s) return undefined;
  const flagged = s.amber + s.red;
  return `New reply from ${who} read: ${s.green} green${flagged ? `, ${flagged} to check in the Check tab` : ""}. Then compare and ask AI.`;
}

export default async function EventLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stored = eventById(id);
  // Use the stage and status as saved right now, so a step just completed shows immediately.
  const row = stored ? liveEventRow(id) : undefined;
  const ev = stored && row ? { ...stored, stage: (row.stage || stored.stage) as typeof stored.stage, suppliers: row.suppliers_status || stored.suppliers, due: row.due || stored.due } : stored;
  if (!ev) {
    if (eventSaved(id)) return <EventPending id={id} />; // just created, data still reloading
    notFound();
  }
  // The demo event counts its own Check queue; any other event counts the flags on its replies.
  const flags = id === "RFQ-2026-014" ? null : openFlags(eventResults(id));
  const { total, bad } = flags ? { total: flags.length, bad: flags.filter((f) => f.tone === "bad").length } : openCheckCounts();
  return (
    <div>
      <EventHeader ev={ev} checkCount={total} checkRed={bad} files={requestFiles(ev.fromRequest)} />
      <div className="px-8 py-5">
        <TabIntro ev={ev} nextNote={id === "RFQ-2026-014" ? replyNote() : undefined} />
        {children}
      </div>
    </div>
  );
}
