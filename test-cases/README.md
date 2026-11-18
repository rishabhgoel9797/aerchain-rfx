# QuoteLens test cases

Hands-on cases that cover what the Aerchain brief asks for. Between them they cover every rough edge in the brief: the custom Excel, the PDF footnote discount, the Word paragraph, the angled photo, 27 of 30 lines, USD, per 100 pieces, per kg, and "rest same as last year". The VP's split question is asked on the Ask AI tab. Each folder has a README (steps, what you should see, what to say), the text to copy, and the files to upload.

| # | Folder | Brief line it tests | Status |
|---|---|---|---|
| 01 | `01-raise-request/` | "A buyer *talks* an RFx into existence with an AI co-pilot", and what happens when the AI isn't sure; then six replies: Excel, PDF in USD, Word, angled photo, WhatsApp screenshot, handwriting | Ready |
| 02 | `02-baddi-team-request/` | A plant's request already waiting (form + list); replies with a revised quote, a wrong total, near sizes, "same as last year", a phone-call price, "on request", per 1,000 pcs | Ready |

**Before a run:** the app must be running at http://localhost:3017, with the internet on.

**After a run:** go back to the starting data with `npm run reset-demo`, run from the `aerchain-rfx` folder.

**Rule of thumb when reading results:** the AI's wording (titles, notes) can differ from run to run. Numbers never do, because totals, matches, conversions and percentages are worked out by code.

To rebuild the sample files (Excel lists and so on), run `node scripts/make-test-cases.mjs`.
