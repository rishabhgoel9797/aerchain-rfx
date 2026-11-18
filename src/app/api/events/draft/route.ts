import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readCsv, clean, logChange, liveEventRow, touch, reseed } from "@/lib/csv-file";
import { currentDraft, applyOps, saveOverrides, type Op } from "@/lib/draft";

/**
 * POST /api/events/draft { id, instruction } — the draft co-pilot ("Want to change something? Tell the AI").
 * Claude reads the current draft and the buyer's instruction, and picks operations (set a term, scale quantities,
 * add a question...). Code validates and applies them — Claude never computes a quantity itself — then saves.
 * If the instruction is unclear, Claude asks back instead of changing anything.
 */
export const runtime = "nodejs";

const TOOL: Anthropic.Tool = {
  name: "update_draft",
  description: "Change the draft request for quotes, and reply to the buyer.",
  input_schema: {
    type: "object",
    properties: {
      operations: {
        type: "array",
        description: "Changes to make, in order. Empty if you need to ask the buyer something first.",
        items: {
          type: "object",
          properties: {
            op: { type: "string", enum: ["set_term", "scale_quantities", "set_quantity", "remove_items", "add_item", "add_question", "remove_question"] },
            term: { type: "string", enum: ["price_unit", "delivery", "tax", "deadline"], description: "For set_term." },
            value: { type: "string", description: "For set_term: the new wording, e.g. '5 Dec, 6 pm' or 'Delivered to Baddi and Haridwar plants'." },
            percent: { type: "number", description: "For scale_quantities: e.g. 10 for +10%, -5 for -5%. Code does the maths." },
            items: { type: "array", items: { type: "number" }, description: "Item numbers as shown. For scale_quantities leave empty for all items." },
            item: { type: "number", description: "For set_quantity: item number as shown." },
            qty: { type: "number", description: "For set_quantity / add_item: the exact number the buyer gave. Never calculate it yourself." },
            size: { type: "string", description: "For add_item, e.g. '300 × 200 × 150' (mm)." },
            ply: { type: "number", description: "For add_item: 3, 5 or 7." },
            text: { type: "string", description: "For add_question: the question, written for suppliers." },
            number: { type: "number", description: "For remove_question: question number as shown." },
          },
          required: ["op"],
        },
      },
      reply: { type: "string", description: "Short reply to the buyer: what you changed, or the question you need answered. Plain words, 1-3 sentences. Don't state computed totals." },
    },
    required: ["operations", "reply"],
  },
};

const SYSTEM = `You are the co-pilot that helps a category buyer at RSG Herbal House (Ayurvedic products, India) finish a request for quotes before it goes to suppliers.
You change the draft only through the update_draft tool. Rules:
- Never calculate a quantity, total or percentage result. For "+10%" use scale_quantities with percent 10; code does the maths. Use set_quantity/add_item only with numbers the buyer typed.
- If the instruction is ambiguous (which items? what date?), make no change and ask one short question in reply.
- Don't invent specs, suppliers or prices. You can't send anything or choose suppliers here; say so if asked.
- Keep supplier-facing wording (terms, questions) clear and neutral.`;

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const id = clean(b.id, 20);
  const instruction = String(b.instruction ?? "").trim().slice(0, 1500);
  if (!instruction) return NextResponse.json({ ok: false, error: "Type what you'd like to change." }, { status: 400 });
  const row = liveEventRow(id);
  if (!row) return NextResponse.json({ ok: false, error: "Sourcing event not found." }, { status: 404 });
  if (row.stage !== "request") return NextResponse.json({ ok: false, error: "This request is already approved. Changes are locked." }, { status: 409 });
  const r = readCsv("team_requests").rows.find((x) => x.request_id === row.from_request);
  if (!r) return NextResponse.json({ ok: false, error: "This event has no request to draft from." }, { status: 409 });

  const ev = { id, plant: row.plant, name: row.name };
  const rq = { id: r.request_id, title: r.title, message: r.message };
  const d = await currentDraft(ev, rq);
  const view = [
    "Terms:", ...d.terms.map((t) => `- ${t.key}: ${t.value}`),
    d.lines.length ? "Items:" : "Items: (no item list; items are described in the request)",
    ...d.lines.map((l) => `${l.n}. ${l.size}${l.ply ? `, ${l.ply}-ply` : ""}, qty ${l.qty} a year${l.note ? `, used for: ${l.note}` : ""}${l.code ? ` (our code ${l.code})` : ""}`),
    "Quality questions:", ...(d.questions.length ? d.questions.map((q, i) => `${i + 1}. ${q.text}`) : ["(none)"]),
    `Request message: ${r.message}`,
  ].join("\n");

  const model = process.env.AI_MODEL || "claude-haiku-5-5";
  const history = d.chat.slice(-6).flatMap((t) => [{ role: t.role === "me" ? ("user" as const) : ("assistant" as const), content: t.text }]);
  let res: Anthropic.Message;
  try {
    res = await new Anthropic().messages.create({
      model, max_tokens: 1200, system: SYSTEM, tools: [TOOL], tool_choice: { type: "tool", name: TOOL.name },
      messages: [...history, { role: "user", content: `Current draft:\n${view}\n\nBuyer: ${instruction}` }],
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: `The AI couldn't respond (${(e as Error).message}). Nothing was changed.` }, { status: 502 });
  }
  const block = res.content.find((x): x is Anthropic.ToolUseBlock => x.type === "tool_use");
  const input = (block?.input ?? {}) as { operations?: Op[]; reply?: string };
  const ops = Array.isArray(input.operations) ? input.operations.slice(0, 20) : [];
  const { overrides, done, skipped } = await applyOps(ev, rq, ops);
  const reply = String(input.reply ?? "").trim() || (done.length ? "Done." : "I didn't change anything.");
  const at = new Date().toISOString();
  overrides.chat = [...overrides.chat, { role: "me" as const, text: instruction, at }, { role: "ai" as const, text: reply + (skipped.length ? ` (Not applied: ${skipped.join(" ")})` : ""), at, changes: done }].slice(-30);
  saveOverrides(id, overrides);
  if (done.length) {
    logChange({ who: "Rishabh", area: "Sourcing", what: `Changed the draft for ${id} with the AI: ${done.join("; ")}` });
    touch("sourcing_events", "event_id", id);
    reseed();
  }
  return NextResponse.json({ ok: true, reply, changes: done, skipped });
}
