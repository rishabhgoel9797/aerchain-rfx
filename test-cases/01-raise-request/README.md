# 01 · Raise a request: talk an RFx into existence

**From the brief:** *"A buyer talks an RFx into existence with an AI co-pilot: scope, line items, questionnaire, terms."*
Plus: *"What does your system do, and what does it show the buyer, when it isn't sure?"*

**Time:** about 5 minutes. **Needs:** the app running at http://localhost:3017 (internet on, for Claude).

**Files in this folder**

| File | What it is |
|---|---|
| `paste-this.txt` | All the text to copy: Tests A, B and C, plus the co-pilot instructions |
| `Haridwar_giftpack_box_list.xlsx` | The plant's own item list: 6 box sizes, 1,20,000 boxes a year. Two sizes we already buy (C13, C16), four we don't |

---

## Test A · A team's WhatsApp in Hindi-English, with their Excel

**Steps**
1. Go to **Home**.
2. Copy the Test A message from `paste-this.txt` and paste it into **"What do you need to buy?"**.
3. Click **Attach** and pick `Haridwar_giftpack_box_list.xlsx`.
4. Leave **Raise as** on **Let AI decide**, then click **Continue**. The button shows "QuoteLens is reading…" for about 5 seconds.

**What you should see:** the request page, for example REQ-0152.
- **Title:** something like "Chyawanprash gift pack boxes FY27, Haridwar". Claude writes it, so the exact words can differ.
- **From:** Sandeep Rawat, tagged *Company team · Stores Manager, Haridwar*. Claude found the name in the WhatsApp line, and code matched it to the people list.
- **Files:** "Message" and the Excel. Click either one to open it in the viewer.
- **What the AI understood:**
  - Quantity "about 1,20,000 a year". The total is worked out by code from the Excel, never by the AI.
  - Delivery to Haridwar.
  - Needed by, Contract and Budget marked **missing**, in orange.
- **Ask Sandeep (3 questions):** a ready WhatsApp listing only the missing details.
- **The AI usually also flags** that 2 sizes in the list are 3-ply while the message says "5-ply wale strong". That's the AI being careful about something ambiguous, not guessing.

5. Click **Convert to sourcing event**. Claude re-reads the message and the Excel in about 5 seconds, and the draft opens.

**What you should see on the draft:**
- **6 items** from the Excel, with a "Used for" column.
- **C13 and C16** matched to our item codes; the other four marked **New size**.
- **Estimated yearly value: "Not estimated yet".** Four sizes have no past price, and the app won't show a half-made number.
- **Before you send:** "2 of the 6 sizes (C13, C16) are already being sourced in the Haridwar boxes event RFQ-2026-014. Consider adding this volume there."
- **Request files** in the header. They stay on every step from Request to Award.

## Test B · The buyer's own words, which become a request for quotes

1. Click **Sourcing events** in the left menu.
2. At the top there's a box titled **"Start a new request for quotes"**, with the hint *"Describe what you want suppliers to quote for…"*. Paste the Test B text there.
3. Press **Enter**, or click **Draft request for quotes**.

*Or use Home: paste it into "What do you need to buy?", and set **Raise as** to **Request for quotes** (or leave Let AI decide).*

**What you should see:** a new sourcing event, straight to the draft, with no internal request step.
- 2,000 boxes, 600 × 400 × 400 mm, 5-ply, Haridwar, before GST.
- **"30 Nov (year not given)"**: the AI notices what's not said.
- **Type / spec:** the AI uses our item master for C19 (board GSM, weight), because the message says "same spec as C19".

## Test C · Too vague, so the AI must ask, not guess

1. On **Home**, type `need some boxes urgently` and press **Enter**.

**What you should see:** an orange box saying *"Not enough to start yet. Nothing was saved."* It lists 3 to 4 questions: what kind, how many, which plant, by when.
- **No request is created.** Check Requests: the count doesn't change.
- Add details to the same message, for example `...corrugated 5-ply, 500 boxes, Haridwar, by 30 Nov`, and send it again. Now it goes through.

---

## The co-pilot · change the draft by talking to it

On the draft from Test A, scroll to **Change the draft with AI** and type each line from `paste-this.txt`:

| You type | What should happen |
|---|---|
| Add 10% to all quantities | Every quantity goes up 10%, shown in **orange** (30,000 → 33,000). Claude only chooses "+10%"; **code does the maths**. |
| Move the deadline to 5 Dec, 6 pm | The Deadline box turns orange: 5 Dec, 6 pm. The Send step later uses this date. |
| Ask suppliers to confirm the bursting strength of 5-ply boxes, with a test report | A new quality question, tagged **Added by you** |
| Remove the sample kit box | Item 6 (250 × 180 × 120, "Sample / trial kit") disappears. Claude found it from the Excel's "Used for" column. |
| Make the big ones a bit more | **Nothing changes.** Claude asks which items and by how much. |

Every change is logged in **Change history**. Once you click **Approve and choose suppliers**, the draft is locked.

## Then, to finish the flow (about 1 minute)

1. **Approve and choose suppliers.**
2. **On Suppliers:**
   - the 6 approved box suppliers are pre-ticked;
   - **Unity Box House is blocked** and can't be ticked;
   - **Sai Om** (same directors as Om Sai) and **Kraftline** (new, papers missing) show warnings;
   - the company rule of **at least 3** is enforced.
3. **Send request to 6 suppliers.** The Quotes tab shows who was sent it, how and when, with the deadline you set.

## Then, the six suppliers reply

The folder `supplier-replies/` has six emails, one per supplier, each in a different format: Excel, PDF in USD, Word letter, angled photo, WhatsApp screenshot, handwritten blurry photo.
Send them from your event's **Quotes → Supplier inbox → Simulate an incoming email**. Each is read live, then Compare, Check, Ask AI and Award fill in.
See `supplier-replies/README.md` for what each one tests and what you should see.

---

## If something looks off

- **It's stuck on "Setting up…"** for more than 5 seconds: refresh the page. The data is already saved.
- **"The AI couldn't read this… Nothing was saved."** Check the internet connection, then try again.
- **The wording differs from this guide.** That's expected: Claude writes the titles and notes fresh each time. The numbers (totals, matches, +10%) come from code and are always the same.

## What to say

> "The AI reads and drafts; code counts and calculates; nothing is saved when the AI isn't sure what you mean. It asks instead. Every change is in orange and in Change history, so the buyer can see exactly what moved before anything goes to suppliers."

## Reset afterwards

Each run adds requests and events. To go back to the starting point:

```bash
cd /Users/rishabh/Documents/Claude/aerchain-rfx && npm run reset-demo
```
