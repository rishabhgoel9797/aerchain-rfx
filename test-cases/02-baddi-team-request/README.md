# 02 · A team request already waiting: Baddi plant, 18 box sizes

**What this tests (from the brief):**
- The request arrives from a plant through a form, with their own list: no chat this time.
- Supplier replies with rough edges that case 01 didn't cover:
  - a **revised quote** replacing an earlier one;
  - a **total that doesn't add up**;
  - **near-but-not-exact sizes**;
  - **"rest same as last year"**;
  - a **price given only on a phone call**;
  - a **partial quote** ("on request");
  - **per 1,000 pcs** pricing.

**Time:** about 10 minutes. **Needs:** the app at http://localhost:3017, internet on.

**Files**

| File | What it is |
|---|---|
| `paste-this.txt` | Co-pilot instructions (and the request text, if you need to raise it fresh) |
| `Baddi_box_list.xlsx` | Vikram's list: 18 sizes, 14 we already buy, 4 new |
| `supplier-replies/` | 7 emails from 6 suppliers (Shree Ganesh sends two) |

---

## Part 1 · The request (about 3 min)

1. **Requests** → open **REQ-0147 · Corrugated boxes FY27, Baddi plant** (from Vikram Negi, via Form).
2. Look at:
   - **What the AI understood**;
   - **AI checks**: "Haridwar is buying the same boxes", 14 of 18 sizes;
   - **Files**: his form and the Excel list.
3. Click **Convert to sourcing event**. QuoteLens re-reads the request and his list in about 5 seconds.

**On the draft you should see:**
- **18 items** from his Excel. **14 match our codes** (C01, C02… C17); **4 are New size**.
- **Before you send → "Quantities don't add up":** the list totals **3.07 lakh**, but his message says about **4 lakh**. Code works this out and the AI reports it, so nobody guesses which is right.
- **"Haridwar is buying the same boxes":** 14 of the 18 are already in the Haridwar event. That's the consolidation opportunity.

## Part 2 · Change the draft, approve, send (about 2 min)

1. Type the co-pilot instructions from `paste-this.txt` one by one:
   - **−5% on all quantities:** worked out by code, shown in orange.
   - **A new quality question** on printing cost.
   - **Delivery changed.**
   - **Deadline 2 Dec.**
   - **"Make it cheaper":** the AI asks what you mean and changes nothing.
2. **Approve and choose suppliers** → keep the 6 suggested → **Send request to 6 suppliers**.

## Part 3 · Seven supplier emails (about 4 min)

On the event's **Quotes → Supplier inbox → Simulate an incoming email**, for each folder:
- **From:** the supplier;
- **Subject and Body:** from `email.txt`;
- **attach** the file(s) in the folder;
- **Send.**

**Order matters for Shree Ganesh:** send `email-1-first-quote` first, and `email-2-revised-quote` **last**, with **Replaces their earlier quote** ticked.

| # | Folder | What it tests | What you should see |
|---|---|---|---|
| 1a | `1-shree-ganesh-two-emails/email-1-first-quote` | Excel priced **per 1,000 pcs** | **All 18 green.** E.g. 400×300×300 5-ply: 36,290 ÷ 1,000 = **₹36.29** |
| 2 | `2-pacific-pdf-total-mismatch` | PDF in rupees **including GST**; the **grand total is 8% off** the line amounts | All 18 converted (GST removed). Issue: **"Quote total doesn't add up… 8.0% different"**. Check before trusting this supplier's sheet. |
| 3 | `3-om-sai-pdf-near-sizes` | Their **nearest standard sizes** for 4 boxes (e.g. 322×242×182 for 320×240×180), ex-works, freight extra | 14 green (+4% freight estimate). **4 amber as a different item:** "quoted 355×305×255 instead of 350×300×250". Not compared until you accept them in Check. |
| 4 | `4-rajdhani-spreadsheet-screenshot` | **Screenshot of a spreadsheet**, only **9 of 18** priced, rest "On request" | **9 amber** (screenshot; unit read from the picture) and **9 "Not quoted"**, never zero |
| 5 | `5-mahalaxmi-email-plus-call-note` | **Per kg** in the email; one price given **only on a phone call** (call note attached) | Known sizes converted (₹40/kg × 0.103 kg + 4% = **₹4.28**). **500×400×400 = ₹58, amber: "given on a phone call, not in writing".** The 4 new sizes are amber: "no weight on file", not guessed. |
| 6 | `6-doon-word-same-as-contract` | Word letter: **"same as our current contract"** for the 14 existing sizes; prices for the 4 new ones; **3% only above 1 lakh boxes** | **All 18 green.** The 14 are looked up from last year's contract RC-FY26-BOX-01 (e.g. 200×150×100 = **₹3.93**). The 3% is listed, **not applied**. |
| 1b | `1-shree-ganesh-two-emails/email-2-revised-quote` | **Revised quote** replacing the first, 3 rates lower | The first email shows **"Replaced by a newer quote"**. The three 5-ply rates drop (400×300×300: ₹36.29 → **₹34.12**), and **they become the cheapest**. |

> The wording of notes can differ run to run. Numbers come from code and should match.
> One thing to notice: Doon's "same as last year" prices were contracted **delivered Haridwar**, but this request is for **Baddi**. The note shows the source contract, so the buyer can spot it.

## Part 4 · Compare, Check, Ask, Award (about 3 min)

**Compare:** 18 × 6, with the cheapest **usable** price highlighted for each line.

With all 7 emails in and nothing checked yet (and quantities **not** changed by the co-pilot), the winners are:
- **Pacific:** the 3-ply boxes.
- **Shree Ganesh (revised):** 3 of the 5-ply boxes. Send email 1b last and watch them switch from Doon.
- **Doon:** the other 5-ply boxes and the new 5-ply sizes.

Cheapest per line ≈ **₹64.7 L a year**, against the best single supplier (Doon) ≈ **₹65.6 L**. If you used −5% in the co-pilot, both totals are about 5% lower.

**Check:**
- Accept one of Om Sai's near sizes with **Looks right**, and watch it start counting in Compare.
- Confirm Mahalaxmi's phone price, or **Ask the supplier**.

**Ask AI:**
- "Which prices still need checking, and why?"
- "What did Shree Ganesh's revised quote change?"
- "What if we leave out Pacific, given their total doesn't add up?"

**Award:** check the split, then **Send for approval**.

---

## If something looks off
- **"Still reading this supplier's last email":** wait a few seconds; replies are read one at a time.
- **The winners differ slightly:** a flagged price only counts after you confirm it in Check, so your Check decisions change the result. That's intended.

## Reset afterwards
```bash
cd /Users/rishabh/Documents/Claude/aerchain-rfx && npm run reset-demo
```
