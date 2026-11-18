/**
 * Turns any supplier file into a list of text segments, each with a LOCATION
 * (sheet+row, page+line, paragraph, photo box, or chat line) so every number the AI
 * reads can be traced back to the exact spot in the original.
 */
import { readFileSync } from "node:fs";
import { extname, basename } from "node:path";
import ExcelJS from "exceljs";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { createWorker } from "tesseract.js";
import sharp from "sharp";

const cellText = (v) => {
  if (v == null) return "";
  if (typeof v === "object") return v.richText ? v.richText.map((r) => r.text).join("") : v.result ?? v.text ?? "";
  return String(v);
};

async function fromXlsx(path) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const seg = [];
  wb.eachSheet((ws) => {
    const seen = new Set();
    ws.eachRow((row, n) => {
      const cells = (row.values || []).slice(1).map(cellText).map((s) => s.trim());
      // Merged cells repeat the same value in side-by-side columns: drop only those repeats, never equal values
      // in different columns (e.g. "S.No 3" and "Ply 3" on the same row).
      const uniq = cells.filter((c, i) => c && c !== cells[i - 1]);
      const text = uniq.join(" | ");
      if (!text || seen.has(text)) return;
      seen.add(text);
      seg.push({ loc: `Sheet "${ws.name}", row ${n}`, text });
    });
  });
  return seg;
}

async function fromDocx(path) {
  const { value } = await mammoth.extractRawText({ path });
  return value.split(/\n+/).map((t) => t.trim()).filter(Boolean).map((text, i) => ({ loc: `Paragraph ${i + 1}`, text }));
}

async function fromPdf(path) {
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(path)));
  const { text } = await extractText(pdf, { mergePages: false });
  const seg = [];
  text.forEach((pageText, p) => pageText.split(/\n+/).map((t) => t.trim()).filter(Boolean).forEach((t, l) => seg.push({ loc: `Page ${p + 1}, line ${l + 1}`, text: t })));
  return seg;
}

let worker;
async function fromImage(path) {
  worker ??= await createWorker("eng");
  // Clean-up that tested best on phone photos: greyscale + contrast stretch, read as one block of rows.
  await worker.setParameters({ tessedit_pageseg_mode: "6" });
  const img = await sharp(path).grayscale().normalize().png().toBuffer();
  const { data } = await worker.recognize(img, {}, { blocks: true });
  const seg = [];
  let n = 0;
  for (const b of data.blocks ?? []) for (const p of b.paragraphs ?? []) for (const l of p.lines ?? []) {
    const t = l.text.trim();
    if (!t) continue;
    n++;
    const { x0, y0, x1, y1 } = l.bbox;
    seg.push({ loc: `Photo line ${n}`, text: t, box: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, ocr_confidence: Math.round(l.confidence) });
  }
  return seg;
}

function fromText(path) {
  return readFileSync(path, "utf8").split(/\n/).map((t) => t.trim()).filter(Boolean).map((text, i) => ({ loc: `Line ${i + 1}`, text }));
}

export async function toDocument(path) {
  const ext = extname(path).toLowerCase();
  const kind = { ".xlsx": "Excel", ".docx": "Word", ".pdf": "PDF", ".jpg": "Photo", ".jpeg": "Photo", ".png": "Photo", ".txt": "Text" }[ext] ?? "Text";
  const segments = ext === ".xlsx" ? await fromXlsx(path) : ext === ".docx" ? await fromDocx(path) : ext === ".pdf" ? await fromPdf(path) : kind === "Photo" ? await fromImage(path) : fromText(path);
  return { file: basename(path), kind, segments };
}

export async function closeOcr() { if (worker) { await worker.terminate(); worker = undefined; } }
