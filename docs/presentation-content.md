# QuoteLens: presentation content (product-management view)

Text content for a slide deck. For each slide: **On the slide** (short) and **Visual**.
Story arc: user → problem → what good looks like → product → *(2 slides on how it works)* → trust → business value → choices → the bigger problem → what's next.
Suggested: 16 slides, about 12 minutes, then a live demo.

> Numbers marked *assumption* are for illustration. Replace them with real figures if you have them.

---

## 1 · Title

**On the slide**
- **QuoteLens**
- From "please send quotes" to a confident award, in minutes, not days
- Rishabh · Aerchain Product Management assignment

**Visual:** The home screen: "What do you need to buy?"

**[Add screenshot: Home screen]**

---

## 2 · A week in the life of a buyer

**On the slide**
- **Monday:** Plant manager on WhatsApp: "Need 6 new box sizes for the gift pack line, urgently"
- **Tuesday:** Writes the request for quotes, emails 6 suppliers
- **Next week:** Replies trickle in: an Excel in their own format, a PDF in dollars, a Word letter, a phone photo of a rate card, a WhatsApp voice-note summary
- **3 days:** Retyping it all into one spreadsheet
- **Then:** The VP asks "what if we split it, cheapest per box, only suppliers who passed quality?" Another day gone.

**Visual:** A simple timeline with the "retyping" block taking most of the week.

