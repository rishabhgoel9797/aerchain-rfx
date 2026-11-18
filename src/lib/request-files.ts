/**
 * Files that came with a team request (server only): the message itself (form / email / WhatsApp)
 * and any attachment, e.g. data/files/requests/REQ-0147_Baddi_box_list.xlsx.
 * Paths are returned as "requests/<name>", which the in-app file viewer can open.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { ITEMS } from "@/lib/fixtures";
// Same converter the AI reader uses for supplier files.
import { toDocument } from "../../scripts/reader/convert.mjs";

const DIR = join(process.cwd(), "data", "files", "requests");

export type RequestFile = { path: string; name: string; isMessage: boolean };

/** All files for a request: the message first, then attachments. */
export function requestFiles(reqId?: string): RequestFile[] {
  if (!reqId) return [];
  try {
    return readdirSync(DIR)
      .filter((n) => n.startsWith(`${reqId}_`))
      .map((n) => ({ path: `requests/${n}`, name: n, isMessage: /_(form\.json|email\.txt|whatsapp\.txt|message\.txt)$/i.test(n) }))
      .sort((a, b) => Number(b.isMessage) - Number(a.isMessage));
  } catch { return []; }
}

/** The request's spreadsheet attachment, if any. */
export const itemListFile = (reqId?: string) => requestFiles(reqId).find((f) => /\.(xlsx|xls)$/i.test(f.name))?.path;

/** Plain text of a request file (for the AI to read). Each line keeps its location, e.g. "row 3". */
export async function fileText(path: string) {
  const doc = (await toDocument(join(process.cwd(), "data", "files", path))) as { segments: { loc: string; text: string }[] };
  return doc.segments.map((s) => `[${s.loc}] ${s.text}`).join("\n");
}

export type ItemLine = { size: string; ply: number; qty: number; code?: string; row: string; note?: string };

/** Reads an item list (size, ply, yearly qty) and matches each line to our item codes by size and ply. Code, not AI. */
export async function readItemList(path: string): Promise<ItemLine[]> {
  const doc = (await toDocument(join(process.cwd(), "data", "files", path))) as { segments: { loc: string; text: string }[] };
  const [head, ...rows] = doc.segments.map((s) => ({ loc: s.loc, cells: s.text.split(" | ") }));
  if (!head) return [];
  const col = (re: RegExp) => head.cells.findIndex((c) => re.test(c));
  const [cSize, cPly, cQty] = [col(/size/i), col(/ply/i), col(/qty|quantity/i)];
  // Any description column the team added ("Used for", "Product", "Description"…), kept as a note.
  const cNote = head.cells.findIndex((c, i) => ![cSize, cPly, cQty].includes(i) && /use|desc|product|item|for|remark|note/i.test(c));
  if (cSize < 0 || cQty < 0) return [];
  return rows.map(({ loc, cells }) => {
    const size = (cells[cSize] ?? "").replace(/\s/g, "");
    const ply = Number(cells[cPly]);
    const [l, w, h] = size.split(/x|×/i).map(Number);
    const code = ITEMS.find((it) => it.l === l && it.w === w && it.h === h && it.ply === ply)?.id;
    return { size: size.replace(/x/gi, " × "), ply, qty: Number(String(cells[cQty]).replace(/,/g, "")), code, row: loc.replace(/^Sheet "[^"]+", /, ""), note: cNote >= 0 ? (cells[cNote] ?? "").trim() || undefined : undefined };
  }).filter((x) => x.size && x.qty);
}
