# Flowchart spec: Buying a year's boxes from 6 suppliers

Text version of the Design canvas flowchart (source of truth for the build). Category: corrugated boxes. 30 box sizes, about 10 lakh boxes a year (≈ ₹4 crore), yearly price agreement.

_13 stages, 97 what-if branches._

## How to read this

- **Lanes (who does the step):** **Company**: Person who needs it, quality team, finance, boss; **Buyer**: Runs the process, makes the decisions; **Our tool**: Reads, checks, compares, explains; **Supplier**: Replies however they like.
- **Normal path:** the numbered steps in each stage, in order. The arrow from the last step of one stage goes to the first step of the next.
- **What if…? branches:** edge cases for that stage. Each lists what happens, then (→) what the tool does and what the buyer sees.
- **Status of each branch:**
  - `GREEN` = normal, or the tool is sure.
  - `AMBER` = something unusual; the tool handles it or asks the buyer to check.
  - `RED` = blocking problem; must be fixed before choosing a winner (or before moving on).
- **Loops (dashed arrows on the canvas):**
  - Stage 10 → Stage 6: a supplier's new (bargained) price is read and checked again.
  - Stage 13 → Stage 1: what we learned feeds the next need.
- Every branch has an ID like `S6.4` (stage 6, branch 4) so it can be used as a test case.

## Stage 1: A need comes up

**Normal path**

1. [Company] Factory needs a year’s boxes: 30 sizes, about 10 lakh boxes (≈ ₹4 crore)

**What if…?**

- `S1.1` `AMBER` **The need arrives as a WhatsApp message or email, not a form?**
  - → Tool turns the message into a draft request.
  - → Buyer just confirms it.
- `S1.2` `AMBER` **It’s urgent (needed in 3 days)?**
  - → Tool suggests a short deadline and trusted past suppliers only.
- `S1.3` `GREEN` **We already have a fixed-price deal for these boxes?**
  - → Tool says: “You already have a deal with Supplier X until March.”
  - → Buyer may not need to ask for prices at all.
- `S1.4` `AMBER` **The need is vague (“we need some boxes”)?**
  - → Tool asks the requester simple questions: which sizes, how many, by when.
- `S1.5` `AMBER` **Two teams are asking for the same boxes?**
  - → Tool suggests combining them to get a better price.

## Stage 2: Writing the request

**Normal path**

1. [Buyer] Buyer starts a new request
2. [Our tool] Tool fills in items, sizes, box weight, quantity, unit, delivery, quality questions, payment, deadline

**What if…?**

- `S2.1` `RED` **The unit is missing (per box? per piece? per 100?)**
  - → Tool asks before sending.
  - → Every supplier must quote in the same unit.
- `S2.2` `AMBER` **It’s not clear who pays for delivery?**
  - → Tool asks: “Price delivered to our factory, or from their factory?”
- `S2.3` `GREEN` **Currency is not mentioned?**
  - → Tool sets rupees and tells suppliers to say if they quote in another currency.
- `S2.4` `AMBER` **Quality questions are missing?**
  - → Tool suggests standard ones: box strength, certificates, sample available?
  - → Asks suppliers to attach proof (certificates, test reports).
- `S2.5` `GREEN` **Some suppliers price by weight (per kg)?**
  - → Tool puts each box’s weight in the request, so per-kg prices can be turned into per-box prices later.
- `S2.6` `AMBER` **Item descriptions are unclear?**
  - → Tool adds size, material, and a drawing or photo.
- `S2.7` `GREEN` **Buyer wants to reuse last year’s request?**
  - → Tool copies it and highlights what has changed.
- `S2.8` `AMBER` **Buyer changes the quantity after sending?**
  - → Tool sends the update to ALL suppliers.
  - → Old prices are marked “may change”.

## Stage 3: Choosing suppliers

**Normal path**

1. [Our tool] Tool suggests suppliers from past orders and the approved list
2. [Buyer] Buyer picks 6 suppliers

**What if…?**

- `S3.1` `AMBER` **Fewer than 3 suppliers (company rule says minimum 3)?**
  - → Tool warns and suggests more, from past suppliers or online marketplaces (IndiaMART, TradeIndia, Bizongo).
