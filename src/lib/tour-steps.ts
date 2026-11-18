/**
 * Guided-tour steps for every page and every sourcing-event tab.
 * target: where to point, tried in order. A CSS selector, or "text:" + the start of a visible heading, button or field.
 * If nothing matches (the page looks different), the step is shown in the middle of the screen.
 */
/** optional: skip the step when its target isn't on this page (some pages differ, e.g. the demo event). */
export type TourStep = { title: string; body: string; target?: string[]; optional?: boolean };

const anytime: TourStep = { title: "Run this tour any time", body: "Every page has its own short tour. Click Take a tour at the top whenever you need it.", target: ["text:Take a tour"] };

const HOME: TourStep[] = [
  { title: "Start here: what do you need to buy?", body: "Describe a need, paste a team's WhatsApp or email, or attach their list. QuoteLens reads it and drafts the request for you to check.", target: ["main textarea", "text:What do you need to buy?"] },
  { title: "Let the AI decide, or choose", body: "Internal request: a team is asking you to buy something. Request for quotes: you're asking suppliers for prices. Not sure? Leave it on Let AI decide.", target: ["text:Raise as"] },
  { title: "Your day at a glance", body: "Requests waiting for you, live sourcing events, savings this year, and anything that needs your action.", target: ["text:Requests waiting"] },
  { title: "Insights", body: "Things worth acting on, spotted across requests and events, like two plants buying the same boxes.", target: ["text:AI insights across your company", "text:Requests from teams"] },
  { title: "Find anything", body: "Search requests, sourcing events and suppliers from any page. Press / to jump here.", target: ["header input"] },
  { title: "The company menu", body: "Requests from teams, sourcing events with suppliers, approvals, the supplier list and a full change history.", target: ["aside nav", "aside"] },
  anytime,
];

const REQUESTS: TourStep[] = [
  { title: "Requests from company teams", body: "What plants and teams need you to buy, by WhatsApp, email or form. Each is read by AI when it arrives.", target: ["text:Requests"] },
  { title: "Raise one yourself", body: "Paste a team's message or attach their file. QuoteLens creates the request and lists what's missing.", target: ["textarea"] },
  { title: "Every request in one list", body: "Newest first. Search, filter and sort any column. The AI checks column shows what's missing or overlapping.", target: ["main table"] },
  anytime,
];

const REQUEST: TourStep[] = [
  { title: "What the team actually sent", body: "Kept exactly as it arrived, with every file they attached. Click a file to open it here.", target: ["text:Original message"] },
  { title: "What the AI understood", body: "The request turned into clear details. Orange means missing. The AI never fills a gap with a guess.", target: ["text:What the AI understood"] },
  { title: "Questions for the requester", body: "A short message asking only for what's missing, ready to send on WhatsApp or email.", target: ["text:Questions for the requester", "text:Details still missing"], optional: true },
  { title: "AI checks", body: "Overlap with live events (e.g. another plant buying the same boxes), and anything else worth knowing before you start.", target: ["text:AI checks"] },
  { title: "Start sourcing", body: "Turns the request into a sourcing event with a ready draft. Or close it with a reason, or ask the requester first.", target: ["text:Convert to sourcing event", "text:Open sourcing event"] },
  anytime,
];

const EVENTS: TourStep[] = [
  { title: "Start a new request for quotes", body: "Describe what you want suppliers to quote for, in your own words. QuoteLens drafts it and opens the event.", target: ["text:Start a new request for quotes"] },
  { title: "All sourcing events", body: "Every event, newest change first. The stage bar shows how far each one has got; Needs attention shows what's blocking it.", target: ["main table"] },
  anytime,
];

const EVENT_COMMON: TourStep[] = [
  { title: "The seven steps of a sourcing event", body: "Request → Suppliers → Quotes → Compare → Check → Ask AI → Award. Ticks show what's done. Click any step.", target: ["main a[href$='/request']"] },
  { title: "What to do next", body: "This line always tells you where you are and what to do next on this step.", target: ["text:Next:"] },
  { title: "The team's original files", body: "The request and its attachments stay one click away on every step.", target: ["[data-tour=request-files]"] },
];

