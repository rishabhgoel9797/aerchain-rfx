/** Check-tab decisions saved in data/seed/check_decisions.csv (server only), and what's still open. */
import { readCsv } from "@/lib/csv-file";
import { reviewQueue } from "@/lib/fixtures";

export function checkDecisions(): Record<string, string> {
  try { return Object.fromEntries(readCsv("check_decisions").rows.filter((r) => !r.event_id).map((r) => [r.key, r.decision])); } catch { return {}; }
}

/** Flagged values still waiting for a decision: total, and how many are red (they block the award). */
export function openCheckCounts() {
  const done = checkDecisions();
  const open = reviewQueue().filter((r) => !done[r.key]);
  const bad = open.filter((r) => r.tone === "bad").length;
  return { total: open.length, bad, warn: open.length - bad };
}