- `S3.2` `RED` **A supplier is on the blocked list?**
  - → Tool won’t add them and explains why.
- `S3.3` `AMBER` **A supplier is new and has never worked with us?**
  - → Tool marks them “New” and asks for basic papers (tax ID, certificates).
- `S3.4` `AMBER` **A supplier delivered late last time?**
  - → Tool shows their track record next to their name.
- `S3.5` `AMBER` **One supplier already gets most of our business?**
  - → Tool shows their share and suggests keeping a backup.
- `S3.6` `AMBER` **Two suppliers seem to be owned by the same people?**
  - → Tool warns the buyer.

## Stage 4: Sending the request

**Normal path**

1. [Our tool] Tool sends the request to each supplier the way they prefer
2. [Supplier] Each supplier gets it: email, WhatsApp or a call

**What if…?**

- `S4.1` `GREEN` **Supplier prefers WhatsApp?**
  - → Tool sends it on WhatsApp with a simple link.
  - → No app or login needed.
- `S4.2` `AMBER` **Email bounces or goes to the wrong person?**
  - → Tool tells the buyer right away and asks for the right contact.
- `S4.3` `AMBER` **Supplier is not comfortable with technology?**
  - → Buyer calls them.
  - → Tool gives a short call checklist and logs the call.
- `S4.4` `GREEN` **Supplier wants to use their own format?**
  - → Allowed. We never force our template.
- `S4.5` `GREEN` **Drawings are too big to attach?**
  - → Tool shares them as a link.

## Stage 5: Waiting for replies (the “9 days”)

**Normal path**

1. [Supplier] Suppliers reply over about 9 days, in any format
2. [Our tool] Tool shows who opened it, who replied, and who is quiet

**What if…?**

- `S5.1` `GREEN` **A supplier asks a question?**
  - → Tool sends it to the buyer, who answers once.
  - → The answer goes to ALL suppliers (fair to everyone).
- `S5.2` `GREEN` **Many suppliers ask the same question?**
  - → Tool groups them. One answer for all.
- `S5.3` `AMBER` **A supplier stays silent?**
  - → Friendly reminders on day 2, 5 and 8 (WhatsApp if email failed).
  - → Then tool suggests the buyer calls.
- `S5.4` `AMBER` **Last year’s cheapest supplier is silent?**
  - → Tool shows: “If they don’t reply, you may pay about ₹18 lakh more.”
  - → Suggests calling them. Never guesses their price.
- `S5.5` `GREEN` **Supplier says “I’ll send by Friday”?**
  - → Tool notes it and reminds them on Friday.
- `S5.6` `AMBER` **Supplier says “Sorry, we can’t supply”?**
  - → Tool records the reason and suggests another supplier.
- `S5.7` `AMBER` **An “out of office” auto-reply comes back?**
  - → Tool spots it and tries another contact at that company.
- `S5.8` `AMBER` **A supplier phones the buyer with prices?**
  - → Buyer logs it. Tool marks it “Spoken, not confirmed”.
  - → Tool asks the supplier to confirm in writing.
- `S5.9` `AMBER` **A supplier sends an updated price later?**
  - → Tool keeps both versions, uses the newest, shows what changed.
- `S5.10` `AMBER` **A festival (like Diwali) falls in the middle?**
  - → Tool warns replies may be late and suggests extending the deadline for everyone.
- `S5.11` `AMBER` **A quote arrives after the deadline?**
  - → Tool follows the company rule (accept or reject) and records the decision.
- `S5.12` `RED` **Deadline arrives and only 2 of 6 have replied?**
  - → Buyer chooses: extend for everyone, or go ahead with a written reason.

## Stage 6: Reading the replies

**Normal path**

1. [Our tool] Tool reads every reply (prices, questionnaire answers, attached documents), whatever shape it comes in

**What if…?**

- `S6.1` `GREEN` **A spreadsheet that ignores our layout?**
  - → Tool matches their items to our 30 items.
- `S6.2` `AMBER` **A PDF with the discount hidden in small print?**
  - → Tool reads the whole page, catches the discount and shows where it was.
