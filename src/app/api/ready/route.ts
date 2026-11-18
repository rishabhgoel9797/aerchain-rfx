import { NextResponse } from "next/server";
import { EVENTS, REQUESTS } from "@/lib/portfolio";

/**
 * GET /api/ready?event=RFQ-…&stage=suppliers  |  ?request=REQ-…
 * True once the app's loaded data (seed.json) includes the change just saved. In development the data reloads a
 * second or two after each save; pages opened before that can render without working buttons, so the app waits for this.
 */
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const ev = q.get("event"), stage = q.get("stage"), rq = q.get("request");
  let ready = true;
  if (ev) { const e = EVENTS.find((x) => x.id === ev); ready = !!e && (!stage || e.stage === stage); }
  if (rq) ready = ready && REQUESTS.some((x) => x.id === rq);
  return NextResponse.json({ ready });
}
