/**
 * `node scripts/make-test-cases.mjs` — builds the sample files in test-cases/ (Excel lists, etc.).
 * Text files (messages to paste, READMEs) are written by hand in each folder.
 */
import ExcelJS from "exceljs";
import { join } from "node:path";

const root = join(process.cwd(), "test-cases");

async function sheet(path, name, columns, rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(name);
  ws.columns = columns;
  rows.forEach((r) => ws.addRow(r));
  ws.getRow(1).font = { bold: true };
  await wb.xlsx.writeFile(path);
  console.log("wrote", path.replace(process.cwd() + "/", ""));
}

// 01 · Raise a request: the plant's own item list (2 sizes we already buy, 4 new ones; totals 1,20,000).
await sheet(join(root, "01-raise-request", "Haridwar_giftpack_box_list.xlsx"), "Gift pack boxes",
  [{ header: "Box size (mm)", key: "size", width: 18 }, { header: "Ply", key: "ply", width: 6 }, { header: "Qty per year", key: "qty", width: 14 }, { header: "Used for", key: "use", width: 34 }],
  [
    { size: "400x300x300", ply: 5, qty: 30000, use: "Chyawanprash 1 kg gift pack (outer)" },
    { size: "500x400x400", ply: 5, qty: 25000, use: "Family combo pack (outer)" },
    { size: "350x250x150", ply: 5, qty: 22000, use: "Chyawanprash 500 g twin pack" },
    { size: "300x220x180", ply: 3, qty: 18000, use: "Honey + Chyawanprash duo" },
    { size: "450x320x220", ply: 5, qty: 15000, use: "Festive hamper" },
    { size: "250x180x120", ply: 3, qty: 10000, use: "Sample / trial kit" },
  ]);

// ---------------------------------------------------------------------------------------------------
// 01 · Six supplier replies to the gift-pack request (L1–L6), one folder each: email.txt + one attachment.
// Lines: L1 400×300×300 5-ply · L2 500×400×400 5-ply · L3 350×250×150 5-ply · L4 300×220×180 3-ply
//        L5 450×320×220 5-ply · L6 250×180×120 3-ply (sample kit)
// ---------------------------------------------------------------------------------------------------
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import sharp from "sharp";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { mkdirSync, writeFileSync, createWriteStream } from "node:fs";

const R = join(root, "01-raise-request", "supplier-replies");
const dir = (n) => { const d = join(R, n); mkdirSync(d, { recursive: true }); return d; };
const email = (d, subject, body) => writeFileSync(join(d, "email.txt"), `SUBJECT\n${subject}\n\nBODY\n${body}\n`);
GlobalFonts.registerFromPath("/System/Library/Fonts/Supplemental/Bradley Hand Bold.ttf", "Hand");

// 1 · Shree Ganesh: Excel in their own layout, own codes, per 100 pcs, one size in cm, rows reordered.
{
  const d = dir("1-shree-ganesh-excel");
  email(d, "RE: Gift pack boxes - quotation SGC/2611/118", "Dear Rishabh ji,\n\nPlease find attached our rates for the gift pack boxes in our standard format.\nRates are ex-works Roorkee; GST 18% and freight extra.\nValid till 31 Dec 2026.\n\nRegards,\nManoj Agarwal\nShree Ganesh Corrugators, Roorkee");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("SGC Rates");
  ws.mergeCells("A1:F1"); ws.getCell("A1").value = "SHREE GANESH CORRUGATORS - QUOTATION SGC/2611/118"; ws.getCell("A1").font = { bold: true, size: 13 };
  ws.getCell("A2").value = "For: RSG Herbal House, Haridwar   |   Date: 18-Nov-2026";
  ws.addRow([]);
  const h = ws.addRow(["SGC Code", "Description", "Size", "Ply", "GSM", "Rate (Rs per 100 pcs)"]); h.font = { bold: true };
  [
    ["SG-5P-5040", "Combo outer", "500x400x400 mm", 5, 980, 6290],
    ["SG-3P-2518", "Trial kit", "250x180x120 mm", 3, 650, 540],
    ["SG-5P-4030", "Gift pack outer", "40x30x30 cm", 5, 980, 3780],
    ["SG-5P-4532", "Hamper", "450x320x220 mm", 5, 980, 3960],
    ["SG-3P-3022", "Duo pack", "300x220x180 mm", 3, 650, 1015],
    ["SG-5P-3525", "Twin pack", "350x250x150 mm", 5, 980, 2310],
  ].forEach((r) => ws.addRow(r));
  ws.addRow([]);
  ws.addRow(["Terms: Ex-works Roorkee. GST 18% extra. Freight extra at actuals. Payment 45 days. Validity 31-Dec-2026."]);
  ws.columns.forEach((c, i) => (c.width = [14, 18, 18, 6, 7, 22][i]));
  await wb.xlsx.writeFile(join(d, "SGC_Quotation_GiftPack.xlsx"));
  console.log("wrote 1-shree-ganesh-excel");
}

