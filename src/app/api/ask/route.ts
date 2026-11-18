import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { TOOLS, runTool, describeTool, SUPPLIER_IDS } from "@/lib/analyst-tools";
import { EVENT_TOOLS, runEventTool, describeEventTool } from "@/lib/event-analyst-tools";
import { eventResults } from "@/lib/event-results";
import { readCsv } from "@/lib/csv-file";

/**
 * POST /api/ask — the Ask AI analyst. Claude Haiku reads the question, picks which calculation to run
 * (tools in src/lib/analyst-tools.ts), and writes the answer from the results. Code does every sum.
 * Body: { question: string, history?: {role:"user"|"assistant", text:string}[] }
 */
export const runtime = "nodejs";

const SYSTEM = `You are the sourcing analyst inside Aerchain QuoteLens, helping Rishabh, a buyer at RSG Herbal House (an Ayurvedic products maker, plant in Haridwar).
The open event is RFQ-2026-014: 30 corrugated box sizes for FY27. Prices are ₹ per box, before GST, delivered to Haridwar, already converted by code.
Supplier ids: ${SUPPLIER_IDS}.

Rules:
- Every number you state must come from a tool result in this conversation. Never do your own arithmetic, never estimate, never round differently from the tool's "shown" value. If you need a number no tool gives, say so.
- Call the tool that answers the question. For what-ifs (drop a supplier, add a %, only green prices) call calculate_award with those settings. For "everyone +X%" add one price_adjustment per supplier id.
- Missing prices are never zero. Red prices, alternative items and suppliers who failed quality are left out unless the user asks; say what was left out.
- Numbers in your earlier answers came from tools and can be reused; run a tool again for anything new. Never comment on how earlier answers were produced.
- If the question is unclear, ask one short question back instead of guessing. If the data can't answer it, say that plainly.
- Write for a busy buyer: plain words, no jargon, lead with the answer in one or two sentences, then at most 5 short bullets or one small markdown table. Use supplier names, not ids. Bold the key numbers. No headings.`;

type Turn = { role: "user" | "assistant"; text: string; steps?: { label: string }[] };

/** Any event other than the demo: same rules, its own data and tools. */
function eventSystem(eventId: string) {
  const ev = readCsv("sourcing_events").rows.find((e) => e.event_id === eventId);
  const ids = eventResults(eventId).suppliers.map((s) => `${s.id} = ${s.name}`).join(", ");
  return SYSTEM.replace(/The open event is RFQ-2026-014[^\n]*\n/, `The open event is ${eventId}: ${ev?.name ?? ""}, delivered to ${ev?.plant ?? ""}. Prices are ₹ per unit, before GST, delivered, already converted by code from the suppliers' replies.\n`).replace(/Supplier ids: [^\n]*\n/, `Suppliers who replied: ${ids || "none yet"}. Lines are L1, L2… (use event_overview to see them).\n`).replace(/ and suppliers who failed quality/, "");
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "No Claude key found. Add ANTHROPIC_API_KEY to .env.local and restart the app." }, { status: 500 });
  const body = (await req.json().catch(() => ({}))) as { question?: string; history?: Turn[]; event?: string };
  const eventId = /^RFQ-\d{4}-\d{3}$/.test(body.event ?? "") && body.event !== "RFQ-2026-014" ? body.event! : "";
  const question = String(body.question ?? "").trim().slice(0, 1000);
  if (!question) return NextResponse.json({ error: "Type a question first." }, { status: 400 });

  const client = new Anthropic();
  const model = process.env.AI_MODEL || "claude-haiku-5-5";
  const messages: Anthropic.MessageParam[] = [
    ...(body.history ?? []).slice(-8).filter((t) => t.text?.trim()).map((t) => ({ role: t.role, content: t.text.slice(0, 4000) + (t.role === "assistant" && t.steps?.length ? `\n\n[Numbers above came from these code calculations: ${t.steps.map((x) => x.label).join("; ")}]` : "") })),
    { role: "user", content: question },
  ];
  const steps: { tool: string; label: string; input: unknown }[] = [];
  let usage = { input: 0, output: 0 };
  const started = Date.now();

  try {
    for (let turn = 0; turn < 8; turn++) {
      const res = await client.messages.create({ model, max_tokens: 16000, system: eventId ? eventSystem(eventId) : SYSTEM, tools: eventId ? EVENT_TOOLS : TOOLS, messages, cache_control: { type: "ephemeral" } });
      usage = { input: usage.input + res.usage.input_tokens, output: usage.output + res.usage.output_tokens };
      if (res.stop_reason === "refusal") return NextResponse.json({ error: "The AI declined to answer that question." }, { status: 422 });
      if (res.stop_reason === "max_tokens") return NextResponse.json({ error: "The answer got too long. Try a narrower question." }, { status: 422 });

      messages.push({ role: "assistant", content: res.content });
      if (res.stop_reason !== "tool_use") {
        const answer = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
        return NextResponse.json({ answer, steps, model, ms: Date.now() - started, usage });
      }

      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of res.content) {
        if (block.type !== "tool_use") continue;
        const input = (block.input ?? {}) as Record<string, unknown>;
        try {
          const out = eventId ? runEventTool(eventId, block.name, input) : runTool(block.name, input);
          steps.push({ tool: block.name, label: eventId ? describeEventTool(block.name, input) : describeTool(block.name, input), input });
          results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(out) });
        } catch (e) {
          results.push({ type: "tool_result", tool_use_id: block.id, content: `Calculation failed: ${(e as Error).message}`, is_error: true });
        }
      }
      messages.push({ role: "user", content: results });
    }
    return NextResponse.json({ error: "The AI took too many steps. Try asking more simply." }, { status: 422 });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: "Claude rejected the key in .env.local." }, { status: 401 });
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "Too many questions at once. Wait a few seconds and try again." }, { status: 429 });
    if (e instanceof Anthropic.APIError) return NextResponse.json({ error: `Claude error ${e.status}: ${e.message}` }, { status: 502 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
