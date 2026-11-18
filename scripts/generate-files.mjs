/**
 * `npm run make-files` — creates every supplier reply and team request for the demo,
 * in its own messy real-world format, from the answer key (data/answer-key) and master data.
 *
 * Output: data/files/
 *   RFQ-2026-014/<supplier>/...   quotes, cover emails, certificates
 *   RFQ-2026-014/inbox.json       list of every message as it "arrived" (the fake inbox)
 *   requests/...                  messages from company teams
 *
 * Safe to re-run: files are regenerated from the answer key each time.
 */
import { mkdirSync, writeFileSync, readFileSync, createWriteStream, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } from "docx";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(readFileSync(join(root, "src", "data", "seed.json"), "utf8"));
const M = seed.master, K = seed.answerKey;
const OUT = join(root, "data", "files");
const EV = join(OUT, "RFQ-2026-014");
const FONT = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf";
const HAND = "/System/Library/Fonts/Supplemental/Bradley Hand Bold.ttf";
const hasFont = existsSync(FONT);

const dir = (...p) => { const d = join(...p); mkdirSync(d, { recursive: true }); return d; };
const items = M.items;
const sup = Object.fromEntries(M.suppliers.map((s) => [s.supplier_id, s]));
const q = (s, code) => K.quotes.find((r) => r.supplier_id === s && r.item_code === code);
const terms = Object.fromEntries(K.quote_terms.map((t) => [t.supplier_id, t]));
const qa = (s) => K.quality_answers.filter((r) => r.supplier_id === s).map((r) => r.answer);
const QUESTIONS = M.quality_questions.map((x) => x.question);
const inbox = [];
const log = (f) => console.log("  " + f.replace(root + "/", ""));
const writeText = (path, text) => { writeFileSync(path, text.trimStart()); log(path); };
const fmt2 = (n) => Number(n).toFixed(2);
const sizeOf = (it) => `${it.length_mm}x${it.width_mm}x${it.height_mm}`;

function pdf(path, build) {
  return new Promise((res) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, info: { Producer: "demo" } });
    if (hasFont) doc.registerFont("U", FONT);
    const stream = createWriteStream(path);
    doc.pipe(stream);
    build(doc);
    doc.end();
    stream.on("finish", () => { log(path); res(); });
  });
}
const F = (doc) => doc.font(hasFont ? "U" : "Helvetica");

// =====================================================================================
// A — Shree Ganesh Corrugators: Excel in their OWN layout, own codes, sizes in cm, per 100 pcs
// =====================================================================================
async function supplierA() {
  const d = dir(EV, "A");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Shree Ganesh Corrugators";
  const ws = wb.addWorksheet("Rates");
  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "SHREE GANESH CORRUGATORS — Plot 14, Industrial Area, Roorkee (UK)";
  ws.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF8B1E1E" } };
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = "Quotation for M/s RSG Herbal House, Haridwar  |  Ref: SGC/Q/26-27/118  |  Date: 06-Nov-2026";
  ws.getCell("A3").value = "";
  const head = ["Our Code", "Description", "Size (cm, L x W x H)", "Ply", "Rate (Rs. per 100 pcs)", "Your Qty / yr", "Amount (Rs.)"];
  ws.addRow(head);
  ws.getRow(4).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(4).eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF8B1E1E" } }; });
  // their own order: grouped by ply, biggest first
  const order = [...items].sort((a, b) => a.ply - b.ply || b.length_mm * b.width_mm - a.length_mm * a.width_mm);
  const seen = {};
  let rowIdx = 5, total = 0;
  for (const it of order) {
    let code = `SG-${it.ply}P-${it.length_mm / 10}${it.width_mm / 10}`;
    seen[code] = (seen[code] ?? 0) + 1;
    if (seen[code] > 1) code += `-${String.fromCharCode(64 + seen[code])}`;
    const r = q("A", it.item_code);
    const rate100 = Number(r.quoted_value);
    // C09: their size differs slightly → unsure match
    const h = it.item_code === "C09" ? 24.5 : it.height_mm / 10;
    const desc = it.item_code === "C09" ? "RSC box (approx. size)" : it.ply === 7 ? "Heavy duty RSC box" : "RSC box, kraft";
    const amount = Math.round((rate100 / 100) * it.yearly_qty);
    total += amount;
    ws.addRow([code, desc, `${it.length_mm / 10} x ${it.width_mm / 10} x ${h}`, `${it.ply} Ply`, rate100, it.yearly_qty, amount]);
    rowIdx++;
  }
  ws.addRow([]);
  ws.addRow(["", "", "", "", "", "Total (Rs.)", total]).font = { bold: true };
  ws.addRow([]);
  ws.addRow(["Terms:", "Rates are per 100 pcs, delivered Haridwar. GST 18% extra. Payment 60 days. Delivery 3 weeks from PO. Min. 5,000 pcs per size. Valid till 31-Jan-2027."]);
  ws.columns.forEach((c, i) => { c.width = [16, 26, 22, 8, 22, 14, 16][i]; });
  ws.getColumn(5).numFmt = "#,##0.00";
  ws.getColumn(7).numFmt = "#,##0";

  const ws2 = wb.addWorksheet("Compliance");
  ws2.addRow(["Question (as per your RFQ)", "Our reply"]).font = { bold: true };
  QUESTIONS.forEach((qq, i) => ws2.addRow([qq, ["Yes — ISO 9001:2015, certificate attached", "Yes, BCT report attached (540 kgf)", "70% recycled", "Yes, within 5 days", "1.5 lakh boxes/month"][i]]));
  ws2.getColumn(1).width = 55; ws2.getColumn(2).width = 45;
  const f = join(d, "SGC_Quotation_FY27.xlsx");
  await wb.xlsx.writeFile(f); log(f);

  writeText(join(d, "email.txt"), `
From: Manoj Agarwal <manoj@shreeganesh.example>
To: Rishabh <rishabh@rsgherbal.example>
Date: 06 Nov 2026, 10:42
Subject: RE: RFQ-2026-014 Corrugated boxes FY27 - Quotation

Dear Rishabh ji,

Please find attached our best rates for your FY27 requirement. We have given rates in our standard format.
ISO certificate is also attached.

Regards,
Manoj Agarwal
Shree Ganesh Corrugators, Roorkee
Attachments: SGC_Quotation_FY27.xlsx, ISO_9001_SGPPL.pdf, BCT_Report_SGC.pdf
`);
  inbox.push({ id: "MSG-A1", supplier_id: "A", channel: "Email", received_at: "2026-11-06T10:42:00+05:30", kind: "Quote", text_file: "A/email.txt", attachments: ["A/SGC_Quotation_FY27.xlsx", "A/ISO_9001_SGPPL.pdf", "A/BCT_Report_SGC.pdf"] });
}