// 2 · Pacific PackWorks: PDF on letterhead, USD incl. GST, 2.5% discount in a footnote on page 2, L5 priced twice.
{
  const d = dir("2-pacific-pdf-usd");
  email(d, "Pacific PackWorks - Quotation PPW/Q/2611/052", "Dear Mr Rishabh,\n\nThank you for your enquiry. Please find our quotation attached (2 pages).\n\nBest regards,\nRahul Bose\nKey Accounts, Pacific PackWorks India Pvt Ltd");
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(createWriteStream(join(d, "PPW-Q-2611-052.pdf")));
  doc.rect(0, 0, 595, 70).fill("#0b3d6b");
  doc.fill("#ffffff").fontSize(18).font("Helvetica-Bold").text("PACIFIC PACKWORKS", 50, 22);
  doc.fontSize(9).font("Helvetica").text("India Pvt Ltd  ·  A Pacific Pack Group company (Singapore)  ·  Noida, Uttar Pradesh", 50, 46);
  doc.fill("#000000").fontSize(11).font("Helvetica-Bold").text("QUOTATION  PPW/Q/2611/052", 50, 95);
  doc.font("Helvetica").fontSize(10).text("To: RSG Herbal House, Haridwar plant     Date: 18 Nov 2026     Valid: 30 days", 50, 112);
  doc.moveDown(1.2).fontSize(10).text("All prices in US Dollars (USD) per piece, inclusive of GST, delivered to Haridwar.*", 50);
  const rows = [["1", "Corrugated box 5-ply, 400 x 300 x 300 mm", "0.52"], ["2", "Corrugated box 5-ply, 500 x 400 x 400 mm", "0.86"], ["3", "Corrugated box 5-ply, 350 x 250 x 150 mm", "0.33"], ["4", "Corrugated box 3-ply, 300 x 220 x 180 mm", "0.14"], ["5", "Corrugated box 5-ply, 450 x 320 x 220 mm", "0.55"], ["6", "Corrugated box 3-ply, 250 x 180 x 120 mm", "0.075"]];
  let y = 175;
  doc.font("Helvetica-Bold").text("S.No", 50, y).text("Description", 90, y).text("Unit price (USD)", 430, y); y += 18;
  doc.font("Helvetica");
  for (const r of rows) { doc.text(r[0], 50, y).text(r[1], 90, y).text(r[2], 430, y); y += 18; }
  doc.text("Payment: 30 days from invoice.  Lead time: 3 weeks.", 50, y + 20);
  doc.addPage();
  doc.font("Helvetica-Bold").fontSize(11).text("Annexure A - revised price for the hamper box", 50, 60);
  doc.font("Helvetica").fontSize(10).text("Item 5, Corrugated box 5-ply, 450 x 320 x 220 mm: USD 0.58 per piece (board upgraded to 1050 GSM).", 50, 82);
  doc.text("ISO 9001:2015 certificate no. QMS/IN/88213, valid to 2027-08-31, attached on request.", 50, 110);
  doc.fontSize(7).fill("#666666").text("* A 2.5% discount applies to all items for purchase orders confirmed within 15 days of this quotation. Prices exclude freight insurance.", 50, 760);
  doc.end();
  await new Promise((r) => setTimeout(r, 300));
  console.log("wrote 2-pacific-pdf-usd");
}