- `S6.3` `GREEN` **Prices written inside a paragraph of a letter?**
  - → Tool pulls out the numbers.
- `S6.4` `AMBER` **A photo of a price list, at an angle or blurry?**
  - → Tool reads what it can.
  - → Unclear prices are marked “Unsure”, with the photo piece shown next to them.
- `S6.5` `AMBER` **A handwritten quote?**
  - → Same as the photo, with extra checks.
- `S6.6` `AMBER` **A voice note in Hindi or Hinglish?**
  - → Tool turns it into text, then prices.
  - → Marked “Needs written confirmation”.
- `S6.7` `AMBER` **A one-line message: “₹42/kg for the 5-ply, 38 for the 3-ply, rest same as last year, freight extra”?**
  - → Tool reads the two per-kg prices and looks up last year’s for the rest.
  - → Notes that delivery is NOT included.
- `S6.8` `RED` **“Same as last year”, but there’s no record of last year?**
  - → Tool marks those items “Missing” and asks the supplier.
- `S6.9` `AMBER` **A locked PDF, a zip file, or a download link?**
  - → Tool opens it, or asks the supplier for the password.
- `S6.10` `AMBER` **Supplier uses their own product codes?**
  - → Tool matches them to our items. Unsure matches go to the buyer.
- `S6.11` `AMBER` **Supplier offers a different item (“No 5-ply, we can give 7-ply”)?**
  - → Marked “Alternative offer”. Not compared as if it were the same item.
- `S6.12` `RED` **The same document shows two different prices for one item?**
  - → Tool shows both and asks.
- `S6.13` `RED` **The total doesn’t match the item prices added up?**
  - → Tool flags it.
- `S6.14` `AMBER` **A price looks wrong (₹4 when everyone else says ₹40)?**
  - → Tool flags: “Looks wrong, please check.”
- `S6.15` `AMBER` **Questionnaire answers are buried in an email (“yes, we’re ISO certified”)?**
  - → Tool fills them into the questionnaire, linked to the sentence they came from.
  - → Marked “Check” until a document backs them up.
- `S6.16` `GREEN` **A certificate or test report is attached?**
  - → Tool reads the company name, number and expiry date, and links it to the right answer.
- `S6.17` `RED` **A certificate has expired, or the name on it doesn’t match the supplier?**
  - → Tool flags it next to the supplier’s answer.

## Stage 7: Lining up all prices

**Normal path**

1. [Our tool] Tool lines up every price (same unit, currency, basis) with questionnaire answers and documents alongside

**What if…?**

- `S7.1` `AMBER` **A price is per kg, not per box?**
  - → Tool converts it using each box’s weight.
  - → If a box’s weight is unknown, it asks instead of guessing.
- `S7.2` `AMBER` **One says “per box”, another says “per 100 pieces”?**
  - → Tool converts to our agreed unit.
  - → If it doesn’t know how many are in a box, it asks.
- `S7.3` `AMBER` **A price is in dollars?**
  - → Tool converts at today’s rate and shows the rate. Buyer can change it.
- `S7.4` `GREEN` **Some prices include tax and some don’t?**
  - → Tool shows all without tax first, then with tax.
- `S7.5` `AMBER` **“Delivery extra”?**
  - → Tool shows price + delivery.
  - → If delivery cost is unknown, buyer can add an estimate.
- `S7.6` `AMBER` **“5% off only if you give us ALL items”?**
  - → Tool shows the condition and works it out both ways (all items vs split).
- `S7.7` `GREEN` **Price is cheaper for bigger quantities?**
  - → Tool uses our quantity and shows if ordering more would be cheaper.
- `S7.8` `AMBER` **Supplier has a minimum order?**
  - → Tool warns if splitting the order would go below it.
- `S7.9` `AMBER` **Supplier gives only one total price, not per item?**
  - → Tool compares the total only, and says so clearly.
- `S7.10` `GREEN` **Different payment terms (pay in 30 days vs 90 days)?**
  - → Shown next to the price. Paying later is worth something.
