# QuoteLens: kill the quote spreadsheet

A working prototype for the Aerchain product assignment. It takes a buyer from a plant's WhatsApp request to an approved award:
1. drafts the request for quotes with an AI co-pilot;
2. reads whatever suppliers send back (Excel, PDF, Word, photos, WhatsApp, handwriting);
3. lines everything up on the same basis;
4. lets the buyer ask questions in plain language.

Built for RSG Herbal House, a fictional Ayurvedic products company buying corrugated boxes. All data is made up.

**Principle:** AI reads and explains, rules calculate, the buyer decides. Sending email and WhatsApp is simulated; reading every reply is real.

## Run it

**You need:** Node.js 20 or newer, and a Claude API key.

```bash
npm install
cp .env.example .env.local      # then put your Claude key in .env.local
npm run dev
```

Open **http://localhost:3000**. Click **Take a tour** at the top of any page for a short guided tour.

## Try it end to end

The `test-cases/` folder has ready-made scenarios, each with a step-by-step guide:

| Case | What it covers |
|---|---|
| `01-raise-request/` | Paste a plant's Hindi-English WhatsApp plus their Excel, then the draft, the AI co-pilot, approve, send. Then six supplier replies: Excel, PDF in USD with a footnote discount, Word letter, angled photo, WhatsApp screenshot, blurry handwriting. |
| `02-baddi-team-request/` | A plant's request already waiting in Requests (18 sizes). Seven replies: a revised quote, a wrong total, near sizes, "same as last year", a phone-call price, "on request", per 1,000 pcs. |

Supplier replies are sent from an event's **Quotes → Supplier inbox → Simulate an incoming email**. Each one is read live, then **Compare**, **Check**, **Ask AI** and **Award** fill in.

The **Corrugated shipper boxes FY27** event (RFQ-2026-014) comes pre-filled: 5 suppliers × 30 boxes, already read, so Compare, Check, Ask AI and Award can be explored straight away.

## Useful commands

| Command | What it does |
|---|---|
| `npm run reset-demo` | Back to the clean starting data (removes anything you created) |
| `npm run read-quotes` | Re-read the demo event's supplier files with the AI |
| `npm run score` | Check the AI's readings against the answer key |
| `node scripts/make-test-cases.mjs` | Rebuild the sample files in `test-cases/` |

## Where things are

- `src/app/`: pages and API routes (request chat, draft co-pilot, supplier inbox, Ask AI, approvals)
- `scripts/reader/`: turns any file into located text (Excel, PDF, Word, OCR for photos), plus the AI reading step
- `scripts/read-quotes.mjs`: AI reads; code matches, converts and checks each reply
- `data/seed/`: the company's data as CSV files (suppliers, items, requests, events, history)
- `data/files/`: supplier and request files
- `docs/presentation-content.md`: presentation content

## Deliberately left out

Real email and WhatsApp sending, ERP and purchase-order integration, logins and roles, a production database, live exchange rates (one fixed rate, shown on every conversion), and production hosting.