// =====================================================================================
// B — Pacific PackWorks: 3-page PDF on letterhead, USD incl. GST, discount in footnote,
//     two prices for C05, grand total that doesn't add up
// =====================================================================================
async function supplierB() {
  const d = dir(EV, "B");
  const rows = items.map((it) => ({ it, usd: Number(q("B", it.item_code).quoted_value) }));
  const c05p3 = Math.round(rows.find((r) => r.it.item_code === "C05").usd * 1.04 * 1000) / 1000;
  const lineSum = rows.reduce((a, r) => a + r.usd * r.it.yearly_qty, 0);
  const statedTotal = Math.round(lineSum * 1.0296); // wrong on purpose
  const letterhead = (doc, page) => {
    doc.rect(0, 0, 595, 70).fill("#0b3d6b");
    F(doc).fillColor("#ffffff").fontSize(18).text("PACIFIC PACKWORKS", 50, 20, { lineBreak: false });
    doc.fontSize(10).text("INDIA PVT LTD", 232, 27, { lineBreak: false });
    doc.fontSize(8).text("A Pacific Pack Group (Singapore) company  ·  C-41, Sector 63, Noida 201301  ·  GSTIN 09AAICP5521M1Z8", 50, 46);
    doc.fillColor("#888").fontSize(8).text(`Page ${page} of 3`, 480, 780);
    doc.fillColor("#000");
  };
  const table = (doc, slice, startY) => {
    let y = startY;
    F(doc).fontSize(9).fillColor("#0b3d6b").text("Item", 50, y).text("Description", 90, y).text("Size (mm)", 280, y).text("Annual qty", 380, y).text("Unit price USD*", 470, y);
    y += 16; doc.moveTo(50, y - 4).lineTo(545, y - 4).strokeColor("#0b3d6b").stroke();
    doc.fillColor("#000");
    for (const r of slice) {
      F(doc).fontSize(9).text(r.it.item_code.replace("C", "Item "), 50, y).text(`${r.it.ply} ply corrugated carton`, 90, y).text(sizeOf(r.it), 280, y).text(r.it.yearly_qty.toLocaleString("en-IN"), 380, y).text(r.usd.toFixed(3), 470, y);
      y += 15;
    }
    return y;
  };
  await pdf(join(d, "PPW-Q-2611-044.pdf"), (doc) => {
    letterhead(doc, 1);
    F(doc).fontSize(10).text("Ref: PPW/Q/2611/044 (Revised)          Date: 9 November 2026", 50, 95);
    doc.text("To: Mr Rishabh, Category Buyer, RSG Herbal House, New Delhi", 50, 112);
    doc.moveDown().fontSize(10).text("Sub: Quotation for corrugated cartons, FY 2026-27 (your RFQ-2026-014). This revised offer supersedes our quotation PPW/Q/2611/031.", 50, 140, { width: 495 });
    doc.text("We are pleased to offer our prices as below. Prices are in US Dollars per carton, delivered to your Haridwar plant, inclusive of GST @18%.", 50, 175, { width: 495 });
    table(doc, rows.slice(0, 15), 215);
    doc.fontSize(8).fillColor("#666").text("* See terms on page 3.", 50, 470);
    doc.addPage(); letterhead(doc, 2);
    F(doc).fontSize(10).fillColor("#000").text("Price schedule (continued)", 50, 95);
    table(doc, rows.slice(15), 120);
    doc.addPage(); letterhead(doc, 3);
    F(doc).fontSize(11).fillColor("#0b3d6b").text("Commercial terms", 50, 95);
    F(doc).fontSize(10).fillColor("#000");
    const t = [
      "Currency: US Dollars (USD). Invoicing in INR at the RBI reference rate on date of invoice.",
      "Prices: per carton, delivered Haridwar, inclusive of GST @ 18%.",
      "Payment: 45 days from date of delivery.",
      "Delivery: 2 weeks from receipt of purchase order.",
      "Validity: 15 days from the date of this quotation (until 24 November 2026).",
      `Revised rate: Item 05 (350x250x200, 3 ply) is now USD ${c05p3.toFixed(3)} per carton due to a board grade change.`,
      `Grand total (annual, USD, incl. GST): ${statedTotal.toLocaleString("en-US")}`,
    ];
    let y = 120;
    t.forEach((line, i) => { doc.text(`${i + 1}.  ${line}`, 50, y, { width: 495 }); y += 26; });
    doc.text("Quality: ISO 9001 certificate and box compression test report are attached.", 50, y + 10, { width: 495 });
    doc.text("We look forward to your valued order.", 50, y + 40);
    doc.text("For Pacific PackWorks India Pvt Ltd\n\nRahul Bose, Key Account Manager", 50, y + 70);
    doc.fontSize(6.5).fillColor("#777").text("* A special discount of 2% will be applied on all line items for orders confirmed within the validity period. Prices are subject to change in case of a variation in raw material (kraft paper) prices exceeding 5%. Subject to Noida jurisdiction. E&OE.", 50, 735, { width: 495 });
  });
  await certificate(join(d, "ISO_9001_PPW.pdf"), { kind: "ISO 9001:2015", holder: "Pacific PackWorks India Pvt Ltd", number: "SG-ISO-88213", address: "C-41, Sector 63, Noida, Uttar Pradesh", validUntil: "31 March 2028", issued: "1 April 2025" });
  await testReport(join(d, "BCT_Test_Report.pdf"), { holder: "Pacific PackWorks India Pvt Ltd", number: "LAB/BCT/26/0912", result: 560, date: "12 September 2026" });
  writeText(join(d, "email.txt"), `
From: Rahul Bose <rahul.bose@pacificpack.example>
To: Rishabh <rishabh@rsgherbal.example>
Date: 09 Nov 2026, 11:02
Subject: Revised offer - PPW/Q/2611/044 against RFQ-2026-014

Dear Mr Rishabh,

Please find attached our revised offer. It supersedes our earlier quotation PPW/Q/2611/031.
Test report and ISO certificate attached.

Best regards,
Rahul Bose
Key Account Manager, Pacific PackWorks India Pvt Ltd
Attachments: PPW-Q-2611-044.pdf, ISO_9001_PPW.pdf, BCT_Test_Report.pdf
`);
  inbox.push({ id: "MSG-B1", supplier_id: "B", channel: "Email", received_at: "2026-11-09T11:02:00+05:30", kind: "Updated quote", text_file: "B/email.txt", attachments: ["B/PPW-Q-2611-044.pdf", "B/ISO_9001_PPW.pdf", "B/BCT_Test_Report.pdf"], note: "Replaces an earlier quote PPW/Q/2611/031 sent on 6 Nov" });
}