- `S7.11` `AMBER` **Different delivery times (2 weeks vs 6 weeks)?**
  - → Shown next to the price. Flagged if after the date the factory needs.
- `S7.12` `AMBER` **Quote is valid for only 15 days?**
  - → Tool shows the expiry date and warns if the decision is running late.
- `S7.13` `AMBER` **Supplier priced only 27 of 30 items?**
  - → The 3 missing show as “Not quoted”, NEVER as zero.
  - → Totals compare only matching items, and say so.
- `S7.14` `AMBER` **A supplier fails the quality questionnaire?**
  - → Shown as “Failed” next to their prices, with the reason.
  - → Buyer can leave them out of any comparison.
- `S7.15` `AMBER` **A questionnaire answer is missing?**
  - → Shown as “Not answered”, never as a pass.
  - → Tool asks the supplier.

## Stage 8: Checking what the tool is unsure about

**Normal path**

1. [Our tool] Tool colours every price: green = sure, amber = check, red = fix
2. [Buyer] Buyer checks amber and red prices against the original

**What if…?**

- `S8.1` `AMBER` **There are a few amber prices?**
  - → Buyer sees each one next to the original message, then accepts or fixes it.
- `S8.2` `RED` **There are red prices?**
  - → No winner can be picked until they are fixed, or removed with a reason.
- `S8.3` `GREEN` **Buyer corrects a price?**
  - → Tool saves the correction, plus who changed it and when.
- `S8.4` `GREEN` **Buyer wants to ask the supplier?**
  - → Tool writes the message for them.

## Stage 9: Asking questions in plain words

**Normal path**

1. [Buyer] Buyer asks questions in plain words
2. [Our tool] Tool answers with text, tables or charts, and shows where each number came from

**What if…?**

- `S9.1` `GREEN` **“Who is cheapest overall?”**
  - → Tool answers, and mentions who didn’t price every item.
- `S9.2` `GREEN` **Boss: “Split it: cheapest per item, but only suppliers who passed the quality check”?**
  - → Tool works it out and shows the saving compared to using one supplier.
- `S9.3` `GREEN` **“What if delivery adds 6%?”**
  - → Tool recalculates instantly.
- `S9.4` `GREEN` **“Which items have the biggest price differences?”**
  - → Chart. These are the items worth bargaining on.
- `S9.5` `GREEN` **“How does this compare to last year?”**
  - → Shows what went up and what went down.
- `S9.6` `AMBER` **“Are all of them overcharging?”**
  - → Tool estimates a fair price for each box from its weight and today’s paper price.
  - → Shows how far each quote is above it. Marked as an estimate.
- `S9.7` `AMBER` **Buyer asks about something that doesn’t exist (“What did B quote for item 31?”)**
  - → Tool says there is no item 31. It never makes things up.
- `S9.8` `AMBER` **The data can’t answer it (“Who is most reliable?” with no history)?**
  - → Tool says what it doesn’t know.
- `S9.9` `AMBER` **The question is unclear (“Who’s the best supplier?”)?**
  - → Tool asks: cheapest, fastest delivery, or best overall?
- `S9.10` `GREEN` **“Put this in Excel” / “Write a summary for my boss”?**
  - → Tool exports it or writes it.

## Stage 10: Bargaining round (optional)

**Normal path**

1. [Buyer] Buyer asks everyone for their best and final price
2. [Supplier] Suppliers send a new price, or keep the old one

**What if…?**

- `S10.1` `AMBER` **Prices are much higher than last year?**
  - → Tool suggests a second round on the items with the biggest gaps.
- `S10.2` `GREEN` **Sending the second round?**
  - → Same message and deadline to all.
  - → Never shares a competitor’s price.
- `S10.3` `AMBER` **A supplier lowers their price?**
  - → Saved as a new version.
  - → Back to Stage 6 to check it (dashed loop).
- `S10.4` `GREEN` **A supplier won’t lower their price?**
  - → Original price stays.

## Stage 11: Picking the winner

**Normal path**

1. [Buyer] Buyer picks the winner(s)
2. [Our tool] Tool writes a short note explaining why
3. [Company] Boss approves

**What if…?**

