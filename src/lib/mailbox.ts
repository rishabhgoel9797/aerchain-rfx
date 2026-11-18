/**
 * The supplier mailbox for RFQ-2026-014 (server only). Email itself is simulated (no SMTP), but every message that
 * "arrives" is saved in data/files/RFQ-2026-014/inbox.json and read by the real AI pipeline straight away.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/** The address suppliers reply to. Each event gets its own, so replies land on the right event. */
export const replyAddress = (eventId: string) => `${eventId.toLowerCase()}@quotes.rsgherbal.example`;

export type ReadSummary = { green: number; amber: number; red: number; notQuoted: number; issues: string[]; secs: number };
export type MailMsg = {
  id: string; supplier_id: string; channel: string; received_at: string; kind: string;
  text_file: string; attachments: string[]; text: string; subject?: string;
  read_status?: "reading" | "read" | "failed"; read_summary?: ReadSummary; read_error?: string;
};

export const inboxPath = (eventId = "RFQ-2026-014") => join(process.cwd(), "data", "files", eventId, "inbox.json");

/** Read fresh from disk (not the bundled copy), so a reply that just arrived shows straight away. */
export function readInbox(eventId = "RFQ-2026-014"): MailMsg[] {
  const p = inboxPath(eventId);
  if (!existsSync(p)) return [];
  return JSON.parse(readFileSync(p, "utf8")).messages as MailMsg[];
}

/** Subject line: the one written in the email, else a short label from the message type. */
export function subjectOf(m: MailMsg) {
  if (m.subject) return m.subject;
  const s = m.text.match(/^Subject:\s*(.+)$/m)?.[1];
  if (s) return s.trim();
  if (m.kind === "Out of office") return "Automatic reply";
  if (m.kind === "Price on a call" || m.channel === "Phone") return "Phone call note";
  if (m.channel === "WhatsApp") return m.kind === "Question" ? "WhatsApp question" : "WhatsApp message";
  return m.kind === "Question" ? "Question about the request" : m.kind;
}

/** The newest reply that arrived live (through the inbox), if any, for "what's next". */
export function latestLiveReply(eventId = "RFQ-2026-014") {
  return readInbox(eventId).filter((m) => m.id.startsWith("MSG-U")).sort((a, b) => b.received_at.localeCompare(a.received_at))[0];
}