// =====================================================================================
// C — Om Sai Packaging: Word letter, prices inside paragraphs, 5% if all items, 7-ply alternative
// =====================================================================================
async function supplierC() {
  const d = dir(EV, "C");
  const para = (text, opts = {}) => new Paragraph({ spacing: { after: 160, line: 300 }, alignment: opts.align ?? AlignmentType.JUSTIFIED, children: [new TextRun({ text, size: 22, font: "Times New Roman", bold: opts.bold })] });
  const sentence = (list) => list.map((it) => {
    const r = q("C", it.item_code);
    if (it.item_code === "C18") return null;
    return `${sizeOf(it)} mm at Rs. ${fmt2(r.quoted_value)}/-`;
  }).filter(Boolean).join(", ");
  const three = items.filter((i) => i.ply === 3), five = items.filter((i) => i.ply === 5), seven = items.filter((i) => i.ply === 7);
  const c18 = items.find((i) => i.item_code === "C18");
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "OM SAI PACKAGING INDUSTRIES", bold: true, size: 32, font: "Times New Roman", color: "1F4E79" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1F4E79" } }, spacing: { after: 300 }, children: [new TextRun({ text: "Manufacturers of Corrugated Boxes & Sheets  •  Delhi Road, Saharanpur (U.P.)  •  GSTIN 09AABFO7788Q1Z3", size: 18, font: "Times New Roman" })] }),
        para("Ref: OSPI/2026-27/RSG/07                                                            Date: 08.11.2026", { align: AlignmentType.LEFT }),
        para("To,\nThe Purchase Department,\nRSG Herbal House,\nKind Attn: Shri Rishabh ji", { align: AlignmentType.LEFT }),
        para("Sub: Our offer for corrugated boxes for FY 2026-27 against your RFQ-2026-014", { bold: true, align: AlignmentType.LEFT }),
        para("Respected Sir,"),
        para("With reference to your above enquiry, we are pleased to submit our most competitive offer for your esteemed organisation. We have been supplying quality corrugated boxes to leading Ayurvedic and FMCG companies of the region for over fifteen years."),
        para(`For your 3 ply boxes, our rates per box are as follows: ${sentence(three)}.`),
        para(`For 5 ply boxes, we quote ${sentence(five)}. We regret that we do not manufacture 5 ply in the size ${sizeOf(c18)} mm; however, we can offer a 7 ply box in the same size at Rs. ${fmt2(q("C", "C18").quoted_value)}/- per box, which will give you better strength.`),
        para(`For heavy duty 7 ply boxes, our rates are ${sentence(seven)}.`),
        para("All the above rates are per box, delivered to your Haridwar plant, and exclusive of GST which will be charged extra as applicable. In case the complete order for all 30 items is placed with us, we shall be happy to extend a special discount of 5% (five percent) on the total order value."),
        para("Payment terms: 90 days from the date of delivery. Delivery: within 6 weeks from the date of purchase order. This offer is valid up to 31st December 2026."),
        para("We are an ISO 9001:2015 certified company. Our box compression (BCT) test report is enclosed herewith for your kind reference. We use minimum 60% recycled fibre, samples can be sent within 7 days, and our capacity is 1.2 lakh boxes per month."),
        para("We hope you will find our offer in order and look forward to your valued order. Assuring you of our best services at all times."),
        para("Thanking you,\nYours faithfully,\nFor Om Sai Packaging Industries\n\n(Deepak Gupta)\nProprietor", { align: AlignmentType.LEFT }),
      ],
    }],
  });
  const f = join(d, "Offer_Letter_OmSai.docx");
  writeFileSync(f, await Packer.toBuffer(doc)); log(f);
  await testReport(join(d, "BCT_Report_OmSai.pdf"), { holder: "Om Sai Packaging Industries", number: "LAB/BCT/26/0577", result: 515, date: "28 May 2026" });
  writeText(join(d, "email.txt"), `
From: Deepak Gupta <deepak@omsaipack.example>
To: Rishabh <rishabh@rsgherbal.example>
Date: 08 Nov 2026, 16:30
Subject: Offer for Corrugated Boxes

Respected Sir,
Kindly find our offer letter for your esteemed organisation. BCT report also enclosed.
Thanking you,
Deepak Gupta, Om Sai Packaging Industries
Attachments: Offer_Letter_OmSai.docx, BCT_Report_OmSai.pdf
`);
  inbox.push({ id: "MSG-C1", supplier_id: "C", channel: "Email", received_at: "2026-11-08T16:30:00+05:30", kind: "Quote", text_file: "C/email.txt", attachments: ["C/Offer_Letter_OmSai.docx", "C/BCT_Report_OmSai.pdf"] });
}

