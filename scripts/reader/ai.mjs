/**
 * The AI step. Provider-agnostic: any OpenAI-compatible API (Groq today; Gemini, OpenAI etc.
 * by changing AI_PROVIDER / AI_MODEL in .env.local).
 *
 * The AI only READS and INTERPRETS. It never converts units, does maths or decides colours —
 * code does that afterwards, so every number is reproducible.
 */
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const PROVIDERS = {
  groq: { baseURL: "https://api.groq.com/openai/v1", key: "GROQ_API_KEY" },
  gemini: { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/", key: "GEMINI_API_KEY" },
  openai: { baseURL: undefined, key: "OPENAI_API_KEY" },
};

export function aiClient() {
  const provider = process.env.AI_PROVIDER || (process.env.ANTHROPIC_API_KEY ? "anthropic" : "groq");
  if (provider === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is missing in .env.local");
    return { client: new Anthropic(), model: process.env.AI_MODEL ?? "claude-haiku-5-5", provider };
  }
  const p = PROVIDERS[provider];
  if (!p) throw new Error(`Unknown AI_PROVIDER "${provider}"`);
  const apiKey = process.env[p.key];
  if (!apiKey) throw new Error(`${p.key} is missing in .env.local`);
  return { client: new OpenAI({ apiKey, baseURL: p.baseURL }), model: process.env.AI_MODEL ?? "openai/gpt-oss-120b", provider };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Ask for JSON, validate it against a schema, retry on rate limits and on invalid output. */
export async function askJson({ system, user, schema, label, jsonSchema, images = [] }) {
  const { client, model, provider } = aiClient();
  if (provider === "anthropic") return askClaude({ client, model, system, user, schema, label, jsonSchema, images });
  let lastErr;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const t0 = Date.now();
      const res = await client.chat.completions.create({
        model,
        temperature: 0,
        reasoning_effort: process.env.AI_REASONING ?? "low",
        max_completion_tokens: Number(process.env.AI_MAX_TOKENS ?? 5500),
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      });
      const text = res.choices[0]?.message?.content ?? "";
      const parsed = schema.safeParse(JSON.parse(text));
      if (!parsed.success) throw new Error(`Invalid AI output: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
      return { data: parsed.data, usage: res.usage, ms: Date.now() - t0, model };
    } catch (e) {
      lastErr = e;
      const status = e?.status;
      // 429 = rate limit, 413 = request too big for this minute's token budget (free tier: 8,000 tokens/min)
      const wait = status === 429 ? Number(e?.headers?.get?.("retry-after") ?? 20) * 1000 + 1000 : status === 413 ? 61000 : 2000 * attempt;
      console.log(`    ${label}: attempt ${attempt} failed (${status ?? ""} ${String(e.message).slice(0, 140)}). Retrying in ${Math.round(wait / 1000)}s…`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

/**
 * Claude via the official Anthropic SDK. Structured outputs (output_config.format) guarantee the
 * reply matches the JSON schema; zod then validates it again on our side. Photos are sent as images
 * next to their OCR text, so Claude can cross-check handwriting.
 */
async function askClaude({ client, model, system, user, schema, label, jsonSchema, images }) {
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const t0 = Date.now();
      const content = [
        ...images.map((img) => ({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data } })),
        { type: "text", text: user },
      ];
      const res = await client.messages.create({
        model,
        max_tokens: 16000,
        system,
        messages: [{ role: "user", content }],
        ...(jsonSchema ? { output_config: { format: { type: "json_schema", schema: jsonSchema } } } : {}),
      });
      if (res.stop_reason === "refusal") throw new Error(`Refused: ${res.stop_details?.explanation ?? "no reason given"}`);
      if (res.stop_reason === "max_tokens") throw new Error("Reply was cut off (max_tokens)");
      const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      const parsed = schema.safeParse(JSON.parse(text));
      if (!parsed.success) throw new Error(`Invalid AI output: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
      return { data: parsed.data, usage: { total_tokens: (res.usage?.input_tokens ?? 0) + (res.usage?.output_tokens ?? 0) }, ms: Date.now() - t0, model };
    } catch (e) {
      lastErr = e;
      if (e instanceof Anthropic.AuthenticationError) throw new Error("Claude rejected the API key. Check ANTHROPIC_API_KEY in .env.local.");
      if (e instanceof Anthropic.BadRequestError) { console.log(`    ${label}: bad request: ${String(e.message).slice(0, 300)}`); throw e; }
      const wait = e instanceof Anthropic.RateLimitError ? 30000 : 3000 * attempt;
      console.log(`    ${label}: attempt ${attempt} failed (${String(e.message).slice(0, 160)}). Retrying in ${Math.round(wait / 1000)}s…`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

// Plain JSON schemas for Claude's structured outputs (every object closed, every key required; null where optional).
const nul = (t) => ({ anyOf: [{ type: t }, { type: "null" }] });
const obj = (props) => ({ type: "object", properties: props, required: Object.keys(props), additionalProperties: false });
const en = (...v) => ({ type: "string", enum: v });
// Max 16 nullable fields allowed, so text fields use "" for "not given" and applies_to_ply uses 0.
const str = { type: "string" };
export const QUOTE_JSON_SCHEMA = obj({
  prices: { type: "array", items: obj({
    loc: str, supplier_text: str, supplier_item_ref: str, our_item_code: str,
    applies_to_ply: { type: "integer" }, match_confidence: en("high", "medium", "low"), value: nul("number"),
    unit: en("per_box", "per_100", "per_1000", "per_kg", "unknown"), currency: en("INR", "USD", "unknown"),
    gst: en("included", "excluded", "unknown"), freight: en("included", "extra", "unknown"), source: en("written", "spoken", "unclear"),
    is_alternative: { type: "boolean" }, reading_unsure: { type: "boolean" }, note: str,
  }) },
  same_as_last_year: { anyOf: [obj({ applies_to: str, loc: str, supplier_text: str }), { type: "null" }] },
  terms: obj({ price_unit: str, currency: str, gst: str, freight: str, payment_days: nul("number"), lead_time_weeks: nul("number"), valid_until: str, minimum_order: str }),
  discounts: { type: "array", items: obj({ percent: nul("number"), condition: str, applies_unconditionally: { type: "boolean" }, loc: str }) },
  stated_total: { anyOf: [obj({ value: nul("number"), currency: str, basis: str, loc: str }), { type: "null" }] },
  quality_answers: { type: "array", items: obj({ question_id: en("Q1", "Q2", "Q3", "Q4", "Q5"), answer: str, loc: str, proof_attached_claimed: { type: "boolean" } }) },
  replaces_earlier_quote: str,
  not_offered: { type: "array", items: obj({ our_item_code: str, supplier_text: str, loc: str }) },
});
export const CERT_JSON_SCHEMA = obj({ doc_type: { type: "string" }, issued_to: { type: "string" }, number: { type: "string" }, valid_until: { type: "string" }, test_result_kgf: nul("number"), loc: { type: "string" } });

// ------------------------------------------------------------------ Quote reading
const num = z.union([z.number(), z.string().transform((s) => Number(String(s).replace(/[^\d.-]/g, "")))]).nullable().optional();

export const QuoteSchema = z.object({
  prices: z.array(z.object({
    loc: z.string(),
    supplier_text: z.string(),
    supplier_item_ref: z.string().nullable().optional(),
    our_item_code: z.string().nullable().optional(),
    applies_to_ply: num,
    match_confidence: z.enum(["high", "medium", "low"]).catch("medium"),
    value: num,
    unit: z.enum(["per_box", "per_100", "per_1000", "per_kg", "unknown"]).catch("unknown"),
    currency: z.enum(["INR", "USD", "unknown"]).catch("unknown"),
    gst: z.enum(["included", "excluded", "unknown"]).catch("unknown"),
    freight: z.enum(["included", "extra", "unknown"]).catch("unknown"),
    source: z.enum(["written", "spoken", "unclear"]).catch("written"),
    is_alternative: z.boolean().catch(false),
    reading_unsure: z.boolean().catch(false),
    note: z.string().nullable().optional(),
  })),
  same_as_last_year: z.preprocess((v) => {
    if (v == null || v === false) return null;
    if (Array.isArray(v)) v = v[0];
    if (typeof v === "string") return { applies_to: v, loc: "", supplier_text: v };
    return v;
  }, z.object({ applies_to: z.string().catch(""), loc: z.string().catch(""), supplier_text: z.string().catch("") }).nullable()).optional(),
  terms: z.object({
    currency: z.string().nullable().optional(),
    gst: z.string().nullable().optional(),
    freight: z.string().nullable().optional(),
    payment_days: num,
    lead_time_weeks: num,
    valid_until: z.string().nullable().optional(),
    minimum_order: z.string().nullable().optional(),
    price_unit: z.string().nullable().optional(),
  }).partial().catch({}),
  discounts: z.array(z.object({ percent: num, condition: z.string(), applies_unconditionally: z.boolean().catch(false), loc: z.string() })).catch([]),
  stated_total: z.object({ value: num, currency: z.string().nullable().optional(), basis: z.string().nullable().optional(), loc: z.string() }).nullable().optional(),
  quality_answers: z.array(z.object({ question_id: z.string(), answer: z.string(), loc: z.string(), proof_attached_claimed: z.boolean().catch(false) })).catch([]),
  replaces_earlier_quote: z.preprocess((v) => (typeof v === "string" && v.trim() ? v : null), z.string().nullable()).optional(),
  not_offered: z.array(z.object({ our_item_code: z.string().catch(""), supplier_text: z.string().catch(""), loc: z.string().catch("") })).catch([]),
});

export function quoteSystemPrompt() {
  return `You read supplier quotations for a procurement team and return JSON only.
You READ and INTERPRET. You never convert units or currencies, never do arithmetic, never invent a value.
Rules:
- One entry in "prices" for every price you find. Copy the value exactly as written (a number), with its unit, currency, GST basis and freight basis as stated in the document (use "unknown" when not stated anywhere).
- "loc" must be copied EXACTLY from the label in square brackets of the segment the price came from, including the file name (e.g. "whatsapp.txt · Line 2", "PPW-Q-2611-044.pdf · Page 1, line 12").
- A unit, currency, GST or freight basis written in a COLUMN HEADING (e.g. "Rate (Rs. per 100 pcs)", "Unit price USD*", "Rate Rs/pc") or stated once for the whole document ("prices in USD, inclusive of GST, delivered") applies to EVERY price under it. Fill it in on every entry.
- If a unit, currency or basis is stated once and clearly carries over to the next prices in the same sentence or table ("₹42/kg for the 5-ply, 38 for the 3-ply" means 38 is also per kg), apply it to those prices too.
- "supplier_text" = the exact words/numbers from that segment that give the price.
- Match each price to one of OUR item codes using size and ply (or, for items listed by description, the description). Supplier sizes may be in cm (convert mentally only for matching). Set match_confidence "low" if the size or ply is not an exact match, "medium" if you inferred it, "high" if size and ply match exactly. If no item matches, use null.
- If a price is given for a whole group ("₹42/kg for the 5-ply"), output ONE entry with our_item_code null and applies_to_ply set (3, 5 or 7).
- If the supplier offers a different item than asked (e.g. 7-ply instead of 5-ply), set is_alternative true and note it.
- If a number looks misread, blurry, garbled, struck through or odd for its row, set reading_unsure true and explain in note. Never correct it yourself.
- If a PHOTO of the document is attached as an image, use it to check the OCR text line by line. When the photo and the OCR disagree, the PHOTO wins: put the value you can see in the photo in "value" (OCR often garbles symbols like ₹ into digits), set reading_unsure true, and say in note what you see (e.g. "OCR read 344; photo shows ₹44"). Leave value null only if you can't read it in the photo either. Also set reading_unsure true for handwritten, struck-out or hard-to-read values. Use the OCR line's label as loc.
- If the same item has two different prices anywhere in the document, output BOTH entries.
- If the supplier says they can't or won't supply one of our items ("not possible", "we don't make this size", "not available"), add it to not_offered, even if a group price (e.g. "3 ply ₹39/kg") would otherwise cover it.
- "same as last year" style statements go in same_as_last_year (what it applies to, in the supplier's words).
- Discounts: list each with its condition. applies_unconditionally true only if it applies to every line with no condition the buyer must meet beyond ordering within validity; false for conditions like "only if all items are ordered".
- stated_total: any grand total the supplier states, exactly as written.
- quality_answers: answers to these questions if present: Q1 ISO 9001 certified? Q2 box-strength test report for 5-ply (min 500 kg). Q3 recycled fibre at least 60%? Q4 samples within 7 days? Q5 capacity at least 1 lakh boxes/month? Use the supplier's words. If a question is not answered, omit it.
- source "spoken" if the document says the price was given on a phone call.
When something isn't given, use "" for text fields, 0 for applies_to_ply, and null for numbers.
Return exactly this JSON shape (values are examples):
{
 "prices": [{"loc":"PPW-Q-2611-044.pdf · Page 1, line 9","supplier_text":"0.117","supplier_item_ref":"300x200x150 3 ply","our_item_code":"C03","applies_to_ply":null,"match_confidence":"high","value":0.117,"unit":"per_box","currency":"USD","gst":"included","freight":"included","source":"written","is_alternative":false,"reading_unsure":false,"note":null}],
 "same_as_last_year": {"applies_to":"all other items","loc":"whatsapp.txt · Line 2","supplier_text":"rest same as last year"}  or null,
 "terms": {"price_unit":"per_box","currency":"USD","gst":"included","freight":"included","payment_days":45,"lead_time_weeks":2,"valid_until":"2026-11-24","minimum_order":null},
 "discounts": [{"percent":2,"condition":"orders confirmed within validity","applies_unconditionally":true,"loc":"Page 3, line 14"}],
 "stated_total": {"value":547531,"currency":"USD","basis":"annual incl. GST","loc":"Page 3, line 9"}  or null,
 "quality_answers": [{"question_id":"Q1","answer":"Yes, ISO 9001 certified","loc":"Paragraph 13","proof_attached_claimed":false}],
 "replaces_earlier_quote": "PPW/Q/2611/031"  or null,
 "not_offered": [{"our_item_code":"C30","supplier_text":"900x600x600 not possible","loc":"whatsapp.txt · Line 3"}]
}`;
}

export function quoteUserPrompt({ supplierName, items, documents }) {
  // Boxes are listed by ply and size; anything else (chairs, freight lanes…) by its description.
  const itemList = items.map((i) => (i.length_mm ? `${i.item_code}: ${i.ply ? `${i.ply}-ply, ` : ""}${i.length_mm}x${i.width_mm}x${i.height_mm} mm` : `${i.item_code}: ${i.description}`) + (i.yearly_qty && !i.length_mm ? ` (qty ${i.yearly_qty})` : "")).join("\n");
  const docs = documents.map((d) => `=== FILE: ${d.file} (${d.kind}) ===\n` + d.segments.map((s) => `[${d.file} · ${s.loc}] ${s.text}${s.ocr_confidence != null && s.ocr_confidence < 80 ? `  (OCR confidence ${s.ocr_confidence}%)` : ""}`).join("\n")).join("\n\n");
  return `Supplier: ${supplierName}\n\nOUR ITEMS (code: ply, inside size L x W x H):\n${itemList}\n\nTHE SUPPLIER'S REPLY (every segment is labelled with its location):\n${docs}`;
}

// ------------------------------------------------------------------ Certificates & test reports
export const CertSchema = z.object({
  doc_type: z.string(),
  issued_to: z.string().nullable().optional(),
  number: z.string().nullable().optional(),
  valid_until: z.string().nullable().optional(),
  test_result_kgf: num,
  loc: z.string().nullable().optional(),
});

export const certSystemPrompt = () => `You read a certificate or lab test report and return JSON only with keys: doc_type ("ISO 9001 certificate", "Box-strength test report", or what it is), issued_to (company name exactly as printed), number, valid_until (YYYY-MM-DD if a validity/expiry date is printed, else null), test_result_kgf (number if a box compression result in kgf is printed, else null), loc (location label where the key fact appears). Never guess.`;
