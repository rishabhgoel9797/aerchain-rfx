/**
 * ONE-TIME generator for the demo company "RSG Herbal House" (Ayurvedic products).
 * Writes the master data sheets to data/seed/ and the answer key to data/answer-key/.
 *
 * After the first run, the CSV files are the source of truth: open them in Excel, edit,
 * then run `npm run seed` to load them into the app. Re-running this script OVERWRITES them,
 * so it refuses to run if data/seed already exists unless you pass --force.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED = join(root, "data", "seed");
const KEY = join(root, "data", "answer-key");

if (existsSync(SEED) && !process.argv.includes("--force")) {
  console.error("data/seed already exists. Edit the CSVs directly, or pass --force to regenerate (overwrites edits).");
  process.exit(1);
}
mkdirSync(SEED, { recursive: true });
mkdirSync(KEY, { recursive: true });

const esc = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const writeCsv = (dir, name, rows) => {
  const cols = Object.keys(rows[0]);
  const out = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n") + "\n";
  writeFileSync(join(dir, name), "\uFEFF" + out); // BOM so Excel reads ₹ and × correctly
  console.log(`  ${dir === SEED ? "seed" : "answer-key"}/${name}  (${rows.length} rows)`);
};
const r2 = (x) => Math.round(x * 100) / 100;
const r3 = (x) => Math.round(x * 1000) / 1000;

// ---------------------------------------------------------------- items
// [ply, L, W, H, yearly qty, what it ships]
const DIMS = [
  [3, 200, 150, 100, 96000, "Herbal tea 100 g × 24"], [3, 250, 200, 150, 86000, "Churna 100 g × 36"], [3, 300, 200, 150, 80000, "Ashwagandha capsules 60s × 48"],
  [3, 300, 250, 200, 64000, "Triphala tablets 120s × 48"], [3, 350, 250, 200, 59000, "Herbal face wash 100 ml × 48"], [3, 350, 300, 250, 48000, "Amla juice 500 ml × 12"],
  [3, 400, 300, 200, 48000, "Herbal soap 75 g × 144"], [3, 400, 300, 300, 43000, "Hair oil 200 ml × 36"], [3, 450, 300, 250, 37000, "Aloe vera gel 150 g × 48"],
  [3, 450, 350, 300, 32000, "Chyawanprash 250 g × 36"], [3, 500, 300, 300, 32000, "Herbal toothpaste 150 g × 72"], [3, 500, 400, 300, 27000, "Mixed retail carton (e-commerce)"],
  [5, 400, 300, 300, 43000, "Chyawanprash 500 g × 24"], [5, 450, 350, 350, 37000, "Chyawanprash 1 kg × 12"], [5, 500, 400, 300, 37000, "Amla juice 1 L × 12"],
  [5, 500, 400, 400, 32000, "Aloe vera juice 1 L × 12"], [5, 550, 400, 400, 30000, "Hair oil 500 ml × 24"], [5, 600, 400, 300, 30000, "Honey 500 g × 24"],
  [5, 600, 400, 400, 27000, "Ghee-based rasayana 500 g × 24"], [5, 600, 500, 400, 24000, "Distributor master carton (small)"], [5, 650, 450, 450, 19000, "Gift pack combo × 12"],
  [5, 700, 500, 400, 16000, "Distributor master carton (medium)"], [5, 700, 500, 500, 13000, "Herbal powders 1 kg × 12"], [5, 750, 500, 500, 11000, "Institutional pack 5 kg × 4"],
  [5, 800, 600, 500, 9000, "Distributor master carton (large)"], [7, 800, 600, 600, 6500, "Bulk herbs 10 kg"], [7, 900, 600, 600, 5300, "Bulk churna 15 kg"],
  [7, 1000, 600, 600, 4300, "Export carton (sea freight)"], [7, 1000, 800, 600, 3200, "Bulk oil drums outer"], [7, 1200, 800, 800, 2100, "Machinery spares outer"],
];
const GSM = { 3: 560, 5: 980, 7: 1380 };
const BASE_PER_KG = { 3: 41, 5: 45, 7: 49 };

const items = DIMS.map(([ply, l, w, h, qty, use], i) => {
  const kg = (((2 * l + 2 * w + 35) / 1000) * ((w + h) / 1000) * GSM[ply]) / 1000;
  return {
    item_code: `C${String(i + 1).padStart(2, "0")}`,
    description: `${ply}-ply corrugated box, ${l}×${w}×${h} mm`,
    ply, length_mm: l, width_mm: w, height_mm: h,
    board_gsm: GSM[ply],
    weight_kg: r3(kg),
    yearly_qty: qty,
    price_unit: "per box",
    used_for: use,
    plant: "Haridwar",
  };
});
writeCsv(SEED, "items.csv", items);

// ---------------------------------------------------------------- suppliers
const suppliers = [
  { supplier_id: "A", name: "Shree Ganesh Corrugators", category: "Corrugated boxes", city: "Roorkee", state: "Uttarakhand", contact_person: "Manoj Agarwal", phone: "+91 90000 10001", email: "manoj@shreeganesh.example", preferred_channel: "Email", status: "Approved", added_on: "2019-04-01", found_via: "Existing supplier", warning: "" },
  { supplier_id: "B", name: "Pacific PackWorks India Pvt Ltd", category: "Corrugated boxes", city: "Noida", state: "Uttar Pradesh", contact_person: "Rahul Bose", phone: "+91 90000 10002", email: "rahul.bose@pacificpack.example", preferred_channel: "Email", status: "Approved", added_on: "2022-07-15", found_via: "Existing supplier", warning: "Subsidiary of a Singapore group, quotes in US dollars" },
  { supplier_id: "C", name: "Om Sai Packaging Industries", category: "Corrugated boxes", city: "Saharanpur", state: "Uttar Pradesh", contact_person: "Deepak Gupta", phone: "+91 90000 10003", email: "deepak@omsaipack.example", preferred_channel: "Email", status: "Approved", added_on: "2020-01-10", found_via: "Existing supplier", warning: "" },
  { supplier_id: "D", name: "Rajdhani Carton Co.", category: "Corrugated boxes", city: "Ghaziabad", state: "Uttar Pradesh", contact_person: "Imran Qureshi", phone: "+91 90000 10004", email: "", preferred_channel: "WhatsApp", status: "Approved", added_on: "2021-03-22", found_via: "Existing supplier", warning: "" },
  { supplier_id: "E", name: "Mahalaxmi Box Makers", category: "Corrugated boxes", city: "Haridwar (SIDCUL)", state: "Uttarakhand", contact_person: "Suresh Bansal", phone: "+91 90000 10005", email: "", preferred_channel: "WhatsApp", status: "Approved", added_on: "2018-11-05", found_via: "Existing supplier", warning: "" },
  { supplier_id: "F", name: "Doon Corrupack", category: "Corrugated boxes", city: "Dehradun", state: "Uttarakhand", contact_person: "Ankit Thapa", phone: "+91 90000 10006", email: "ankit@dooncorrupack.example", preferred_channel: "Email", status: "Approved", added_on: "2017-06-01", found_via: "Existing supplier", warning: "Current box contract holder, ends 31 Mar 2027" },
  { supplier_id: "G", name: "Unity Box House", category: "Corrugated boxes", city: "Meerut", state: "Uttar Pradesh", contact_person: "Rakesh Tyagi", phone: "+91 90000 10007", email: "rakesh@unitybox.example", preferred_channel: "Email", status: "Blocked", added_on: "2020-09-14", found_via: "Existing supplier", warning: "Blocked since Mar 2026: two deliveries failed the box-strength test" },
  { supplier_id: "H", name: "Sai Om Corrugation LLP", category: "Corrugated boxes", city: "Saharanpur", state: "Uttar Pradesh", contact_person: "Pooja Gupta", phone: "+91 90000 10008", email: "pooja@saiomcorr.example", preferred_channel: "Email", status: "Approved", added_on: "2024-02-02", found_via: "Referral", warning: "Same directors and address as Om Sai Packaging Industries (C)" },
  { supplier_id: "I", name: "Kraftline Solutions", category: "Corrugated boxes", city: "Kashipur", state: "Uttarakhand", contact_person: "Ravi Joshi", phone: "+91 90000 10009", email: "ravi@kraftline.example", preferred_channel: "Email", status: "New", added_on: "2026-11-15", found_via: "IndiaMART", warning: "New supplier: no history with us; PAN and ISO papers missing" },
  { supplier_id: "S1", name: "Sunrise Tapes", category: "Packaging consumables", city: "Haridwar", state: "Uttarakhand", contact_person: "Nitin Saini", phone: "+91 90000 10010", email: "nitin@sunrisetapes.example", preferred_channel: "Email", status: "Approved", added_on: "2021-05-01", found_via: "Existing supplier", warning: "" },
  { supplier_id: "S2", name: "Annapurna Caterers", category: "Canteen services", city: "Haridwar", state: "Uttarakhand", contact_person: "Geeta Rawat", phone: "+91 90000 10011", email: "geeta@annapurna.example", preferred_channel: "Phone", status: "Approved", added_on: "2023-03-01", found_via: "Existing supplier", warning: "" },
];
writeCsv(SEED, "suppliers.csv", suppliers);

// ---------------------------------------------------------------- people
const people = [
  { person_id: "P01", name: "Rishabh", side: "Buyer team", role: "Category Buyer, Packaging", organisation: "RSG Herbal House", location: "New Delhi (Head office)" },
  { person_id: "P02", name: "Neha Sharma", side: "Buyer team", role: "Category Buyer, Raw herbs & MRO", organisation: "RSG Herbal House", location: "Haridwar" },
  { person_id: "P03", name: "Karan Malhotra", side: "Buyer team", role: "Category Buyer, Logistics & IT", organisation: "RSG Herbal House", location: "New Delhi (Head office)" },
  { person_id: "P04", name: "Anil Deshpande", side: "Buyer team", role: "Head of Procurement", organisation: "RSG Herbal House", location: "New Delhi (Head office)" },
  { person_id: "P05", name: "Sandeep Rawat", side: "Company team", role: "Stores Manager", organisation: "RSG Herbal House", location: "Haridwar plant" },
  { person_id: "P06", name: "Vikram Negi", side: "Company team", role: "Plant Head", organisation: "RSG Herbal House", location: "Baddi plant" },
  { person_id: "P07", name: "Meera Iyer", side: "Company team", role: "Admin Manager", organisation: "RSG Herbal House", location: "New Delhi (Head office)" },
  { person_id: "P08", name: "Arjun Mehta", side: "Company team", role: "IT Manager", organisation: "RSG Herbal House", location: "New Delhi (Head office)" },
  { person_id: "P09", name: "Kavita Rao", side: "Company team", role: "CFO", organisation: "RSG Herbal House", location: "New Delhi (Head office)" },
  { person_id: "P10", name: "Dr. Shalini Verma", side: "Company team", role: "Head of Quality", organisation: "RSG Herbal House", location: "Haridwar plant" },
  ...suppliers.map((s, i) => ({ person_id: `P${String(11 + i).padStart(2, "0")}`, name: s.contact_person, side: "Supplier", role: "Sales contact", organisation: s.name, location: s.city })),
];
writeCsv(SEED, "people.csv", people);

// ---------------------------------------------------------------- track record (FY26). No row = no history (new supplier).
const track = [
  { supplier_id: "A", year: "FY26", on_time_pct: 94, share_of_box_spend_pct: 18, deliveries: 46, rejected_deliveries: 1, invoice_mismatches: 0 },
  { supplier_id: "B", year: "FY26", on_time_pct: 97, share_of_box_spend_pct: 9, deliveries: 22, rejected_deliveries: 0, invoice_mismatches: 0 },
  { supplier_id: "C", year: "FY26", on_time_pct: 88, share_of_box_spend_pct: 14, deliveries: 35, rejected_deliveries: 1, invoice_mismatches: 1 },
  { supplier_id: "D", year: "FY26", on_time_pct: 71, share_of_box_spend_pct: 6, deliveries: 17, rejected_deliveries: 2, invoice_mismatches: 0 },
  { supplier_id: "E", year: "FY26", on_time_pct: 90, share_of_box_spend_pct: 15, deliveries: 38, rejected_deliveries: 0, invoice_mismatches: 2 },
  { supplier_id: "F", year: "FY26", on_time_pct: 92, share_of_box_spend_pct: 38, deliveries: 96, rejected_deliveries: 1, invoice_mismatches: 0 },
  { supplier_id: "G", year: "FY26", on_time_pct: 63, share_of_box_spend_pct: 0, deliveries: 8, rejected_deliveries: 2, invoice_mismatches: 1 },
  { supplier_id: "H", year: "FY26", on_time_pct: 85, share_of_box_spend_pct: 0, deliveries: 4, rejected_deliveries: 0, invoice_mismatches: 0 },
];
writeCsv(SEED, "supplier_track_record.csv", track);

// ---------------------------------------------------------------- last year's prices
const noise = (i, s) => (((i * 37 + s * 101) % 15) - 7) / 100;
const base = (it) => it.weight_kg * BASE_PER_KG[it.ply];

const lastYear = [];
items.forEach((it, idx) => {
  // Doon Corrupack (F) held the FY26 contract for all 30 boxes and was cheapest.
  lastYear.push({ supplier_id: "F", item_code: it.item_code, price_per_box_inr: r2(base(it) * 0.97 * (1 + noise(idx, 9) / 2)), basis: "Delivered Haridwar, before GST", contract_ref: "RC-FY26-BOX-01", valid_until: "2027-03-31" });
});
// Mahalaxmi (E) supplied only two 7-ply sizes last year — so "rest same as last year" only partly resolves.
for (const code of ["C26", "C27"]) {
  const it = items.find((x) => x.item_code === code);
  lastYear.push({ supplier_id: "E", item_code: code, price_per_box_inr: r2(base(it) * 1.01), basis: "Ex-works Haridwar, before GST", contract_ref: "PO-4471 (spot order)", valid_until: "2026-03-31" });
}
writeCsv(SEED, "last_year_prices.csv", lastYear);

// ---------------------------------------------------------------- contracts
writeCsv(SEED, "contracts.csv", [
  { contract_id: "RC-FY26-BOX-01", supplier_id: "F", category: "Corrugated boxes", covers: "All 30 box sizes, Haridwar plant", valid_from: "2025-04-01", valid_until: "2027-03-31", status: "Active, ending soon" },
  { contract_id: "RC-FY26-TAPE-02", supplier_id: "S1", category: "Packaging consumables", covers: "BOPP tape 48 mm and 72 mm", valid_from: "2025-02-16", valid_until: "2027-02-15", status: "Active" },
  { contract_id: "SC-FY26-CANT-01", supplier_id: "S2", category: "Canteen services", covers: "Haridwar plant canteen, 2 shifts", valid_from: "2024-03-01", valid_until: "2027-02-28", status: "Active, ending soon" },
]);

// ---------------------------------------------------------------- market prices
writeCsv(SEED, "market_prices.csv", [
  { item: "Kraft paper (BF 18, 120 gsm)", unit: "INR per kg", price: 32.5, date: "2026-08-12", source: "Paper mill price index (demo)" },
  { item: "Kraft paper (BF 18, 120 gsm)", unit: "INR per kg", price: 33.1, date: "2026-09-12", source: "Paper mill price index (demo)" },
  { item: "Kraft paper (BF 18, 120 gsm)", unit: "INR per kg", price: 33.8, date: "2026-10-12", source: "Paper mill price index (demo)" },
  { item: "Kraft paper (BF 18, 120 gsm)", unit: "INR per kg", price: 34.5, date: "2026-11-12", source: "Paper mill price index (demo)" },
  { item: "US dollar", unit: "INR per USD", price: 84.2, date: "2026-11-12", source: "RBI reference rate (demo)" },
]);

// ---------------------------------------------------------------- company rules
writeCsv(SEED, "company_rules.csv", [
  { rule_id: "R1", rule: "Minimum suppliers to invite", value: "3", applies_to: "All sourcing events" },
  { rule_id: "R2", rule: "Head of Procurement approval needed above", value: "INR 25 lakh per year", applies_to: "Awards" },
  { rule_id: "R3", rule: "CFO approval also needed above", value: "INR 1 crore per year", applies_to: "Awards" },
  { rule_id: "R4", rule: "Late quotes", value: "Rejected, unless the deadline is extended for all suppliers", applies_to: "Collecting quotes" },
  { rule_id: "R5", rule: "Standard payment terms", value: "60 days from delivery", applies_to: "All suppliers" },
  { rule_id: "R6", rule: "New suppliers", value: "GST, PAN and ISO papers plus approved samples before any award", applies_to: "Awards" },
  { rule_id: "R7", rule: "Blocked suppliers", value: "Cannot be invited", applies_to: "Choosing suppliers" },
  { rule_id: "R8", rule: "Quality questions", value: "Answers must be backed by a valid document", applies_to: "Quotes" },
]);

// ---------------------------------------------------------------- supplier documents (what each supplier has sent us / attached)
writeCsv(SEED, "supplier_documents.csv", [
  { doc_id: "DOC-A1", supplier_id: "A", doc_type: "ISO 9001 certificate", number: "QMS/IN/22/4417", issued_to: "Shree Ganesh Packaging Pvt Ltd", valid_until: "2027-06-30", file: "files/A/ISO_9001_SGPPL.pdf", status: "Name doesn't match supplier" },
  { doc_id: "DOC-A2", supplier_id: "A", doc_type: "GST certificate", number: "05AAKCS1234F1Z5", issued_to: "Shree Ganesh Corrugators", valid_until: "", file: "files/A/GST.pdf", status: "Checked" },
  { doc_id: "DOC-B1", supplier_id: "B", doc_type: "ISO 9001 certificate", number: "SG-ISO-88213", issued_to: "Pacific PackWorks India Pvt Ltd", valid_until: "2028-03-31", file: "files/B/ISO_9001_PPW.pdf", status: "Checked" },
  { doc_id: "DOC-B2", supplier_id: "B", doc_type: "Box-strength test report (5-ply)", number: "LAB/BCT/26/0912", issued_to: "Pacific PackWorks India Pvt Ltd", valid_until: "2027-09-30", file: "files/B/BCT_Test_Report.pdf", status: "Checked" },
  { doc_id: "DOC-C1", supplier_id: "C", doc_type: "Box-strength test report (5-ply)", number: "LAB/BCT/26/0577", issued_to: "Om Sai Packaging Industries", valid_until: "2027-05-31", file: "files/C/BCT_Report_OmSai.pdf", status: "Checked" },
  { doc_id: "DOC-D1", supplier_id: "D", doc_type: "ISO 9001 certificate", number: "QMS/IN/19/2201", issued_to: "Rajdhani Carton Co.", valid_until: "2026-08-14", file: "files/D/ISO_Rajdhani.pdf", status: "Expired" },
  { doc_id: "DOC-D2", supplier_id: "D", doc_type: "Box-strength test report (5-ply)", number: "LAB/BCT/26/0388", issued_to: "Rajdhani Carton Co.", valid_until: "2027-01-31", file: "files/D/BCT_Rajdhani.pdf", status: "Fails our spec (410 kg vs 500 kg)" },
  { doc_id: "DOC-F1", supplier_id: "F", doc_type: "ISO 9001 certificate", number: "QMS/IN/21/3390", issued_to: "Doon Corrupack", valid_until: "2027-12-31", file: "files/F/ISO_Doon.pdf", status: "Checked" },
  { doc_id: "DOC-I1", supplier_id: "I", doc_type: "GST certificate", number: "05AAJFK9876K1Z2", issued_to: "Kraftline Solutions", valid_until: "", file: "files/I/GST_Kraftline.pdf", status: "Checked" },
]);

// ---------------------------------------------------------------- quality questions (asked in every box RFQ)
const QUESTIONS = [
  { question_id: "Q1", question: "Are you ISO 9001 certified?", proof_needed: "ISO 9001 certificate" },
  { question_id: "Q2", question: "Box-strength test report for 5-ply boxes (min 500 kg)", proof_needed: "Lab test report" },
  { question_id: "Q3", question: "Recycled fibre content at least 60%?", proof_needed: "Declaration" },
  { question_id: "Q4", question: "Can you send samples within 7 days?", proof_needed: "None" },
  { question_id: "Q5", question: "Capacity of at least 1 lakh boxes a month?", proof_needed: "Declaration" },
];
writeCsv(SEED, "quality_questions.csv", QUESTIONS);

// ================================================================ ANSWER KEY
// What each supplier will WRITE in their file (quoted_as), and the TRUE comparable price
// (₹ per box, before GST, delivered Haridwar). The AI never sees this folder; we use it
// to generate the supplier files and to score the AI's reading.

const USD = 84.2;
const MULT = { A: 1.03, B: 0.995, C: 1.05, D: 0.94 };
const quotes = [];
items.forEach((it, idx) => {
  for (const sup of ["A", "B", "C", "D", "E"]) {
    const si = "ABCDE".indexOf(sup) + 1;
    const row = { supplier_id: sup, item_code: it.item_code, quoted_as: "", quoted_value: "", quoted_unit: "", true_price_inr_per_box: "", expected_status: "green", trap: "" };
    if (sup === "E") {
      if (it.ply !== 7) {
        const perKg = it.ply === 5 ? 42 : 38;
        Object.assign(row, { quoted_as: `₹${perKg}/kg for the ${it.ply}-ply, freight extra`, quoted_value: perKg, quoted_unit: "INR per kg, ex-works", true_price_inr_per_box: r2(it.weight_kg * perKg * 1.04), trap: "Per-kg price → × box weight; freight extra → +4% estimate" });
        if (it.item_code === "C12") Object.assign(row, { quoted_as: "Phone call: ₹31 per box incl. freight", quoted_value: 31, quoted_unit: "INR per box, delivered (spoken)", true_price_inr_per_box: 31, expected_status: "amber", trap: "Spoken on a call, not in writing" });
      } else if (it.item_code === "C26" || it.item_code === "C27") {
        Object.assign(row, { quoted_as: "rest same as last year", quoted_value: "", quoted_unit: "Last year's price", true_price_inr_per_box: r2(base(it) * 1.01 * 1.04), trap: "Look up last year's price (PO-4471) + freight estimate" });
      } else {
        Object.assign(row, { quoted_as: "rest same as last year", quoted_value: "", quoted_unit: "Last year's price", true_price_inr_per_box: "", expected_status: "red", trap: "No last-year record for this box → Missing, ask supplier" });
      }
    } else if (sup === "D" && ["C28", "C29", "C30"].includes(it.item_code)) {
      Object.assign(row, { quoted_as: "(not on rate card)", quoted_unit: "", expected_status: "amber", trap: "Not quoted → show 'Not quoted', never zero" });
    } else {
      const v = r2(base(it) * MULT[sup] * (1 + noise(idx, si)));
      if (sup === "A") Object.assign(row, { quoted_as: `₹${r2(v * 100)} per 100 pcs`, quoted_value: r2(v * 100), quoted_unit: "INR per 100 boxes, delivered, before GST", true_price_inr_per_box: v, trap: "Per 100 pcs → ÷ 100; own product code" });
      if (sup === "B") {
        const listUsd = r3(((v / 0.98) * 1.18) / USD);
        Object.assign(row, { quoted_as: `USD ${listUsd} incl. GST`, quoted_value: listUsd, quoted_unit: "USD per box, delivered, incl. 18% GST, before 2% discount", true_price_inr_per_box: r2(((listUsd * USD) / 1.18) * 0.98), trap: "USD → INR at 84.20; remove GST; apply 2% footnote discount" });
      }
      if (sup === "C") Object.assign(row, { quoted_as: `Rs. ${v}/- per box`, quoted_value: v, quoted_unit: "INR per box, delivered, before GST", true_price_inr_per_box: v, trap: "Price inside a paragraph; 5% off only if all 30 items awarded" });
      if (sup === "D") Object.assign(row, { quoted_as: `${v}`, quoted_value: v, quoted_unit: "INR per box (handwritten rate card)", true_price_inr_per_box: v, trap: "Read from an angled photo" });
      // specific traps
      if (sup === "A" && it.item_code === "C09") Object.assign(row, { expected_status: "amber", trap: "Supplier code SG-3P-4530 is an unsure match to C09" });
      if (sup === "B" && it.item_code === "C05") Object.assign(row, { expected_status: "red", trap: "Page 1 and page 3 show different prices for this box" });
      if (sup === "C" && it.item_code === "C18") Object.assign(row, { quoted_as: `No 5-ply in this size, can give 7-ply at Rs. ${r2(v * 1.18)}/-`, quoted_value: r2(v * 1.18), true_price_inr_per_box: "", expected_status: "amber", trap: "Alternative item (7-ply) → not compared as the same box" });
      if (sup === "D" && it.item_code === "C07") Object.assign(row, { expected_status: "amber", trap: "Blurry digit in the photo → mark unsure, show the crop" });
      if (sup === "D" && it.item_code === "C14") Object.assign(row, { quoted_as: `${r2(v / 10)}`, quoted_value: r2(v / 10), expected_status: "amber", trap: "Written as a tenth of the real price (missing digit) → outlier flag" });
    }
    quotes.push(row);
  }
});
writeCsv(KEY, "quotes.csv", quotes);

writeCsv(KEY, "quote_terms.csv", [
  { supplier_id: "A", currency: "INR", price_unit: "per 100 boxes", gst: "Extra", freight: "Included", payment_days: 60, lead_time_weeks: 3, valid_until: "2027-01-31", discount: "", minimum_order: "5,000 per size", file_format: "Excel, own layout" },
  { supplier_id: "B", currency: "USD", price_unit: "per box", gst: "Included (18%)", freight: "Included", payment_days: 45, lead_time_weeks: 2, valid_until: "2026-11-24", discount: "2% on all items (footnote, page 3)", minimum_order: "", file_format: "PDF on letterhead, 3 pages" },
  { supplier_id: "C", currency: "INR", price_unit: "per box", gst: "Extra", freight: "Included", payment_days: 90, lead_time_weeks: 6, valid_until: "2026-12-31", discount: "5% only if all 30 items are awarded", minimum_order: "", file_format: "Word letter, prices in paragraphs" },
  { supplier_id: "D", currency: "INR", price_unit: "per box", gst: "Extra", freight: "Included", payment_days: 30, lead_time_weeks: 3, valid_until: "", discount: "", minimum_order: "", file_format: "Photo of printed rate card with pen corrections" },
  { supplier_id: "E", currency: "INR", price_unit: "per kg", gst: "Not stated", freight: "Extra", payment_days: 60, lead_time_weeks: 2, valid_until: "", discount: "", minimum_order: "", file_format: "One-line WhatsApp + phone call" },
]);

const ANS = {
  A: ["Yes (certificate name doesn't match)", "Yes, report attached", "70%", "Yes", "1.5 lakh"],
  B: ["Yes, valid to 2028", "Yes, report attached", "65%", "Yes", "3 lakh"],
  C: ["Says yes, no certificate attached", "Yes, report attached", "60%", "Yes", "1.2 lakh"],
  D: ["Certificate expired 14 Aug 2026", "410 kg, fails our 500 kg spec", "60%", "Yes", "1 lakh"],
  E: ["Not answered", "Not answered", "Not answered", "Yes (said on the call)", "Not answered"],
};
const quality = [];
for (const [sup, arr] of Object.entries(ANS)) arr.forEach((a, i) => quality.push({ supplier_id: sup, question_id: `Q${i + 1}`, answer: a }));
writeCsv(KEY, "quality_answers.csv", quality);

console.log("\nDone. Open data/seed/*.csv in Excel to review. Then run: npm run seed");
