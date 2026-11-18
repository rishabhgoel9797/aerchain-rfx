import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import { join, normalize, extname } from "node:path";
import sharp from "sharp";
import { renderPageAsImage } from "unpdf";

/**
 * GET /api/source?path=D/IMG_20261109_1842.jpg            → the original supplier file
 * GET /api/source?path=...jpg&x=..&y=..&w=..&h=..         → a crop of the photo around that spot
 * GET /api/source?path=B/PPW-Q-2611-044.pdf&page=2           → page 2 of the PDF as a picture
 * Only serves files inside data/files/RFQ-2026-014 (local demo).
 */
const BASE = join(process.cwd(), "data", "files", "RFQ-2026-014");
// Team requests' attachments (e.g. "requests/REQ-0147_Baddi_box_list.xlsx") can be opened too.
const REQ_BASE = join(process.cwd(), "data", "files", "requests");
// Other events' supplier files: "RFQ-2026-017/A/upload-…_email.txt" (relative to data/files).
const FILES = join(process.cwd(), "data", "files");
const resolve = (rel: string) => (rel.startsWith("requests/") ? normalize(join(REQ_BASE, rel.slice(9))) : /^RFQ-\d{4}-\d{3}\//.test(rel) ? normalize(join(FILES, rel)) : normalize(join(BASE, rel)));
const allowed = (full: string) => full.startsWith(BASE + "/") || full.startsWith(REQ_BASE + "/") || /^RFQ-\d{4}-\d{3}\//.test(full.slice(FILES.length + 1));
const TYPES: Record<string, string> = { ".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".txt": "text/plain; charset=utf-8", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };

export async function GET(req: Request) {
  const u = new URL(req.url);
  const rel = u.searchParams.get("path") ?? "";
  const full = resolve(rel);
  if (!allowed(full) || !existsSync(full)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ext = extname(full).toLowerCase();
  const page = Number(u.searchParams.get("page"));
  if (ext === ".pdf" && page > 0) {
    const png = await renderPageAsImage(new Uint8Array(readFileSync(full)), page, { canvasImport: () => import("@napi-rs/canvas"), scale: 2 });
    return new NextResponse(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
  }
  const x = Number(u.searchParams.get("x")), y = Number(u.searchParams.get("y")), w = Number(u.searchParams.get("w")), h = Number(u.searchParams.get("h"));
  if ([".jpg", ".jpeg", ".png"].includes(ext) && w > 0 && h > 0) {
    const meta = await sharp(full).metadata();
    const padX = Math.round(w * 0.15), padY = Math.round(h * 1.2);
    const left = Math.max(0, Math.round(x - padX)), top = Math.max(0, Math.round(y - padY));
    const width = Math.min((meta.width ?? 0) - left, Math.round(w + padX * 2)), height = Math.min((meta.height ?? 0) - top, Math.round(h + padY * 2));
    // outline the exact line the value was read from
    const box = Buffer.from(`<svg width="${width}" height="${height}"><rect x="${x - left - 6}" y="${y - top - 6}" width="${w + 12}" height="${h + 12}" fill="none" stroke="#f37a27" stroke-width="5" rx="8"/></svg>`);
    const img = await sharp(full).extract({ left, top, width, height }).composite([{ input: box }]).png().toBuffer();
    return new NextResponse(new Uint8Array(img), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
  }
  return new NextResponse(new Uint8Array(readFileSync(full)), { headers: { "Content-Type": TYPES[ext] ?? "application/octet-stream", "Content-Disposition": `inline; filename="${rel.split("/").pop()}"` } });
}
