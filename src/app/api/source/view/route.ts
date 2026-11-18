import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { join, normalize, extname } from "node:path";
// Same converter the AI reader uses, so "Sheet Rates, row 16" or "Page 1, line 11" point at exactly the same spot.
import { toDocument } from "../../../../../scripts/reader/convert.mjs";

/**
 * GET /api/source/view?path=A/SGC_Quotation_FY27.xlsx → { kind, segments:[{loc,text}] }
 * Turns any supplier file (Excel, Word, PDF, text) into readable lines for the in-app viewer.
 * Photos are shown as images, so they are not converted here. Only files in data/files/RFQ-2026-014.
 */
export const runtime = "nodejs";
const BASE = join(process.cwd(), "data", "files", "RFQ-2026-014");
// Team requests' attachments (e.g. "requests/REQ-0147_Baddi_box_list.xlsx") can be opened too.
const REQ_BASE = join(process.cwd(), "data", "files", "requests");
// Other events' supplier files: "RFQ-2026-017/A/upload-…_email.txt" (relative to data/files).
const FILES = join(process.cwd(), "data", "files");
const resolve = (rel: string) => (rel.startsWith("requests/") ? normalize(join(REQ_BASE, rel.slice(9))) : /^RFQ-\d{4}-\d{3}\//.test(rel) ? normalize(join(FILES, rel)) : normalize(join(BASE, rel)));
const allowed = (full: string) => full.startsWith(BASE + "/") || full.startsWith(REQ_BASE + "/") || /^RFQ-\d{4}-\d{3}\//.test(full.slice(FILES.length + 1));

export async function GET(req: Request) {
  const rel = new URL(req.url).searchParams.get("path") ?? "";
  const full = resolve(rel);
  if (!allowed(full) || !existsSync(full)) return NextResponse.json({ error: "File not found" }, { status: 404 });
  if ([".jpg", ".jpeg", ".png"].includes(extname(full).toLowerCase())) return NextResponse.json({ kind: "image", segments: [] });
  try {
    const doc = (await toDocument(full)) as { kind: string; segments: { loc: string; text: string }[] };
    return NextResponse.json({ kind: doc.kind, segments: doc.segments.map((s) => ({ loc: s.loc, text: s.text })) });
  } catch (e) {
    return NextResponse.json({ error: `Couldn't open this file: ${(e as Error).message}` }, { status: 500 });
  }
}
