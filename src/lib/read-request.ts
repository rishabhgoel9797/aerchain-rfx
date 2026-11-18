/**
 * Reads a team request with Claude (server only): the message plus every file that came with it.
 * Claude returns structured details (what, quantity, contract, needed by, delivery, ...) and marks
 * what's missing. For a brand-new message typed into the chat, it also gives a title, who sent it,
 * the plant, and whether it's a team asking the buyer (internal) or the buyer asking suppliers (rfq).
 * Claude only reads and summarises; totals and counts are worked out by code and handed to it.
 */
import Anthropic from "@anthropic-ai/sdk";
import { fileText, requestFiles, itemListFile, readItemList } from "@/lib/request-files";
import { readCsv } from "@/lib/csv-file";

export type ReadField = { label: string; value: string; source: string; missing: boolean };
export type IntakeInfo = { title: string; kind: "internal" | "rfq"; kindReason: string; sender: string; plant: string; category: string; tooVague: boolean; clarify: string[] };

const FIELDS = {
  type: "array",
  description: "One entry per detail, in this order where relevant: What, Quantity, Contract, Needed by, Delivery to, Budget, Type / spec.",
  items: {
    type: "object",
    properties: {
      label: { type: "string", description: "Short label, e.g. 'What', 'Quantity', 'Needed by'." },
      value: { type: "string", description: "What the request says, in a few plain words. 'Not given' if missing." },
      source: { type: "string", description: "One short sentence: where this came from (e.g. 'Taken from the message.', 'From the attached list, rows 2-19.') or, if missing, why it is needed." },
      missing: { type: "boolean", description: "True if suppliers can't quote comparably without it and the request doesn't say." },
    },
    required: ["label", "value", "source", "missing"],
  },
} as const;

const INTAKE = {
  title: { type: "string", description: "Short title for the request list, e.g. 'Corrugated boxes FY27, Pune plant'. Max 60 characters." },
  kind: { type: "string", enum: ["internal", "rfq"], description: "'internal' if the message comes from someone else (a team member, a plant, a named sender) asking the buyer to buy or source something, even if they say 'get quotes'. 'rfq' only if it is the buyer's own instruction describing what suppliers should quote for." },
  kind_reason: { type: "string", description: "One short sentence on why." },
  sender: { type: "string", description: "Name of the person who sent the message if it says (e.g. signed 'Sandeep'), else empty." },
  plant: { type: "string", description: "Plant or site it is for, e.g. 'Haridwar', 'Baddi', 'Pune'. Empty if not said." },
  category: { type: "string", enum: ["Packaging", "Raw herbs", "IT hardware", "Logistics", "Office supplies", "General"], description: "Best-fitting category." },
  too_vague: { type: "boolean", description: "True only if the message is too vague to start anything: it doesn't say what is needed specifically enough AND gives no quantity or place. Then nothing will be saved and your questions are shown instead." },
  clarify: { type: "array", items: { type: "string" }, description: "If too_vague: 2-4 short questions to ask the buyer, in plain words. Otherwise empty." },
} as const;

const tool = (intake: boolean): Anthropic.Tool => ({
  name: "save_request_details",
  description: "Save the details read from the purchase request.",
  input_schema: {
    type: "object",
    properties: intake ? { ...INTAKE, fields: FIELDS } : { fields: FIELDS },
    required: intake ? ["title", "kind", "kind_reason", "sender", "plant", "category", "too_vague", "clarify", "fields"] : ["fields"],
  } as Anthropic.Tool.InputSchema,
});

const SYSTEM = `You read purchase requests for the buying team at RSG Herbal House, an Ayurvedic products company in India (plants in Haridwar and Baddi, head office in New Delhi).
Messages may be in English, Hindi or Hindi-English mix; report values in plain English.
Extract only what the request and its files actually say. Never invent quantities, dates, specs or names.
Never add up, multiply or count anything yourself. When a total or count is needed, use only the "Worked out by code" facts you are given, and say they come from the list.
If the message and an attached list disagree, report what each says in the value.
Keep values short and plain. Use Indian number words where the request does (lakh, crore).
Always include What, Quantity and Delivery to. Add Contract, Needed by, Budget or Type / spec when the request mentions them or when they're needed to get comparable quotes.`;

