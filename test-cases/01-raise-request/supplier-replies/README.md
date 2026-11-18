# Six supplier replies to the gift-pack request

Six emails from the six suppliers you send the gift-pack request to. Each is in a different format, with the rough edges real replies have.

**Use them after Test A:** raise Sandeep's request with `Haridwar_giftpack_box_list.xlsx`, convert it, approve, and send it to the 6 suppliers.

**Line items they answer** (fixed when you approve):

| Line | Box | Ply | Qty / year | Our code |
|---|---|---|---|---|
| L1 | 400 × 300 × 300 | 5 | 30,000 | C13 (weight known) |
| L2 | 500 × 400 × 400 | 5 | 25,000 | C16 (weight known) |
| L3 | 350 × 250 × 150 | 5 | 22,000 | new size |
| L4 | 300 × 220 × 180 | 3 | 18,000 | new size |
| L5 | 450 × 320 × 220 | 5 | 15,000 | new size |
| L6 | 250 × 180 × 120 | 3 | 10,000 | new size (sample kit) |

> If you used the co-pilot to **remove the sample kit**, L6 won't exist. Replies that price it simply have nothing to match, which is fine.
> If you used **+10%**, quantities change but prices don't.

## How to send each one

On your event's **Quotes** tab, under **Supplier inbox**, click **Simulate an incoming email**, then:
1. **From:** the supplier in the folder name.
2. **Subject:** copy from `email.txt`, under SUBJECT.
3. **Body:** copy from `email.txt`, under BODY.
4. **Attach:** the one file in the folder.
5. Click **Send**.

You can send all six back to back. They're read one after another, about 10–15 seconds each. Each email then shows its result and **Next** steps.

## What each one tests, and what you should see

The wording of notes can differ run to run. The numbers below are worked out by code and should match.

### 1 · Shree Ganesh Corrugators: Excel in their own format
`SGC_Quotation_GiftPack.xlsx`. Their own codes (SG-5P-4030…), rows in a different order, one size written in **cm** (40x30x30), priced **per 100 pcs**, freight extra.
- **6 green.** L1 = 3,780 ÷ 100 = ₹37.80, then +4% freight estimate = **₹39.31**.
- **Brief:** "a beautiful Excel that ignores the template"; "per box" vs "per 100 pieces".

### 2 · Pacific PackWorks: PDF on letterhead, US dollars
`PPW-Q-2611-052.pdf`, 2 pages. **USD including GST**, a **2.5% discount hidden in a tiny footnote** on page 2, and the hamper box (L5) priced on page 1 **and again** in an annexure on page 2.
- **5 green, 1 red.** L1 = 0.52 × ₹84.20 ÷ 1.18 × 0.975 = **₹36.18**. The note shows each step, including the discount.
- **L5 is red: "Two different prices in the same reply".** It won't count in the award until you fix it in Check.
- **Brief:** "PDF on letterhead with the discount buried in a footnote"; "quoted in USD".

### 3 · Om Sai Packaging: Word letter, prices in paragraphs
`OmSai_Offer_GiftPack.docx`. Prices inside sentences. For the hamper box they offer **7-ply instead of 5-ply**. A **4% discount only if all six** are ordered from them.
- **5 green, 1 amber.** L5 is marked **alternative item**, not compared as the same box.
- The 4% discount is listed but **not applied**, because its condition isn't met.
- **Brief:** "a Word doc where the commercials are in a paragraph".

### 4 · Rajdhani Carton: photo of a printed rate card, at an angle
`IMG_20261118_1105.jpg`. Tilted photo, two prices written in blue pen, **only 5 of 6 sizes** (350×250×150 missing), and the handwritten **0.99** for the duo box, about 10× too low.
- **L3: Not quoted**, never zero.
- **L4: ₹0.99, amber: "About 10× lower than other suppliers".** It is **not** treated as cheapest until you check it.
- Values where the text recognition and the photo disagree are amber, with the reason, for example "OCR read 1.90; photo shows handwritten 61.90".
- **Brief:** "a photo of a printed rate card, taken at an angle"; "quoted 27 of 30 lines".

### 5 · Mahalaxmi Box Makers: WhatsApp screenshot, per kg
`Screenshot_2026-11-18-11-06.png`. "5 ply ₹44 per kg, 3 ply ₹39 per kg, freight extra" and "sample kit box not possible".
- **L1 = 44 × 0.844 kg + 4% = ₹38.62. L2 = ₹65.85.** Converted using our known weights for C13 and C16.
- **L3, L4, L5: amber, no price.** "Quoted per kg, but we don't have this box's weight", so it isn't guessed.
- **L6: Not quoted**, quoting their words *"not possible sir, too small"*.
- **Brief:** "₹42/kg for the 5-ply, 38 for the 3-ply… freight extra".

### 6 · Doon Corrupack: handwritten, blurry phone photo
`WhatsApp_Image_2026-11-18_at_11.20.jpg`. Handwritten on ruled paper, photographed blurry and slightly rotated.
- **All 6 read** (36.80, 62.40, 24.10, 9.90, 39.60, 5.20) but **all amber**: "Photo reading confidence only 47%".
- **The point:** the AI reads it, but nothing from a blurry photo counts until you confirm it in Check.

## Then

1. **Compare:** 6 × 6, with the cheapest **usable** price highlighted per line. Flagged prices don't count until checked.
   - With nothing checked yet, the cheapest per line comes to about **₹39.15 L a year**, against Shree Ganesh alone at about **₹42.07 L**.
   - Click any price to see the exact spot in the file and every conversion step.
2. **Check:** fix the red (Pacific L5), confirm or correct the ambers. Watch the highlighted winners change.
3. **Ask AI:**
   - "What's the best award, and what did you leave out?"
   - "What if we leave out Pacific?"
   - "Which prices still need checking, and why?"
4. **Award:** send for approval, unlocked once no red items are left.

## Rebuild these files
`node scripts/make-test-cases.mjs` regenerates every attachment here.