// =====================================================================================
// D — Rajdhani Carton: printed rate card (to photograph) + generated "phone photo" fallback
// =====================================================================================
const D_HANDWRITTEN = ["C03", "C07", "C14", "C21"]; // left blank on the print; written in pen
async function supplierD() {
  const d = dir(EV, "D");
  const listed = items.filter((i) => !["C28", "C29", "C30"].includes(i.item_code));
  // 1) Printable card (A4) — print it, write the 4 blanks by hand, photograph at an angle
  await pdf(join(d, "PRINT_ME_Rajdhani_RateCard.pdf"), (doc) => {
    F(doc).fontSize(16).text("RAJDHANI CARTON CO.", { align: "center" });
    doc.fontSize(9).text("Meerut Road Industrial Area, Ghaziabad  ·  Ph 90000 10004", { align: "center" });
    doc.moveDown(0.4).fontSize(11).text("RATE LIST — CORRUGATED BOXES (Nov 2026)", { align: "center", underline: true });
    let y = 125;
    doc.fontSize(9).text("S.No", 60, y).text("Size (mm)", 110, y).text("Ply", 260, y).text("Rate Rs/pc", 330, y);
    y += 14; doc.moveTo(55, y - 3).lineTo(450, y - 3).stroke();
    listed.forEach((it, i) => {
      const blank = D_HANDWRITTEN.includes(it.item_code);
      doc.text(String(i + 1), 60, y).text(sizeOf(it).replace(/x/g, " x "), 110, y).text(String(it.ply), 262, y);
      if (blank) doc.text("_________", 330, y); else doc.text(fmt2(q("D", it.item_code).quoted_value), 330, y);
      y += 19;
    });
    doc.fontSize(8).text("Rates ex-GST, delivered. Sizes not listed not available.", 60, y + 8);
  });
  // 2) Generated phone photo (fallback, so the pipeline works before you take the real photo)
  const W = 760, rowH = 34, H = 220 + listed.length * rowH;
  const rowsSvg = listed.map((it, i) => {
    const y = 170 + i * rowH;
    const r = q("D", it.item_code);
    const hand = D_HANDWRITTEN.includes(it.item_code);
    const val = it.item_code === "C07" ? `<text x="470" y="${y}" font-family="Bradley Hand" font-size="27" fill="#1b2a8a">${fmt2(r.quoted_value)}</text><line x1="466" y1="${y - 8}" x2="490" y2="${y - 16}" stroke="#1b2a8a" stroke-width="2"/>` :
      hand ? `<text x="470" y="${y}" font-family="Bradley Hand" font-size="27" fill="#1b2a8a">${fmt2(r.quoted_value)}</text>` :
      `<text x="470" y="${y}" font-family="Courier New" font-size="20" fill="#222">${fmt2(r.quoted_value)}</text>`;
    return `<text x="70" y="${y}" font-family="Courier New" font-size="20" fill="#222">${i + 1}</text>
      <text x="130" y="${y}" font-family="Courier New" font-size="20" fill="#222">${sizeOf(it).replace(/x/g, " x ")}</text>
      <text x="390" y="${y}" font-family="Courier New" font-size="20" fill="#222">${it.ply}</text>${val}`;
  }).join("\n");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="100%" height="100%" fill="#f3efe4"/>
    <text x="${W / 2}" y="60" text-anchor="middle" font-family="Courier New" font-size="30" font-weight="bold" fill="#222">RAJDHANI CARTON CO.</text>
    <text x="${W / 2}" y="95" text-anchor="middle" font-family="Courier New" font-size="18" fill="#333">RATE LIST - CORRUGATED BOXES (Nov 2026)</text>
    <text x="60" y="140" font-family="Courier New" font-size="18" fill="#333">S.No</text><text x="130" y="140" font-family="Courier New" font-size="18" fill="#333">Size (mm)</text><text x="380" y="140" font-family="Courier New" font-size="18" fill="#333">Ply</text><text x="460" y="140" font-family="Courier New" font-size="18" fill="#333">Rate Rs/pc</text>
    <line x1="60" y1="150" x2="${W - 60}" y2="150" stroke="#333"/>
    ${rowsSvg}
    <text x="70" y="${H - 30}" font-family="Courier New" font-size="16" fill="#333">Rates ex-GST, delivered. Sizes not listed not available.</text>
  </svg>`;
  const photo = join(d, "IMG_20261109_1842.jpg");
  // Rendered at ~3x (like a real phone camera), then tilted, softened and compressed.
  await sharp(Buffer.from(svg), { density: 220 })
    .rotate(-2, { background: "#5b4a3a" })
    .extend({ top: 180, bottom: 270, left: 210, right: 150, background: "#5b4a3a" })
    .blur(1.6)
    .modulate({ brightness: 0.93 })
    .jpeg({ quality: 72 })
    .toFile(photo);
  log(photo);
  await certificate(join(d, "ISO_Rajdhani.pdf"), { kind: "ISO 9001:2015", holder: "Rajdhani Carton Co.", number: "QMS/IN/19/2201", address: "Meerut Road Industrial Area, Ghaziabad, Uttar Pradesh", validUntil: "14 August 2026", issued: "15 August 2023" });
  await testReport(join(d, "BCT_Rajdhani.pdf"), { holder: "Rajdhani Carton Co.", number: "LAB/BCT/26/0388", result: 410, date: "30 January 2026" });
  writeText(join(d, "whatsapp.txt"), `
[09/11/26, 6:42 pm] Imran (Rajdhani Carton): Rate list attached sir. Some sizes not available.
[09/11/26, 6:42 pm] Imran (Rajdhani Carton): <attached: IMG_20261109_1842.jpg>
[09/11/26, 6:44 pm] Imran (Rajdhani Carton): ISO and test report also sending
[09/11/26, 6:44 pm] Imran (Rajdhani Carton): <attached: ISO_Rajdhani.pdf>
[09/11/26, 6:45 pm] Imran (Rajdhani Carton): <attached: BCT_Rajdhani.pdf>
`);
  inbox.push({ id: "MSG-D1", supplier_id: "D", channel: "WhatsApp", received_at: "2026-11-09T18:42:00+05:30", kind: "Quote", text_file: "D/whatsapp.txt", attachments: ["D/IMG_20261109_1842.jpg", "D/ISO_Rajdhani.pdf", "D/BCT_Rajdhani.pdf"] });

  writeText(join(d, "HOW_TO_TAKE_THE_PHOTO.md"), `
# Making the real handwritten photo (about 10 minutes)

A generated stand-in photo already exists (IMG_20261109_1842.jpg), so everything works without this.
A real photo is better for the live demo: real handwriting, real angle, real lighting.

1. Print **PRINT_ME_Rajdhani_RateCard.pdf** on plain A4.
2. With a blue pen, fill the 4 blank rates exactly as below:

| S.No | Box | Write this | Why |
|---|---|---|---|
| 3 | 300 x 200 x 150 | ${fmt2(q("D", "C03").quoted_value)} | Normal handwriting |
| 7 | 400 x 300 x 200 | ${fmt2(q("D", "C07").quoted_value)} | Write it messy, then strike through and re-write the first digit (tests "unsure" reading) |
| 14 | 450 x 350 x 350 | ${fmt2(q("D", "C14").quoted_value)} | Write exactly this — it is 10× too low on purpose (tests the outlier check) |
| 21 | 650 x 450 x 450 | ${fmt2(q("D", "C21").quoted_value)} | Normal handwriting |

3. Put the sheet on a desk, hold your phone at a slight angle (not straight above), take the photo in normal room light.
4. Save it over **IMG_20261109_1842.jpg** in this folder (same name).
`);
}

// =====================================================================================
// E — Mahalaxmi: one-line WhatsApp + buyer's note of a phone call
// =====================================================================================
async function supplierE() {
  const d = dir(EV, "E");
  writeText(join(d, "whatsapp.txt"), `
[10/11/26, 7:48 pm] Suresh Bansal (Mahalaxmi Box): Rishabh ji namaste
[10/11/26, 7:48 pm] Suresh Bansal (Mahalaxmi Box): ₹42/kg for the 5-ply, 38 for the 3-ply, rest same as last year, freight extra.
`);
  writeText(join(d, "call_note.txt"), `
Call note — logged by Rishabh (Buyer team), 11 Nov 2026, 4:12 pm
Spoke to: Suresh Bansal, Mahalaxmi Box Makers (Supplier)
Box C12 (3-ply, 500x400x300): he said Rs 31 per box including freight.
Also said: samples possible within 7 days. Did not answer other quality questions.
Asked him to confirm the C12 price in writing.
`);
  inbox.push({ id: "MSG-E1", supplier_id: "E", channel: "WhatsApp", received_at: "2026-11-10T19:48:00+05:30", kind: "Quote", text_file: "E/whatsapp.txt", attachments: [] });
  inbox.push({ id: "MSG-E2", supplier_id: "E", channel: "Call", received_at: "2026-11-11T16:12:00+05:30", kind: "Price on a call", text_file: "E/call_note.txt", attachments: [] });
}

// =====================================================================================
// F — Doon Corrupack: only an out-of-office reply, then silence
// =====================================================================================
async function supplierF() {
  const d = dir(EV, "F");
  writeText(join(d, "out_of_office.txt"), `
From: Ankit Thapa <ankit@dooncorrupack.example>
To: Rishabh <rishabh@rsgherbal.example>
Date: 04 Nov 2026, 09:00
Subject: Automatic reply: RFQ-2026-014 Corrugated boxes FY27

I am out of office until 15 Nov with limited access to email. For urgent matters please contact sales@dooncorrupack.example.
`);
  await certificate(join(d, "ISO_Doon.pdf"), { kind: "ISO 9001:2015", holder: "Doon Corrupack", number: "QMS/IN/21/3390", address: "Selaqui Industrial Area, Dehradun, Uttarakhand", validUntil: "31 December 2027", issued: "1 January 2025" });
  inbox.push({ id: "MSG-F1", supplier_id: "F", channel: "Email", received_at: "2026-11-04T09:00:00+05:30", kind: "Out of office", text_file: "F/out_of_office.txt", attachments: [] });
}

// =====================================================================================
// Supplier questions during the bidding window
// =====================================================================================
async function questions() {
  const d = dir(EV, "questions");
  writeText(join(d, "A_question.txt"), `From: Manoj Agarwal (Shree Ganesh Corrugators)\nDate: 05 Nov 2026, 11:15\n\nIs 1-colour printing of your logo included in the scope?\n`);
  writeText(join(d, "C_question.txt"), `From: Deepak Gupta (Om Sai Packaging Industries)\nDate: 05 Nov 2026, 17:40\n\nSir, kindly clarify whether printing is required on the boxes.\n`);
  writeText(join(d, "E_question.txt"), `[05/11/26, 9:02 am] Suresh Bansal (Mahalaxmi Box): Sir can we give rate per kg?\n`);
  inbox.push({ id: "MSG-Q1", supplier_id: "A", channel: "Email", received_at: "2026-11-05T11:15:00+05:30", kind: "Question", text_file: "questions/A_question.txt", attachments: [] });
  inbox.push({ id: "MSG-Q2", supplier_id: "C", channel: "Email", received_at: "2026-11-05T17:40:00+05:30", kind: "Question", text_file: "questions/C_question.txt", attachments: [] });
  inbox.push({ id: "MSG-Q3", supplier_id: "E", channel: "WhatsApp", received_at: "2026-11-05T09:02:00+05:30", kind: "Question", text_file: "questions/E_question.txt", attachments: [] });
}

// =====================================================================================
// Certificates & test reports (shared builders)
// =====================================================================================
function certificate(path, c) {
  return pdf(path, (doc) => {
    doc.rect(30, 30, 535, 782).lineWidth(3).strokeColor("#1d4f91").stroke();
    doc.rect(38, 38, 519, 766).lineWidth(0.8).stroke();
    F(doc).fillColor("#1d4f91").fontSize(13).text("BHARAT QUALITY CERTIFICATION SERVICES (demo body)", 50, 80, { align: "center", width: 495 });
    doc.fontSize(26).fillColor("#000").text("CERTIFICATE", 50, 140, { align: "center", width: 495 });
    doc.fontSize(11).text("This is to certify that the Quality Management System of", 50, 200, { align: "center", width: 495 });
    doc.fontSize(18).fillColor("#1d4f91").text(c.holder, 50, 230, { align: "center", width: 495 });
    doc.fontSize(10).fillColor("#000").text(c.address, 50, 260, { align: "center", width: 495 });
    doc.fontSize(11).text(`has been assessed and found to conform to the requirements of`, 50, 300, { align: "center", width: 495 });
    doc.fontSize(20).text(c.kind, 50, 325, { align: "center", width: 495 });
    doc.fontSize(10).text("Scope: Manufacture and supply of corrugated boxes and sheets", 50, 365, { align: "center", width: 495 });
    doc.fontSize(10).text(`Certificate No: ${c.number}`, 90, 470).text(`Date of issue: ${c.issued}`, 90, 490).text(`Valid until: ${c.validUntil}`, 90, 510);
    doc.fontSize(8).fillColor("#888").text("Demo document created for the RSG Herbal House prototype. Not a real certificate.", 50, 760, { align: "center", width: 495 });
  });
}
function testReport(path, t) {
  return pdf(path, (doc) => {
    F(doc).fontSize(15).fillColor("#7a1f1f").text("NORTHERN PACKAGING TEST LAB (demo)", { align: "center" });
    doc.fontSize(9).fillColor("#000").text("NABL-style accredited testing  ·  Kundli, Haryana", { align: "center" });
    doc.moveDown().fontSize(13).text("TEST REPORT — BOX COMPRESSION TEST (BCT)", { align: "center" });
    doc.moveDown().fontSize(10);
    [["Report No", t.number], ["Customer", t.holder], ["Sample", "5-ply corrugated box, 500 x 400 x 400 mm"], ["Test method", "IS 7028 (Part 6) / ASTM D642"], ["Date of test", t.date], ["Requirement stated by customer", "Not specified"], ["Result (average of 5 samples)", `${t.result} kgf`]].forEach(([k, v]) => doc.text(`${k}:  ${v}`, { lineGap: 6 }));
    doc.moveDown().text("Remarks: Results relate only to the samples tested.");
    doc.fontSize(8).fillColor("#888").text("Demo document created for the RSG Herbal House prototype. Not a real test report.", 50, 760, { align: "center", width: 495 });
  });
}

async function otherCerts() {
  await testReport(join(dir(EV, "A"), "BCT_Report_SGC.pdf"), { holder: "Shree Ganesh Corrugators", number: "LAB/BCT/26/0731", result: 540, date: "18 July 2026" });
  await certificate(join(dir(EV, "A"), "ISO_9001_SGPPL.pdf"), { kind: "ISO 9001:2015", holder: "Shree Ganesh Packaging Pvt Ltd", number: "QMS/IN/22/4417", address: "Plot 14, Industrial Area, Roorkee, Uttarakhand", validUntil: "30 June 2027", issued: "1 July 2024" });
  const d = dir(OUT, "suppliers", "I");
  writeText(join(d, "GST_Kraftline.txt"), `GST Registration Certificate (demo)\nLegal name: Kraftline Solutions\nGSTIN: 05AAJFK9876K1Z2\nAddress: Kashipur, Uttarakhand\nDate of registration: 12 March 2021\n`);
}

// =====================================================================================
// Team requests (company team → buyer)
// =====================================================================================
async function teamRequests() {
  const d = dir(OUT, "requests");
  writeText(join(d, "REQ-0142_whatsapp.txt"), `[02/11/26, 9:14 am] Sandeep Rawat (Stores, Haridwar): Rishabh ji, FY27 boxes ka annual contract banana hai. Same 30 sizes as this year, volume roughly 10% more because of the new line. Need rates finalised before Dec 15. Drawings same as last year. — Sandeep\n`);
  writeText(join(d, "REQ-0151_whatsapp.txt"), `[17/11/26, 9:20 am] Sandeep Rawat (Stores, Haridwar): Need 2,000 extra 5-ply boxes 600×400×400 for the new line by month end. Urgent.\n`);
  writeText(join(d, "REQ-0150_email.txt"), `From: Meera Iyer <meera.iyer@rsgherbal.example>\nTo: Rishabh\nDate: 16 Nov 2026, 17:42\nSubject: Office chairs\n\nHi Rishabh, we need office chairs for the new floor, around 60 nos. Budget approved. Please arrange.\nThanks, Meera\n`);
  writeText(join(d, "REQ-0135_email.txt"), `From: Sandeep Rawat <sandeep.rawat@rsgherbal.example>\nTo: Rishabh\nDate: 08 Nov 2026, 12:05\nSubject: BOPP tape Q4\n\nNeed BOPP tapes 48mm for Q4, around 6,000 rolls.\n`);
  writeFileSync(join(d, "REQ-0147_form.json"), JSON.stringify({ request_id: "REQ-0147", submitted_by: "Vikram Negi", role: "Plant Head", plant: "Baddi", date: "2026-11-14", what: "Corrugated boxes", details: "Annual requirement of corrugated boxes for Baddi plant, FY27. 18 sizes, list attached. Approx 4 lakh boxes.", attachment: "REQ-0147_Baddi_box_list.xlsx" }, null, 2)); log(join(d, "REQ-0147_form.json"));
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet("Baddi boxes");
  ws.addRow(["Size (mm)", "Ply", "Approx qty / yr"]).font = { bold: true };
  const pick = items.filter((_, i) => i % 5 !== 4).slice(0, 14);
  pick.forEach((it) => ws.addRow([sizeOf(it), it.ply, Math.round(it.yearly_qty * 0.4)]));
  [["320x240x180", 3, 9000], ["420x310x260", 5, 7000], ["520x360x310", 5, 6000], ["610x410x360", 5, 4000]].forEach((r) => ws.addRow(r));
  ws.columns.forEach((c) => (c.width = 18));
  await wb.xlsx.writeFile(join(d, "REQ-0147_Baddi_box_list.xlsx")); log(join(d, "REQ-0147_Baddi_box_list.xlsx"));
  writeFileSync(join(d, "REQ-0139_form.json"), JSON.stringify({ request_id: "REQ-0139", submitted_by: "Arjun Mehta", role: "IT Manager", plant: "Head office", date: "2026-11-12", what: "Laptops & monitors", details: "Refresh of 120 laptops + monitors for the sales team. Needed by January. Spec: i5/Ryzen 5, 16 GB RAM, 512 GB SSD, 14 inch; 24 inch FHD monitor." }, null, 2)); log(join(d, "REQ-0139_form.json"));
}

console.log("Creating supplier files…");
await supplierA(); await supplierB(); await supplierC(); await supplierD(); await supplierE(); await supplierF();
await questions(); await otherCerts(); await teamRequests();
inbox.sort((a, b) => a.received_at.localeCompare(b.received_at));
for (const m of inbox) m.text = readFileSync(join(EV, m.text_file), "utf8").trim();
writeFileSync(join(EV, "inbox.json"), JSON.stringify({ event: "RFQ-2026-014", deadline: "2026-11-12T18:00:00+05:30", messages: inbox }, null, 2));

// ---------- Outbox: everything we sent, and on which channel (sending is simulated in the demo)
const outbox = [];
const invited = ["A", "B", "C", "D", "E", "F"];
for (const id of invited) {
  const s = sup[id];
  const ch = s.preferred_channel;
  outbox.push({ id: `OUT-INV-${id}`, to_supplier: id, to: s.contact_person, channel: ch, address: ch === "WhatsApp" ? s.whatsapp : s.email, sent_at: "2026-11-03T10:00:00+05:30", kind: "Request for quotes",
    text: ch === "WhatsApp" ? `Namaste ${s.contact_person.split(" ")[0]} ji, RSG Herbal House invites your quote for 30 corrugated box sizes (FY27, Haridwar). Details and box list: https://quotes.rsgherbal.example/r/014-${id.toLowerCase()} — reply here in any format. Deadline 12 Nov, 6 pm.` : `Dear ${s.contact_person}, RSG Herbal House invites your quotation for our FY27 corrugated box contract (RFQ-2026-014). Request and box list attached. Reply in any format you like. Deadline: 12 Nov 2026, 6 pm.`,
    status: id === "F" ? "Delivered, auto-reply received" : "Delivered and opened" });
}
const ans = [
  { q: "Is 1-colour logo printing included?", a: "Yes, 1-colour flexo printing of our logo is included in the scope.", asked_by: ["A", "C"], at: "2026-11-06T10:00:00+05:30" },
  { q: "Can we quote per kg?", a: "Yes. Box weights are listed in the request, so per-kg prices can be compared.", asked_by: ["E"], at: "2026-11-05T12:00:00+05:30" },
];
ans.forEach((x, i) => invited.forEach((id) => {
  const s = sup[id];
  outbox.push({ id: `OUT-QA${i + 1}-${id}`, to_supplier: id, to: s.contact_person, channel: s.preferred_channel, address: s.preferred_channel === "WhatsApp" ? s.whatsapp : s.email, sent_at: x.at, kind: "Answer shared with all", text: `Question from a supplier: "${x.q}" Answer: ${x.a}`, status: "Delivered", asked_by: x.asked_by });
}));
[["2026-11-05T09:30:00+05:30", "Email", "Reminder 1: friendly reminder, quotes due 12 Nov.", "Auto-reply: out of office"], ["2026-11-08T09:30:00+05:30", "WhatsApp", "Reminder 2 (switched to WhatsApp because email got an out-of-office): please share your quote by 12 Nov.", "Delivered, not read"], ["2026-11-11T09:30:00+05:30", "WhatsApp", "Reminder 3: last day tomorrow. Shall we expect your quote?", "Delivered, not read"]].forEach(([at, ch, text, status], i) => {
  outbox.push({ id: `OUT-REM${i + 1}-F`, to_supplier: "F", to: sup.F.contact_person, channel: ch, address: ch === "WhatsApp" ? sup.F.whatsapp : sup.F.email, sent_at: at, kind: "Reminder", text, status });
});
outbox.push({ id: "OUT-CONF-E", to_supplier: "E", to: sup.E.contact_person, channel: "WhatsApp", address: sup.E.whatsapp, sent_at: "2026-11-11T16:20:00+05:30", kind: "Written confirmation request", text: "Suresh ji, as discussed on the call, please confirm in writing: box C12 at Rs 31 per box including freight.", status: "Delivered, not replied" });
outbox.sort((a, b) => a.sent_at.localeCompare(b.sent_at));
writeFileSync(join(EV, "outbox.json"), JSON.stringify({ event: "RFQ-2026-014", note: "Sending is simulated in this demo.", messages: outbox }, null, 2));
log(join(EV, "outbox.json"));
log(join(EV, "inbox.json"));
console.log(`\nDone: ${inbox.length} inbox messages.`);