// 3 · Om Sai: Word letter, prices inside paragraphs, a 7-ply alternative for L5, discount only if all six.
{
  const d = dir("3-om-sai-word");
  email(d, "Offer for gift pack corrugated boxes", "Respected Sir,\n\nKindly find our offer letter attached for your new gift pack line.\n\nThanking you,\nDeepak Gupta\nOm Sai Packaging Industries, Saharanpur");
  const p = (t, bold = false) => new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: t, bold, size: 22 })] });
  const doc = new Document({ sections: [{ children: [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: "OM SAI PACKAGING INDUSTRIES", bold: true, size: 30 })] }),
    p("Ref: OSPI/OFF/2611/27                                   Date: 18 November 2026"),
    p("To, The Purchase Department, RSG Herbal House, Haridwar"),
    p("Subject: Offer for corrugated boxes for your Chyawanprash gift pack line", true),
    p("Respected Sir, with reference to your enquiry we are pleased to offer as below. All rates are per box, exclusive of GST, delivered at your Haridwar plant."),
    p("For the gift pack outer box of 400 x 300 x 300 mm in 5-ply we offer Rs. 38.40 per box, and for the family combo box of 500 x 400 x 400 mm, also 5-ply, our rate is Rs. 63.10 per box."),
    p("The 5-ply twin pack box of 350 x 250 x 150 mm will be Rs. 23.75 each, while the 3-ply duo box of 300 x 220 x 180 mm comes to Rs. 10.20 each. The small 3-ply trial kit box (250 x 180 x 120 mm) is Rs. 5.55."),
    p("For the festive hamper box of 450 x 320 x 220 mm we recommend 7-ply instead of the 5-ply asked, as hampers are heavy; our rate for the 7-ply box is Rs. 49.80. We do not make this size in 5-ply."),
    p("We will give an additional 4% discount if all six boxes are ordered from us."),
    p("We are ISO 9001 certified. Samples can be sent within 7 days. Payment 60 days."),
    p("Thanking you and assuring you of our best services."),
    p("For Om Sai Packaging Industries,  Deepak Gupta (Proprietor)", true),
  ] }] });
  writeFileSync(join(d, "OmSai_Offer_GiftPack.docx"), await Packer.toBuffer(doc));
  console.log("wrote 3-om-sai-word");
}