**[Add screenshot: Request page with Sandeep's WhatsApp message]**

---

## 3 · Why it matters to the business

**On the slide**
- **Time:** 3–4 buyer-days per sourcing event go on retyping and re-checking
  - *Assumption:* 2 events a month → **70–100 buyer-days a year**, per buyer
- **Money left on the table:** decisions get made on "close enough" spreadsheets. Splitting the award or combining demand rarely gets analysed.
- **Risk:** one wrong digit or unit (per box vs per 100) can move a ₹4 crore decision
- **Speed:** slow comparisons mean prices expire and suppliers move on

**Visual:** Four tiles: Time · Money · Risk · Speed.

---

## 4 · Who's involved, and what each needs

**On the slide**

| Who | What they need |
|---|---|
| **Category buyer** | A fair, comparable picture fast, and answers to the boss's questions |
| **Plant and team requesters** | Raise a need easily (WhatsApp, a form) and know it's being handled |
| **Suppliers** | Reply the way they already do: no portal, no template |
| **Approvers (Head of Procurement, CFO)** | The decision and the reasons, on one page |
| **Finance and audit** | Who decided what, when and why |

**Visual:** People around a central "sourcing event".

**[Add screenshot: Suppliers screen]**

---

## 5 · What "good" looks like

**On the slide**

**Outcomes**
- Comparable view of all replies **the same day** they arrive
- The boss's "what if" answered **in minutes**
- **Zero** wrong numbers shown as "safe"
- Every decision **explainable** to an approver or auditor

**Product principles**
1. Meet people where they are: WhatsApp, Excel, paper
2. The buyer decides; the product does the busywork
3. Show the working behind every number
4. When unsure, say so; never guess

**Visual:** Outcomes on the left, principles on the right.

---

## 6 · The product journey

**On the slide**
1. **A need comes in:** paste the team's WhatsApp or attach their list
2. **The request writes itself:** items, quantities, terms, questions; the buyer adjusts in plain words
3. **Send to suppliers:** the right ones suggested; blocked ones can't be picked
4. **Replies arrive:** in any format, each read automatically
5. **Compare:** everyone on the same basis, side by side
6. **Check:** only the doubtful values need a look
7. **Ask:** "what if we drop this supplier?" in plain language
8. **Award and approval:** recommendation, reasons, sign-off

**Visual:** 8 screen thumbnails in a row.

**[Add screenshot: Sourcing event header with the 7 steps]**

---

## 7 · Three moments that matter

**On the slide**
- **"I just pasted a WhatsApp."** Seconds later it's a structured request, with what's missing listed and a question ready for the requester.
- **"Six replies, six formats."** Each is compared on the same basis as it arrives. No spreadsheet.
- **"The VP's question."** Answered in under a minute, with what was included and what was left out.

**Visual:** Three short before/after cards.

**[Add screenshot: Request "What the AI understood" screen, Supplier inbox screen, Ask AI answer screen]**

---

## 8 · How it works (1 of 2)

**On the slide**
- **AI reads, rules calculate, the buyer decides**
- AI understands messy inputs: a Hindi-English WhatsApp, a photo of a rate card, a paragraph in a Word letter
- Simple, fixed rules do all the maths: per 100 → per box, dollars → rupees, remove GST, add freight
- Anything uncertain goes to the buyer, marked amber or red with a reason

**Visual:** Three boxes: Read (AI) → Calculate (rules) → Decide (buyer).

---

## 9 · Where AI helps, and where it doesn't (2 of 2)

**On the slide**

| Step | AI used? | Why |
|---|---|---|
| Understanding a team's request | **Yes** | People write loosely, in mixed languages |
| Drafting and editing the request | **Yes** | "Add 10%, move the deadline" is natural language |
| Reading supplier replies | **Yes** | Every supplier uses a different format |
| Answering the buyer's questions | **Yes** | Questions are open-ended |
| Conversions, totals, savings | **No** | Must be exact and repeatable |
| Flags, rules, locks, approvals | **No** | Must be predictable and auditable |
| Sending emails and WhatsApps | **No** (simulated) | Plumbing, not the problem |

**Visual:** The table with a simple ✓ / ✗ column.

---

## 10 · When replies are messy (the buyer's view)

**On the slide**

| The supplier sent | AI's part (reading) | Rules' part (deciding) |
|---|---|---|
| Prices "per 100 pieces" | Notices the unit, even when it's only in a column heading | ÷ 100, and writes the step |
| Dollars, GST included, discount in a footnote | Spots "USD", "inclusive of GST" and the tiny footnote, and sees the discount has no condition | × exchange rate, removes 18% GST, applies the discount |
| The same box at two prices | Reports both prices it found | Sees two values for one box and marks it **red** |
| Only 5 of 6 quoted | Lists what's there, plus anything they say they can't supply | Every box with no price becomes "Not quoted", **never zero** |
| A price 10× too low | Reads the number as written; doesn't "fix" it | Compares with other suppliers and marks it **amber** if far off |
| A blurry handwritten note | Reads the photo, and says when it's unsure | Low reading confidence becomes **amber**; doesn't count until confirmed |
| "Rest same as last year" | Spots the phrase and which boxes it covers | Looks up last year's contract price, or marks it **red** if there isn't one |

**Visual:** The comparison screen with green, amber and red dots.

**[Add screenshot: Compare screen]**

---

## 11 · Why a buyer would trust it with ₹4 crore

**On the slide**
- **Click any price:** see the exact line in the supplier's file
- **See the working:** "₹44 per kg × 0.844 kg + 4% freight = ₹38.62"
- **Doubtful values don't count** until the buyer confirms them
- **Nothing missing is ever treated as zero**
- **Every decision is recorded:** who, what, when, why
- **The award stays locked** until problems are resolved

**Visual:** A price detail panel: the original file with the price highlighted, plus the conversion steps.

**[Add screenshot: Price detail panel (where it came from + how we got this number)]**

---

## 12 · Business value

**On the slide**
- **Buyer time:** days of retyping → minutes of checking
  - *Assumption:* 70–100 buyer-days a year freed per buyer
- **Better awards:** splitting by box is now a one-click question
  - In the test run: **₹39.15 L** split vs **₹42.07 L** with one supplier, **about 7% lower**
- **Fewer costly errors:** wrong units and missing digits flagged before they reach an award
- **Faster cycles:** decisions inside the quote validity window
- **Audit-ready by default:** every decision logged with a reason

**Visual:** Four value tiles with one number each.

**[Add screenshot: Award screen]**

---

## 13 · Choices I made, and what I left out

**On the slide**

**Built (the hard, valuable part)**
- Reading any reply format reliably
- A comparison the buyer can trust and check
- Plain-language questions and answers
- The full journey, request to approval

**Left out, on purpose**
- Real email and WhatsApp connections (simulated; the reading is real)
- ERP and purchase-order integration
- Supplier portal (suppliers reply however they like)
- Logins, roles, a production database
- Live exchange rates (one fixed rate, shown on every conversion)

**Visual:** Two columns.

---

## 14 · The bigger problem may be somewhere else

**On the slide**

**1. Comparing is harder than reading**
- Reading a photo is now easy. Comparing fairly needs good item data: box weights, freight terms, last year's prices.
- In testing, 3 of 6 boxes couldn't be compared from a per-kg quote, only because the box weight wasn't on file.

**2. Better requests mean easier replies**
- Much of the mess starts with a vague request: no unit, no delivery basis, no deadline.
- Asking the right questions up front saves more time than reading better afterwards.

**3. The biggest saving may be before sourcing starts**
- Baddi asked for 18 box sizes; 14 were already being sourced for Haridwar.
- Combining demand across plants can beat squeezing a rupee per box later.

**Visual:** Three insight cards, each with one example.

**[Add screenshot: Baddi request "Before you send" screen]**

---

## 15 · How I'd roll it out and measure it

**On the slide**

**Pilot**
- One category (packaging), 2–3 buyers, one quarter
- Run alongside the spreadsheet for the first few events, then switch

**Measure**
- Time from first reply to a decision-ready comparison
- Share of values the buyer had to correct
- Wrong values shown as safe: target **zero**
- Savings found per event (split awards, combined demand)
- Approvals passed without rework

**Next**
1. Connect real email and WhatsApp
2. Ask suppliers for missing item data (weights, specs) in the request
3. Spot combined demand across plants automatically
4. Feed supplier performance into the award
5. Create purchase orders in the ERP after approval

**Visual:** Pilot → Measure → Next, as three columns.

---

## 16 · Demo, and close

**On the slide**
1. Paste a plant manager's WhatsApp with their box list
2. Adjust the request in plain words, approve, send
3. Six supplier replies arrive: Excel, PDF, Word, photo, screenshot, handwriting
4. Compare, check the doubtful ones, ask the VP's question
5. Award and approval

**Closing line:** "QuoteLens doesn't replace the buyer's judgement. It removes the retyping, shows its working, and refuses to guess, so the buyer gets to a decision they can defend in minutes, not days."

**Visual:** The comparison screen.

**[Add screenshot: Check screen]**

