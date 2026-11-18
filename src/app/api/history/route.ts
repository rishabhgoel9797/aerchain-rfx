import { NextResponse } from "next/server";
import { clean, logChange } from "@/lib/csv-file";

/** POST /api/history { area, what } — records a buyer decision (e.g. a checked price) in change_history.csv. */
export const runtime = "nodejs";
const AREAS = ["Check", "Compare", "Award", "Approvals"];

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const area = clean(b.area, 20);
  const what = clean(b.what, 300);
  if (!AREAS.includes(area) || !what) return NextResponse.json({ ok: false, error: "Nothing to record." }, { status: 400 });
  logChange({ who: "Rishabh", area, tone: b.tone === "warn" || b.tone === "ok" ? b.tone : "none", what });
  return NextResponse.json({ ok: true });
}
