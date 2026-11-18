/** Supplier replies for RFQ-2026-014, straight from data/files/RFQ-2026-014/inbox.json. */
import inboxData from "../../data/files/RFQ-2026-014/inbox.json";
import outboxData from "../../data/files/RFQ-2026-014/outbox.json";

export type InboxMsg = (typeof inboxData.messages)[number];
export const INBOX: InboxMsg[] = inboxData.messages;

/** The day the request for quotes went out (day 0), from outbox.json. */
const SENT_ON = outboxData.messages.find((m) => m.kind === "Request for quotes")!.sent_at.slice(0, 10);

/** Days since the request went out, using the India date written in the timestamp. */
export const dayOf = (iso: string) => Math.round((Date.parse(iso.slice(0, 10)) - Date.parse(SENT_ON)) / 86400000);

/** "6 Nov, 10:42 am" in India time. */
export const fmtDate = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });

const isQuote = (m: InboxMsg) => /quote|price/i.test(m.kind) && !/superseded/i.test(m.kind);
/** True for a reply added live in the app (Add a reply), which replaces the original demo reply. */
export const isLiveReply = (m: InboxMsg) => m.id.startsWith("MSG-U");

/** A supplier's quote messages, oldest first. */
export const quotesFrom = (id: string) => INBOX.filter((m) => m.supplier_id === id && isQuote(m)).sort((a, b) => a.received_at.localeCompare(b.received_at));

/** Every file a supplier sent with their quote: the message itself, then attachments. */
export const filesFrom = (id: string) => {
  const q = quotesFrom(id);
  const msgs = q.length ? q : INBOX.filter((m) => m.supplier_id === id && m.kind !== "Question"); // e.g. an out-of-office reply
  return [...new Set(msgs.flatMap((m) => [m.text_file, ...m.attachments]))];
};