- `S11.1` `AMBER` **The cheapest supplier was late or failed quality before?**
  - → Tool shows the trade-off: cheaper, but risky.
- `S11.2` `GREEN` **The order is split across suppliers?**
  - → Tool shows who gets which items, and the total.
- `S11.3` `AMBER` **It’s a big amount (e.g. over ₹1 crore)?**
  - → Goes to a senior approver.
- `S11.4` `GREEN` **Boss asks “Why not Supplier B?”**
  - → The note answers with numbers and links to the original quotes.
- `S11.5` `GREEN` **Buyer disagrees with the tool’s suggestion?**
  - → Buyer decides. The reason is recorded.
- `S11.6` `RED` **Prices expire while waiting for approval?**
  - → Tool asks suppliers to reconfirm.

## Stage 12: Telling suppliers and placing the order

**Normal path**

1. [Our tool] Tool tells the winner, sends a polite “no” to others, and puts the order in the company system
2. [Supplier] Winner gets the order

**What if…?**

- `S12.1` `GREEN` **A losing supplier asks why?**
  - → General feedback (“price was higher”, “delivery too slow”).
  - → Never shares exact competitor prices.
- `S12.2` `RED` **The winner says they can’t deliver after all?**
  - → Tool suggests the next best supplier.

## Stage 13: After the order: learning for next time

**Normal path**

1. [Our tool] Tool records how the supplier actually performed

**What if…?**

- `S13.1` `AMBER` **Delivery was late or quality was poor?**
  - → Recorded. Shown next time this supplier is considered.
- `S13.2` `RED` **The bill is higher than the quoted price?**
  - → Tool flags it before anyone pays.
- `S13.3` `GREEN` **Next year a supplier writes “same as last year”?**
  - → Tool already knows exactly what last year’s prices were.

## Side panels

### Trust rules (always true)

- Never makes up a number.
- Reading replies and answering questions is real AI work: no answer is hardcoded.
- Every number can be clicked to see the original message, file or photo.
- Clearly says when it is unsure.
- Does the maths with real calculations, not guesses.
- The buyer always has the final say.
- Every change and decision is recorded.

### Fairness rules

- Every supplier gets the same information and the same deadline.
- Answers to questions go to everyone.
- No supplier ever sees another supplier’s price.
- Late quotes follow one clear rule.
- Every decision has a written reason.

### Who is involved

- **Person who needs it (factory):** raises the need, confirms the details.
- **Buyer:** runs the process, makes the decisions.
- **Quality team:** checks samples and quality answers.
- **Finance:** checks payment terms.
- **Boss:** asks “what if” questions and approves.
- **Suppliers:** reply however they like.

### How we know it works

- **Before:** about 4 days of typing and rebuilding spreadsheets.
- **After:** under 1 hour from the last reply to a trusted comparison.
- Most prices come out green automatically.
- The boss’s “what if” question is answered in seconds, not a day.
- Fewer mistakes: every number is checked or traceable.

### What we left out on purpose (for the demo)

- Real email and WhatsApp sending (we pretend, to focus on the smart parts). Reading the replies and the reasoning stay real.
- A supplier app or login (goes against “reply however you like”).
- Automatic bargaining (a separate problem).
- Connecting to the company’s accounting system.

### Demo setup (fake but realistic data)

- A yearly price agreement: 30 box sizes, about 10 lakh boxes a year (≈ ₹4 crore). 6 suppliers invited, 5 reply:
- **A:** neat spreadsheet, but in their own layout.
- **B:** PDF letter, discount hidden at the bottom, prices in dollars.
- **C:** Word letter, prices in paragraphs, “5% off if you give us all items”.
- **D:** blurry angled photo, only 27 of 30 items priced.
- **E:** one-line WhatsApp, “₹42/kg for the 5-ply, 38 for the 3-ply, rest same as last year, freight extra”, plus one price given on a phone call.
- **F:** last year’s cheapest. Never replies.
- Weight of each of the 30 boxes, and today’s paper price.
- Last year’s prices and delivery records for 2 suppliers.
- A quality questionnaire: one supplier fails it.
- Attached documents: ISO certificates, a box-strength test report, and one expired certificate.
