# Demo data: RSG Herbal House (Ayurvedic products)

Everything here is fictional demo data, created for the Aerchain take-home prototype.

```
data/
├── seed/          Master data. The source of truth. Edit in Excel (save as "CSV UTF-8").
├── answer-key/    The truth: what each supplier wrote and the correct comparable price.
│                  Used to create the supplier files and to score the AI. The AI never sees it.
└── files/         The messy real-world files the AI has to read.
```

## Commands

| Command | What it does |
|---|---|
| `npm run seed` | Loads `seed/` and `answer-key/` into the app. Run after editing a CSV. |
| `npm run make-files` | Recreates every file in `files/` from the answer key. |
| `npm run make-master-data -- --force` | Recreates `seed/` and `answer-key/` from scratch. **Overwrites your edits.** |

## What the app reads from `seed/`

Every screen reads these sheets. Nothing on screen is typed into the code. Totals, savings, splits and gaps are **calculated** from them (see `src/lib/analysis.ts`).

| Sheet | Used on |
|---|---|
| items, suppliers, people, supplier_track_record, supplier_documents, last_year_prices, contracts, market_prices, company_rules, quality_questions | Compare, Check, Suppliers, Award, After delivery |
| sourcing_events | Home, Sourcing events list, event header |
| team_requests, team_request_fields, team_request_checks | Home, Requests list and detail |
| approvals | Approvals page |
| insights, savings_by_month | Home |
| change_history | Change history |

## The sourcing event: RFQ-2026-014, Corrugated boxes FY27, Haridwar

30 box sizes, about 10 lakh boxes a year. 6 suppliers invited, 5 replied, each in a different format.

| Supplier | File(s) | What makes it hard |
|---|---|---|
| **A** Shree Ganesh Corrugators | `A/SGC_Quotation_FY27.xlsx` + email | Ignores our layout. Own product codes. Sizes in **cm**. Priced **per 100 boxes**. Rows in their own order. One size (C09) slightly different, so the match is uncertain. ISO certificate is in a **different company name**. |
| **B** Pacific PackWorks | `B/PPW-Q-2611-044.pdf` (3 pages) + email | Prices in **US dollars, including GST**. **2% discount hidden** in grey small print on page 3. Box C05 has a **second, different price** on page 3. The **grand total doesn't add up**. Valid only 15 days. Replaces an earlier quote. |
| **C** Om Sai Packaging | `C/Offer_Letter_OmSai.docx` + email | Prices **inside long paragraphs**. Offers **7-ply instead of 5-ply** for C18. **5% off only if all 30 items** are awarded. 90-day payment, 6-week delivery. Claims ISO certification but **no certificate attached**. |
| **D** Rajdhani Carton | `D/IMG_20261109_1842.jpg` + WhatsApp | **Photo of a printed rate card**, tilted, with **handwritten** entries. **27 of 30** sizes priced. One **blurry, struck-out** digit (C07). One price **10× too low** (C14). ISO certificate **expired**. Box-strength test **fails our spec**. |
| **E** Mahalaxmi Box Makers | `E/whatsapp.txt`, `E/call_note.txt` | One line: *"₹42/kg for the 5-ply, 38 for the 3-ply, rest same as last year, freight extra."* Needs **box weights** and **last year's prices**, which exist for only 2 of 5 boxes. One price given **only on a phone call**. Quality questions not answered. |
| **F** Doon Corrupack | `F/out_of_office.txt` | Last year's cheapest. Sent only an **out-of-office reply**, then silence. Their price must never be guessed. |

Also in the event folder:
- `questions/`: supplier questions during bidding. A and C ask the same thing; E asks if per-kg pricing is OK.
- `inbox.json`: every message in the order it arrived, with channel, time, type and attachments. This is the fake inbox.
- `D/PRINT_ME_Rajdhani_RateCard.pdf` and `D/HOW_TO_TAKE_THE_PHOTO.md`: to replace the generated photo with a real one.

## Team requests (company team → buyer): `files/requests/`

| Request | From | Format | What it tests |
|---|---|---|---|
| REQ-0142 | Sandeep Rawat, Haridwar | WhatsApp (Hinglish) | Turning a chat message into a request (converted to RFQ-2026-014) |
| REQ-0151 | Sandeep Rawat, Haridwar | WhatsApp | Urgent; the same box is already being sourced |
| REQ-0150 | Meera Iyer, Head office | Email | Vague: chair type, date and budget missing |
| REQ-0147 | Vikram Negi, Baddi | Form + Excel list | Two plants want the same boxes, so combine them |
| REQ-0139 | Arjun Mehta, Head office | Form | Clear request with a spec |
| REQ-0135 | Sandeep Rawat, Haridwar | Email | Already covered by an existing contract |
