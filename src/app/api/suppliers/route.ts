import { nowIso } from "@/lib/csv-file";
import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

/**
 * POST /api/suppliers — adds a new supplier to data/seed/suppliers.csv (and its contact to people.csv),
 * then reloads the app data (npm run seed). Local demo only: everything stays on this laptop.
 */
const ROOT = process.cwd();
const SUP = join(ROOT, "data", "seed", "suppliers.csv");
const PEOPLE = join(ROOT, "data", "seed", "people.csv");

const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const clean = (v: unknown) => String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 200);

function readRows(path: string) {
  const text = readFileSync(path, "utf8").replace(/^﻿/, "");
  const [head, ...lines] = text.trim().split("\n");
  return { head: head.split(","), lines };
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const name = clean(b.name);
  const contact = clean(b.contact_person);
  const channels: string[] = Array.isArray(b.channels) ? b.channels.map(clean).filter((c: string) => ["Email", "WhatsApp", "Phone", "SMS"].includes(c)) : [];
  const email = clean(b.email);
  const phone = clean(b.phone);
  const whatsapp = clean(b.whatsapp);
  const gstin = clean(b.gstin).toUpperCase();

  const errors: Record<string, string> = {};
  if (name.length < 3) errors.name = "Enter the company name.";
  if (!contact) errors.contact_person = "Enter a contact person.";
  if (!clean(b.city)) errors.city = "Enter the city.";
  if (channels.length === 0) errors.channels = "Pick at least one way to reach them.";
  if (channels.includes("Email") && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = "Enter a valid email, or untick Email.";
  if ((channels.includes("WhatsApp") || channels.includes("SMS")) && !/^\+?[\d\s-]{10,16}$/.test(whatsapp || phone)) errors.whatsapp = "Enter a mobile number for WhatsApp / SMS.";
  if (channels.includes("Phone") && !/^\+?[\d\s-]{10,16}$/.test(phone)) errors.phone = "Enter a phone number, or untick Phone.";
  if (gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(gstin)) errors.gstin = "GSTIN should look like 05AAJFK9876K1Z2 (15 characters).";
  const preferred = channels.includes(clean(b.preferred_channel)) ? clean(b.preferred_channel) : channels[0];

  const sup = readRows(SUP);
  const idx = (k: string) => sup.head.indexOf(k);
  const existing = sup.lines.map((l) => l.split(","));
  if (existing.some((r) => r[idx("name")]?.replace(/"/g, "").toLowerCase() === name.toLowerCase())) errors.name = "This supplier is already in your list.";
  if (gstin && existing.some((r) => r[idx("gstin")] === gstin)) errors.gstin = "A supplier with this GSTIN already exists.";
  if (Object.keys(errors).length) return NextResponse.json({ ok: false, errors }, { status: 400 });

  const nums = existing.map((r) => r[0]).filter((id) => /^N\d+$/.test(id)).map((id) => Number(id.slice(1)));
  const id = `N${(nums.length ? Math.max(...nums) : 0) + 1}`;
  const today = new Date().toISOString().slice(0, 10);
  const row: Record<string, string> = {
    supplier_id: id, name, category: clean(b.category) || "Corrugated boxes", city: clean(b.city), state: clean(b.state), contact_person: contact,
    phone, email, whatsapp: channels.includes("WhatsApp") ? whatsapp || phone : "", channels: channels.join("; "), preferred_channel: preferred,
    gstin, status: "New", added_on: today, updated_at: nowIso(), found_via: clean(b.found_via) || "Added by buyer",
    warning: "New supplier: no history with us yet. Needs GST, PAN and ISO papers and approved samples before any award.",
  };
  writeFileSync(SUP, readFileSync(SUP, "utf8").replace(/\n?$/, "\n") + sup.head.map((h) => esc(row[h] ?? "")).join(",") + "\n");

  const ppl = readRows(PEOPLE);
  const pn = Math.max(...ppl.lines.map((l) => Number(l.split(",")[0].slice(1)) || 0)) + 1;
  const prow: Record<string, string> = { person_id: `P${String(pn).padStart(2, "0")}`, name: contact, side: "Supplier", role: "Sales contact", organisation: name, location: row.city, email, phone, whatsapp: row.whatsapp, preferred_channel: preferred };
  writeFileSync(PEOPLE, readFileSync(PEOPLE, "utf8").replace(/\n?$/, "\n") + ppl.head.map((h) => esc(prow[h] ?? "")).join(",") + "\n");

  execFileSync(process.execPath, [join(ROOT, "scripts", "seed.mjs")], { cwd: ROOT });
  return NextResponse.json({ ok: true, id, name });
}