/** Facts worked out by code from an attached item list, handed to Claude so it never does arithmetic. */
async function listFacts(reqId: string) {
  const file = itemListFile(reqId);
  const lines = file ? await readItemList(file).catch(() => []) : [];
  if (!lines.length) return "";
  const n = (p: number) => lines.filter((l) => l.ply === p).length;
  return `Worked out by code from ${file!.split("/").pop()}: ${lines.length} sizes, total ${lines.reduce((t, l) => t + l.qty, 0).toLocaleString("en-IN")} a year; ${n(3)} are 3-ply, ${n(5)} are 5-ply, ${n(7)} are 7-ply; ${lines.filter((l) => l.code).length} match sizes we already buy.`;
}

/** Our item master entries for any item code the message mentions (e.g. "same spec as C19"). */
function itemFacts(text: string) {
  const codes = [...new Set(text.match(/\bC\d{2}\b/g) ?? [])];
  if (!codes.length) return "";
  const items = readCsv("items").rows;
  const lines = codes.map((c) => items.find((i) => i.item_code === c)).filter(Boolean).map((i) => `${i!.item_code}: ${i!.description}, board ${i!.board_gsm} GSM, ${i!.weight_kg} kg per box, used for ${i!.used_for}`);
  return lines.length ? `From our item master (codes mentioned in the message):\n${lines.join("\n")}` : "";
}

export async function readRequestWithClaude(
  r: { id: string; title: string; from: string; role: string; plant: string; via: string; message: string },
  opts: { intake?: boolean } = {},
) {
  const files = requestFiles(r.id).filter((f) => !f.isMessage);
  const attached = await Promise.all(files.map(async (f) => `--- Attached file: ${f.name} ---\n${await fileText(f.path).catch(() => "(could not open this file)")}`));
  const facts = [await listFacts(r.id), itemFacts(r.message)].filter(Boolean).join("\n\n");
  const model = process.env.AI_MODEL || "claude-haiku-5-5";
  const T = tool(!!opts.intake);
  const header = opts.intake
    ? `New message typed or pasted into the buying team's request box by ${r.from} (the buyer). Unless it names or quotes another person as the sender (e.g. a WhatsApp line "[date] Name: ..." or a signature), it is the buyer's own words: kind "rfq".`
    : `Request ${r.id}: "${r.title}"\nFrom: ${r.from} (${r.role}, ${r.plant} plant), via ${r.via}`;
  const started = Date.now();
  const res = await new Anthropic().messages.create({
    model,
    max_tokens: 1800,
    system: SYSTEM,
    tools: [T],
    tool_choice: { type: "tool", name: T.name },
    messages: [{ role: "user", content: `${header}\n\nMessage:\n${r.message || "(no message, only files)"}\n\n${attached.join("\n\n") || "(no attachments)"}${facts ? `\n\n${facts}` : ""}` }],
  });
  const block = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  const input = (block?.input ?? {}) as Record<string, unknown>;
  const raw = input.fields;
  if (!Array.isArray(raw)) throw new Error("Claude didn't return the details.");
  const fields: ReadField[] = raw
    .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
    .map((f) => ({ label: String(f.label ?? "").trim(), value: String(f.value ?? "").trim(), source: String(f.source ?? "").trim(), missing: f.missing === true }))
    .filter((f) => f.label && f.value)
    .slice(0, 8);
  if (!fields.length && !(opts.intake && input.too_vague === true)) throw new Error("Claude didn't return any details.");
  const s = (k: string, max = 80) => String(input[k] ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
  const intake: IntakeInfo | undefined = opts.intake
    ? { title: s("title", 70) || "New request", kind: input.kind === "rfq" ? "rfq" : "internal", kindReason: s("kind_reason", 200), sender: s("sender", 60), plant: s("plant", 40), category: s("category", 30) || "General", tooVague: input.too_vague === true, clarify: Array.isArray(input.clarify) ? input.clarify.map((q) => String(q).trim()).filter(Boolean).slice(0, 4) : [] }
    : undefined;
  return { fields, intake, model, ms: Date.now() - started, files: files.map((f) => f.name) };
}
