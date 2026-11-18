/**
 * The line items of a sourcing event (server only), frozen when its request is approved: data/events/<id>/items.json.
 * Replies are read and compared against these lines (L1, L2…). From the draft's item list when there is one;
 * otherwise the AI turns the request into lines (it copies quantities as written, never calculates), and code matches
 * each line to our item master by size and ply, so known boxes get their weight and last year's price.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { readCsv } from "@/lib/csv-file";
import { currentDraft } from "@/lib/draft";

export type EventItem = { item_code: string; description: string; ply?: number; length_mm?: number; width_mm?: number; height_mm?: number; weight_kg?: number; yearly_qty: number; unit: string; our_code?: string };

const path = (id: string) => join(process.cwd(), "data", "events", id, "items.json");
export const loadItems = (id: string): EventItem[] => (existsSync(path(id)) ? JSON.parse(readFileSync(path(id), "utf8")) : []);

function withMaster(x: Omit<EventItem, "item_code">, n: number): EventItem {
  const m = x.length_mm ? readCsv("items").rows.find((i) => Number(i.length_mm) === x.length_mm && Number(i.width_mm) === x.width_mm && Number(i.height_mm) === x.height_mm && (!x.ply || Number(i.ply) === x.ply)) : undefined;
  return { item_code: `L${n}`, ...x, ...(m ? { our_code: m.item_code, weight_kg: Number(m.weight_kg), ply: x.ply || Number(m.ply) } : {}) };
}

const TOOL: Anthropic.Tool = {
  name: "save_line_items",
  description: "Save the items the request asks suppliers to quote for.",
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            description: { type: "string", description: "Short description for suppliers, e.g. '5-ply corrugated box, 600 x 400 x 400 mm'." },
            length_mm: { type: "number", description: "Inside length in mm if it's a box with a size, else 0." },
            width_mm: { type: "number", description: "Width in mm, else 0." },
            height_mm: { type: "number", description: "Height in mm, else 0." },
            ply: { type: "number", description: "3, 5 or 7 for boxes, else 0." },
            quantity: { type: "number", description: "The quantity exactly as written in the request. Never calculate." },
            unit: { type: "string", description: "e.g. 'boxes', 'chairs', 'kg'." },
          },
          required: ["description", "length_mm", "width_mm", "height_mm", "ply", "quantity", "unit"],
        },
      },
    },
    required: ["items"],
  },
};

async function itemsFromRequest(message: string, details: string): Promise<Omit<EventItem, "item_code">[]> {
  const res = await new Anthropic().messages.create({
    model: process.env.AI_MODEL || "claude-haiku-5-5", max_tokens: 1200, tools: [TOOL], tool_choice: { type: "tool", name: TOOL.name },
    system: "You turn a purchase request into the line items suppliers will quote for. Only items the request actually asks for. Copy sizes and quantities exactly as written; never calculate or invent.",
    messages: [{ role: "user", content: `Request:\n${message}\n\nDetails read earlier:\n${details}` }],
  });
  const b = res.content.find((x): x is Anthropic.ToolUseBlock => x.type === "tool_use");
  const raw = (b?.input as { items?: Record<string, unknown>[] })?.items ?? [];
  return raw.filter((r) => r && Number(r.quantity) > 0).slice(0, 40).map((r) => ({
    description: String(r.description ?? "").slice(0, 120), unit: String(r.unit ?? "units").slice(0, 20), yearly_qty: Math.round(Number(r.quantity)),
    ...(Number(r.length_mm) > 0 ? { length_mm: Number(r.length_mm), width_mm: Number(r.width_mm), height_mm: Number(r.height_mm) } : {}),
    ...(Number(r.ply) > 0 ? { ply: Number(r.ply) } : {}),
  }));
}

/** Freeze the event's items (once). Returns the items. */
export async function ensureItems(eventId: string): Promise<EventItem[]> {
  const have = loadItems(eventId);
  if (have.length) return have;
  const ev = readCsv("sourcing_events").rows.find((e) => e.event_id === eventId);
  const rq = ev?.from_request ? readCsv("team_requests").rows.find((r) => r.request_id === ev.from_request) : undefined;
  if (!ev || !rq) return [];
  const d = await currentDraft({ id: eventId, plant: ev.plant, name: ev.name }, { id: rq.request_id, title: rq.title, message: rq.message });
  let lines: Omit<EventItem, "item_code">[];
  if (d.lines.length) {
    lines = d.lines.map((l) => {
      const [L, W, H] = l.size.split(/[x×]/i).map((v) => Number(v.trim()));
      return { description: `${l.ply ? `${l.ply}-ply corrugated box, ` : ""}${l.size} mm${l.note ? ` (${l.note})` : ""}`, ply: l.ply, length_mm: L || undefined, width_mm: W || undefined, height_mm: H || undefined, yearly_qty: l.qty, unit: "boxes" };
    });
  } else {
    const details = readCsv("team_request_fields").rows.filter((f) => f.request_id === rq.request_id).map((f) => `${f.label}: ${f.value}`).join("\n");
    lines = await itemsFromRequest(rq.message, details);
  }
  const items = lines.map((x, i) => withMaster(x, i + 1));
  mkdirSync(join(process.cwd(), "data", "events", eventId), { recursive: true });
  writeFileSync(path(eventId), JSON.stringify(items, null, 2) + "\n");
  return items;
}