const TAB: Record<string, TourStep[]> = {
  request: [
    { title: "The draft request", body: "Built from the team's request: items, quantities, price unit, delivery, deadline. Orange marks anything you changed.", target: ["text:Your request (draft)", "text:Your request"] },
    { title: "Where each detail came from", body: "What the AI took from the request, and the source of each detail.", target: ["text:What the AI took from the request"], optional: true },
    { title: "Before you send", body: "Gaps and warnings, e.g. quantities that don't add up, or sizes already being sourced elsewhere.", target: ["text:Before you send"], optional: true },
    { title: "Change it by talking to it", body: "\"Add 10%\", \"move the deadline to 5 Dec\", \"remove the sample kit\". The AI makes the change; anything unclear, it asks.", target: ["text:Change the draft with AI"], optional: true },
    { title: "Drafted by talking to it", body: "The buyer described the request in plain words; the AI wrote it and asked about anything unclear, like the price unit.", target: ["text:Chat with the AI"], optional: true },
    { title: "Same questions for everyone", body: "Quality questions every supplier answers, with proof attached, so answers can be compared.", target: ["text:Quality questions"], optional: true },
    { title: "Approve when happy", body: "Approving fixes the items suppliers will quote for, and moves on to choosing suppliers.", target: ["text:Approve and choose suppliers", "text:Approve request", "text:Approved."] },
  ],
  suppliers: [
    { title: "Choose who gets the request", body: "Approved suppliers are suggested. Blocked ones can't be picked, and warnings show before you decide. Company rule: at least 3.", target: ["text:Choose suppliers", "main table"] },
    { title: "Send", body: "Each supplier gets it the way they prefer: email or WhatsApp. Same request and deadline for everyone.", target: ["text:Send request to", "text:Sent to suppliers", "text:Sent to each supplier"] },
  ],
  quotes: [
    { title: "Supplier inbox", body: "Every reply lands here, newest first, in whatever format the supplier chose. Each new reply is read automatically.", target: ["text:Supplier inbox"] },
    { title: "Play a supplier", body: "Email is simulated in this demo: write a supplier's reply and attach their file. It arrives here and is read live.", target: ["text:Simulate an incoming email"] },
    { title: "After each reply: next steps", body: "Once read, the reply shows its green / amber / red counts and what to do next: check, compare, ask.", target: ["text:Read by QuoteLens", "text:Who has replied", "text:Waiting for replies", "text:Replies:"] },
    { title: "What the AI read", body: "For each supplier: the files they sent and what the AI noticed, like a discount in small print or a missing price.", target: ["text:What the AI read from each reply"], optional: true },
  ],
  compare: [
    { title: "Everyone on the same basis", body: "Same items, ₹ per unit, before GST, delivered, whatever each supplier sent. Missing prices say Not quoted, never zero.", target: ["main table"] },
    { title: "Click any price", body: "See the exact spot in the supplier's file and every step of the conversion.", target: ["main table tbody tr td button", "main table tbody td"] },
    { title: "Colours mean something", body: "Green: read cleanly. Amber: please check. Red: must be fixed before awarding. Flagged prices don't count until you check them.", target: ["text:Green: read correctly", "text:Read correctly", "text:Cheapest per line"] },
  ],
  check: [
    { title: "Only the doubtful values", body: "Red first. Each shows why it was flagged and the original, so you can decide in seconds.", target: ["text:To check, red first", "text:red item", "text:No red items", "text:Nothing to check"] },
    { title: "Decide, and it's recorded", body: "Looks right, correct it (type the value), ask the supplier, or leave it out with a reason. Every decision goes into Change history.", target: ["text:Looks right"] },
  ],
  ask: [
    { title: "Ask in plain language", body: "\"Who's cheapest if we drop Pacific?\" \"What if prices go up 6%?\" The AI picks the calculation; the numbers come from code.", target: ["text:Ask about these quotes", "main form"] },
    { title: "Ideas to start with", body: "Click one to ask it straight away.", target: ["text:Try asking"] },
    { title: "See what it calculated", body: "Every answer lists the calculations behind it, and says what it left out.", target: ["text:What the AI promises", "text:Hi Rishabh"] },
  ],
  award: [
    { title: "The recommended award", body: "Cheapest usable price for each item, with the reasons. Red items must be fixed first.", target: ["text:Recommended award"] },
    { title: "Send for approval", body: "Goes to the Head of Procurement (and the CFO above ₹1 crore), with the reasons. Locked while red items are open.", target: ["text:Send for approval"] },
  ],
};

const APPROVALS: TourStep[] = [
  { title: "Awards waiting for sign-off", body: "Each comes with the value, the reasons and a link to the comparison.", target: ["main table"] },
  { title: "Approve or send back", body: "Sending back needs a short reason, so the buyer knows what to change. Both are recorded.", target: ["text:Approve", "text:Reject"] },
  anytime,
];

const SUPPLIERS: TourStep[] = [
  { title: "Every supplier, with warnings", body: "Contacts and preferred channel, on-time record, share of spend, status (Approved / New / Blocked) and anything to watch out for.", target: ["main table"] },
  { title: "Add a supplier", body: "New suppliers start as New until their papers and samples are approved.", target: ["text:Add supplier"] },
  anytime,
];

const HISTORY: TourStep[] = [
  { title: "Every change and decision", body: "Who did what, when and why, newest first. Nothing is overwritten silently: the audit trail approvers and finance need.", target: ["main table"] },
  anytime,
];

export function stepsFor(path: string): TourStep[] {
  if (path === "/") return HOME;
  if (path === "/requests") return REQUESTS;
  if (/^\/requests\/[^/]+$/.test(path)) return REQUEST;
  if (path === "/events") return EVENTS;
  const ev = path.match(/^\/events\/[^/]+\/([^/]+)$/);
  if (ev) return [...EVENT_COMMON, ...(TAB[ev[1]] ?? []), anytime];
  if (path === "/approvals") return APPROVALS;
  if (path.startsWith("/suppliers")) return SUPPLIERS;
  if (path === "/history") return HISTORY;
  return [anytime];
}