// Paper-like canvas helper
function paper(w, h, tint = "#f6f2e7") {
  const c = createCanvas(w, h); const g = c.getContext("2d");
  g.fillStyle = tint; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(120,100,60,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  return { c, g };
}

// 4 · Rajdhani: printed rate card photographed at an angle, 5 of 6 sizes, pen corrections, one price 10× too low.
{
  const d = dir("4-rajdhani-angled-photo");
  email(d, "Rates for gift boxes", "Sir, rate card photo attached. 350x250x150 we don't make.\nRegards, Imran Qureshi, Rajdhani Carton Co.");
  const { c, g } = paper(1400, 1800);
  g.fillStyle = "#222"; g.font = "bold 54px Courier New"; g.fillText("RAJDHANI CARTON CO.", 260, 150);
  g.font = "34px Courier New"; g.fillText("RATE LIST - GIFT BOXES (Nov 2026)", 250, 215);
  g.fillText("S.No  Size (mm)        Ply   Rate Rs/pc", 110, 330); g.fillRect(110, 345, 1180, 3);
  const rows = [["1", "400 x 300 x 300", "5", "37.20", false], ["2", "500 x 400 x 400", "5", "", "61.90"], ["3", "300 x 220 x 180", "3", "", "0.99"], ["4", "450 x 320 x 220", "5", "40.10", false], ["5", "250 x 180 x 120", "3", "5.40", false]];
  rows.forEach((r, i) => {
    const y = 430 + i * 110; g.fillStyle = "#222"; g.font = "36px Courier New";
    g.fillText(`${r[0]}     ${r[1]}     ${r[2]}`, 120, y);
    if (r[3]) g.fillText(r[3], 1000, y);
    if (r[4]) { g.fillStyle = "#1f3b9a"; g.font = "64px Hand"; g.fillText(r[4], 990, y + 6); }
  });
  g.fillStyle = "#222"; g.font = "28px Courier New"; g.fillText("Rates ex-GST, delivered Haridwar. Sizes not listed not available.", 110, 1100);
  const png = c.toBuffer("image/png");
  await sharp(png).rotate(-7, { background: "#5b4a3a" }).affine([[1, 0.12], [0.02, 1]], { background: "#5b4a3a" }).modulate({ brightness: 0.93 }).jpeg({ quality: 78 }).toFile(join(d, "IMG_20261118_1105.jpg"));
  console.log("wrote 4-rajdhani-angled-photo");
}

// 5 · Mahalaxmi: WhatsApp screenshot, per kg, freight extra, sample kit refused.
{
  const d = dir("5-mahalaxmi-whatsapp-screenshot");
  email(d, "Fwd: WhatsApp rates", "Sir, sending screenshot of what I sent on WhatsApp.\nSuresh Bansal, Mahalaxmi Box Makers");
  const W = 750, H = 1334; const c = createCanvas(W, H); const g = c.getContext("2d");
  g.fillStyle = "#efe7de"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#075e54"; g.fillRect(0, 0, W, 130); g.fillStyle = "#fff"; g.font = "bold 34px Helvetica"; g.fillText("Rishabh RSG Herbal", 110, 80); g.font = "22px Helvetica"; g.fillText("online", 110, 112);
  const bubble = (y, lines, time) => {
    const h = 40 + lines.length * 40; g.fillStyle = "#dcf8c6"; g.beginPath(); g.roundRect(120, y, 590, h, 18); g.fill();
    g.fillStyle = "#111"; g.font = "30px Helvetica"; lines.forEach((l, i) => g.fillText(l, 145, y + 48 + i * 40));
    g.fillStyle = "#667"; g.font = "20px Helvetica"; g.fillText(`${time} ✓✓`, 600, y + h - 12);
    return y + h + 24;
  };
  let y = 200;
  y = bubble(y, ["Rishabh ji namaste 🙏"], "11:02 am");
  y = bubble(y, ["Gift pack boxes rate:", "5 ply ₹44 per kg", "3 ply ₹39 per kg"], "11:03 am");
  y = bubble(y, ["Freight extra, GST extra"], "11:03 am");
  y = bubble(y, ["Sample kit box (250x180x120)", "not possible sir, too small"], "11:04 am");
  y = bubble(y, ["Order mile to 10 din me supply"], "11:05 am");
  await sharp(c.toBuffer("image/png")).png().toFile(join(d, "Screenshot_2026-11-18-11-06.png"));
  console.log("wrote 5-mahalaxmi-whatsapp-screenshot");
}

// 6 · Doon Corrupack: handwritten note, photographed blurry, one ambiguous digit.
{
  const d = dir("6-doon-handwritten-blurry");
  email(d, "rates", "Rishabh bhai, written rates attached. sorry for the photo, in a hurry.\nAnkit, Doon Corrupack");
  const { c, g } = paper(1300, 1700, "#fbf8ee");
  g.strokeStyle = "rgba(80,120,200,0.25)"; for (let y = 160; y < 1650; y += 80) { g.beginPath(); g.moveTo(40, y); g.lineTo(1260, y); g.stroke(); }
  g.fillStyle = "#14287a"; g.font = "58px Hand";
  const lines = ["Doon Corrupack - Gift box rates", "per box, delivered Haridwar, GST extra", "", "400x300x300  5ply  -  Rs 36.80", "500x400x400  5ply  -  Rs 62.40", "350x250x150  5ply  -  Rs 24.10", "300x220x180  3ply  -  Rs 9.90", "450x320x220  5ply  -  Rs 39.60", "250x180x120  3ply  -  Rs 5.20", "", "valid 15 days  -  Ankit"];
  lines.forEach((l, i) => { g.save(); g.translate(90 + (i % 2) * 6, 230 + i * 120); g.rotate((Math.random() - 0.5) * 0.03); g.fillText(l, 0, 0); g.restore(); });
  await sharp(c.toBuffer("image/png")).rotate(3, { background: "#3d3a35" }).blur(2.2).modulate({ brightness: 0.88 }).jpeg({ quality: 62 }).toFile(join(d, "WhatsApp_Image_2026-11-18_at_11.20.jpg"));
  console.log("wrote 6-doon-handwritten-blurry");
}

// ---------------------------------------------------------------------------------------------------
// 02 · Baddi plant's 18-box request (REQ-0147). Six supplier replies with new rough edges.
// Lines (as in the Baddi list): L1 200×150×100 3p · L2 250×200×150 3p · L3 300×200×150 3p · L4 300×250×200 3p
// L5 350×300×250 3p · L6 400×300×200 3p · L7 400×300×300 3p · L8 450×300×250 3p · L9 500×300×300 3p
// L10 500×400×300 3p · L11 400×300×300 5p · L12 450×350×350 5p · L13 500×400×400 5p · L14 550×400×400 5p
// L15 320×240×180 3p (new) · L16 420×310×260 5p (new) · L17 520×360×310 5p (new) · L18 610×410×360 5p (new)
// ---------------------------------------------------------------------------------------------------
{
  const R2 = join(root, "02-baddi-team-request", "supplier-replies");
  const dir2 = (n) => { const d = join(R2, n); mkdirSync(d, { recursive: true }); return d; };
  const L = [
    ["200x150x100", 3, 3.93], ["250x200x150", 3, 6.70], ["300x200x150", 3, 7.69], ["300x250x200", 3, 10.41], ["350x300x250", 3, 16.05],
    ["400x300x200", 3, 15.09], ["400x300x300", 3, 18.72], ["450x300x250", 3, 17.66], ["500x300x300", 3, 20.40], ["500x400x300", 3, 27.67],
    ["400x300x300", 5, 34.24], ["450x350x350", 5, 47.15], ["500x400x400", 5, 60.17], ["550x400x400", 5, 60.92],
    ["320x240x180", 3, 9.60], ["420x310x260", 5, 43.80], ["520x360x310", 5, 62.50], ["610x410x360", 5, 86.90],
  ];
  const r2 = (x) => Math.round(x * 100) / 100;
  const pretty = (s) => s.replace(/x/g, " x ");

  // 1 · Shree Ganesh: two emails. Excel per 1,000 pcs, then a revised Excel that replaces it (3 rates lower).
  {
    const sg = async (file, cut) => {
      const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet("Baddi rates");
      ws.addRow(["SHREE GANESH CORRUGATORS - Rates for RSG Herbal House, Baddi plant"]).font = { bold: true };
      ws.addRow([cut ? "REVISED quotation SGC/2611/131-R1 (replaces SGC/2611/131)" : "Quotation SGC/2611/131"]);
      ws.addRow([]);
      ws.addRow(["S.No", "Box size (mm)", "Ply", "Rate (Rs per 1000 pcs)"]).font = { bold: true };
      L.forEach(([s, p, b], i) => ws.addRow([i + 1, s, p, Math.round(b * 1.06 * (cut && [10, 12, 13].includes(i) ? 0.94 : 1) * 1000)]));
      ws.addRow([]); ws.addRow(["Delivered Baddi. GST 18% extra. Payment 45 days."]);
      ws.columns.forEach((c, i) => (c.width = [6, 16, 6, 22][i]));
      await wb.xlsx.writeFile(file);
    };
    const d1 = dir2("1-shree-ganesh-two-emails/email-1-first-quote");
    email(d1, "Quotation for Baddi boxes - SGC/2611/131", "Dear Rishabh ji,\n\nPlease find attached our rates for the 18 sizes for your Baddi plant.\nRates per 1000 pcs, delivered Baddi, GST extra.\n\nRegards,\nManoj Agarwal\nShree Ganesh Corrugators");
    await sg(join(d1, "SGC_Baddi_Rates.xlsx"), false);
    const d2 = dir2("1-shree-ganesh-two-emails/email-2-revised-quote");
    email(d2, "REVISED quotation - SGC/2611/131-R1", "Dear Rishabh ji,\n\nPlease ignore our earlier quotation. Revised rates attached: we have reduced the rates for the three 5-ply sizes 400x300x300, 500x400x400 and 550x400x400.\nAll other rates unchanged.\n\nRegards,\nManoj Agarwal");
    await sg(join(d2, "SGC_Baddi_Rates_REVISED.xlsx"), true);
    console.log("wrote 02/1-shree-ganesh-two-emails");
  }

  // 2 · Pacific: PDF in rupees, GST included, with a grand total that doesn't add up.
  {
    const d = dir2("2-pacific-pdf-total-mismatch");
    email(d, "PPW quotation for Baddi plant - PPW/Q/2611/067", "Dear Mr Rishabh,\n\nPlease find our quotation attached. All prices are in Indian Rupees and include GST.\n\nBest regards,\nRahul Bose\nPacific PackWorks India Pvt Ltd");
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    doc.pipe(createWriteStream(join(d, "PPW-Q-2611-067.pdf")));
    doc.rect(0, 0, 595, 60).fill("#0b3d6b"); doc.fill("#fff").font("Helvetica-Bold").fontSize(16).text("PACIFIC PACKWORKS", 40, 20);
    doc.fill("#000").fontSize(11).text("QUOTATION PPW/Q/2611/067  -  RSG Herbal House, Baddi plant", 40, 80);
    doc.font("Helvetica").fontSize(9).text("Prices in INR per piece, INCLUSIVE of GST @18%, delivered Baddi.", 40, 98);
    let y = 125; doc.font("Helvetica-Bold").text("No", 40, y).text("Size (mm)", 70, y).text("Ply", 200, y).text("Qty / yr", 240, y).text("Rate incl. GST (Rs)", 320, y).text("Amount (Rs)", 450, y); y += 16; doc.font("Helvetica");
    const qty = [38400, 34400, 32000, 25600, 19200, 19200, 17200, 14800, 12800, 10800, 17200, 14800, 12800, 12000, 9000, 7000, 6000, 4000];
    let sum = 0;
    L.forEach(([s, p, b], i) => { const rate = r2(b * (p === 3 ? 0.97 : 1.06) * 1.18); const amt = Math.round(rate * qty[i]); sum += amt; doc.text(String(i + 1), 40, y).text(pretty(s), 70, y).text(String(p), 200, y).text(qty[i].toLocaleString("en-IN"), 240, y).text(rate.toFixed(2), 320, y).text(amt.toLocaleString("en-IN"), 450, y); y += 15; });
    const stated = Math.round(sum * 1.08); // deliberately wrong by 8%
    doc.font("Helvetica-Bold").text("GRAND TOTAL (annual, incl. GST)", 240, y + 8).text(`Rs ${stated.toLocaleString("en-IN")}`, 450, y + 8);
    doc.font("Helvetica").fontSize(8).text("Payment 30 days. Validity 30 days. Lead time 3 weeks.", 40, y + 34);
    doc.end(); await new Promise((r) => setTimeout(r, 300));
    console.log("wrote 02/2-pacific-pdf-total-mismatch");
  }

  // 3 · Om Sai: PDF catalogue with their nearest standard sizes for 4 boxes, ex-works, freight extra.
  {
    const d = dir2("3-om-sai-pdf-near-sizes");
    email(d, "Om Sai standard size price list for Baddi", "Respected Sir,\n\nPlease find our standard size price list. For four of your sizes we have quoted our nearest standard die size, which is cheaper to make.\nRates ex-works Saharanpur, freight extra, GST extra.\n\nThanks,\nDeepak Gupta\nOm Sai Packaging Industries");
    const near = { 4: "355x305x255", 8: "505x305x305", 14: "322x242x182", 16: "525x365x315" };
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    doc.pipe(createWriteStream(join(d, "OmSai_Standard_Price_List.pdf")));
    doc.font("Helvetica-Bold").fontSize(15).text("OM SAI PACKAGING INDUSTRIES", 40, 40);
    doc.font("Helvetica").fontSize(10).text("Standard size price list  -  for RSG Herbal House (Baddi)  -  Nov 2026", 40, 62);
    doc.text("Rates per box, ex-works Saharanpur. Freight extra. GST 18% extra.", 40, 78);
    let y = 110; doc.font("Helvetica-Bold").text("Item", 40, y).text("Size (mm)", 90, y).text("Ply", 230, y).text("Rate (Rs/box)", 280, y).text("Remarks", 380, y); y += 16; doc.font("Helvetica");
    L.forEach(([s, p, b], i) => { const size = near[i] ?? s; doc.text(`OS-${101 + i}`, 40, y).text(pretty(size), 90, y).text(String(p), 230, y).text(r2(b * 1.02).toFixed(2), 280, y).text(near[i] ? "nearest standard size" : "", 380, y); y += 15; });
    doc.end(); await new Promise((r) => setTimeout(r, 300));
    console.log("wrote 02/3-om-sai-pdf-near-sizes");
  }

  // 4 · Rajdhani: screenshot of a spreadsheet, only 9 of 18 priced, rest "On request".
  {
    const d = dir2("4-rajdhani-spreadsheet-screenshot");
    email(d, "Rates - partial", "Sir, screenshot of our rate sheet attached. Bigger sizes rate on request, our machine is busy this month.\nImran, Rajdhani Carton Co.");
    const W = 1100, H = 760; const c = createCanvas(W, H); const g = c.getContext("2d");
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#1d6f42"; g.fillRect(0, 0, W, 40); g.fillStyle = "#fff"; g.font = "bold 18px Helvetica"; g.fillText("Rajdhani_rates_Baddi.xlsx  -  Excel", 16, 26);
    const cols = [40, 90, 330, 400, 560]; const heads = ["", "Box size (mm)", "Ply", "Rate Rs/pc", "Remarks"];
    g.font = "bold 17px Helvetica"; g.fillStyle = "#f3f3f3"; g.fillRect(0, 50, W, 32); g.fillStyle = "#222"; heads.forEach((h, i) => g.fillText(h, cols[i] + 6, 72));
    g.strokeStyle = "#d4d4d4";
    L.forEach(([s, p, b], i) => {
      const y = 82 + i * 34; g.strokeRect(0, y, W, 34); g.fillStyle = "#666"; g.font = "15px Helvetica"; g.fillText(String(i + 2), 8, y + 22);
      g.fillStyle = "#111"; g.font = "17px Helvetica"; g.fillText(pretty(s), cols[1] + 6, y + 22); g.fillText(String(p), cols[2] + 6, y + 22);
      if (i < 9) g.fillText(r2(b * 1.04).toFixed(2), cols[3] + 6, y + 22); else { g.fillStyle = "#b45309"; g.fillText("On request", cols[3] + 6, y + 22); }
    });
    cols.forEach((x) => { g.beginPath(); g.moveTo(x, 50); g.lineTo(x, 82 + 18 * 34); g.stroke(); });
    await sharp(c.toBuffer("image/png")).png().toFile(join(d, "Screenshot_rates_sheet.png"));
    console.log("wrote 02/4-rajdhani-spreadsheet-screenshot");
  }

  // 5 · Mahalaxmi: per kg in the email, plus a phone-call note with one price given only on the call.
  {
    const d = dir2("5-mahalaxmi-email-plus-call-note");
    email(d, "Baddi box rates", "Rishabh ji namaste,\n\nOur rates for Baddi: 5 ply Rs 46 per kg, 3 ply Rs 40 per kg. Freight extra, GST extra.\nFor the 500x400x400 5-ply I told you a special rate on the phone, see note.\n\nSuresh Bansal\nMahalaxmi Box Makers");
    writeFileSync(join(d, "Call_note_18Nov.txt"), "Call note - logged by Rishabh (Buyer team), 18 Nov 2026, 3:40 pm\nSpoke to: Suresh Bansal, Mahalaxmi Box Makers\n500 x 400 x 400 mm 5-ply: he said Rs 58 per box, delivered Baddi, GST extra.\nSaid he will confirm in writing by Friday.\n");
    console.log("wrote 02/5-mahalaxmi-email-plus-call-note");
  }

  // 6 · Doon Corrupack: Word letter, "same as current contract" for existing sizes, prices for the 4 new ones, conditional discount.
  {
    const d = dir2("6-doon-word-same-as-contract");
    email(d, "Doon Corrupack offer for Baddi plant", "Dear Rishabh,\n\nOur offer letter is attached. For all sizes we already supply you, our rates stay the same as the current contract.\n\nRegards,\nAnkit Thapa\nDoon Corrupack, Dehradun");
    const p = (t, bold = false) => new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: t, bold, size: 22 })] });
    const doc = new Document({ sections: [{ children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: "DOON CORRUPACK", bold: true, size: 30 })] }),
      p("Ref: DC/OFF/2611/09                                   18 November 2026"),
      p("To: RSG Herbal House, Baddi plant  -  Subject: Offer for corrugated boxes FY27", true),
      p("Dear Sir, thank you for your enquiry for 18 box sizes."),
      p("For all 14 sizes that we already supply to your Haridwar plant, our rates remain the same as our current rate contract RC-FY26-BOX-01. Rest same as last year."),
      p("For the four new sizes our rates per box, delivered, exclusive of GST, are: 320 x 240 x 180 mm 3-ply Rs 9.80; 420 x 310 x 260 mm 5-ply Rs 44.50; 520 x 360 x 310 mm 5-ply Rs 63.90; 610 x 410 x 360 mm 5-ply Rs 88.20."),
      p("An additional 3% discount applies if the total annual order is above 1 lakh boxes."),
      p("Payment 60 days. ISO 9001 certified."),
      p("For Doon Corrupack,  Ankit Thapa", true),
    ] }] });
    writeFileSync(join(d, "Doon_Offer_Baddi.docx"), await Packer.toBuffer(doc));
    console.log("wrote 02/6-doon-word-same-as-contract");
  }
}
