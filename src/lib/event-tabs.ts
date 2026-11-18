import type { EventTab } from "@/lib/portfolio";

export type TabDef = { key: EventTab; label: string; what: string; todo: string; info: string };

/** The 7 stages inside one sourcing event, shown as tabs. Covers the 13 stages of the flowchart. */
export const EVENT_TABS: TabDef[] = [
  { key: "request", label: "Request", what: "What we're asking suppliers to quote for.", todo: "Approved and sent on 3 Nov.", info: "The request for quotes: items, quantities, unit, delivery terms, quality questions and deadline. Drafted with the AI from the team's original request." },
  { key: "suppliers", label: "Suppliers", what: "Who was invited, and how the request reached them.", todo: "6 suppliers invited on 3 Nov.", info: "Pick suppliers from the approved list, see their track record, then send the request by email or WhatsApp." },
  { key: "quotes", label: "Quotes", what: "Who replied, and what the AI read from each reply.", todo: "5 of 6 replied. All replies read.", info: "Track replies during the bidding window. The AI reads every reply, whatever its format, and pulls out prices and answers." },
  { key: "compare", label: "Compare", what: "All prices side by side: ₹ per box, before GST, delivered.", todo: "Click any price to see where it came from.", info: "Every supplier's prices converted to the same basis, with quality results and terms alongside." },
  { key: "check", label: "Check", what: "Prices and answers the AI is unsure about.", todo: "Clear the red items first. A winner can't be picked until they're fixed.", info: "Compare each flagged value with the original, then accept it, correct it, or ask the supplier." },
  { key: "ask", label: "Ask AI", what: "Ask anything about the quotes in plain English.", todo: "Try a suggested question, or type your own.", info: "Answers come as text, tables or charts. The AI decides what to calculate, but the maths is done by code, and every number is traceable." },
  { key: "award", label: "Award", what: "Negotiate if needed, pick the winners, get approval and notify suppliers.", todo: "Available once all red items are fixed.", info: "Optional best-and-final round, recommended award with written reasons, approval, and messages to suppliers." },
];

export const tabIndex = (k: EventTab) => EVENT_TABS.findIndex((t) => t.key === k);
