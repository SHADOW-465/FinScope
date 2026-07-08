# Golden statement corpus

Per-bank accuracy gates (PRD-v2 §D, §H): a bank parser counts as "supported"
only when real statements for that bank pass these tests — transactions
extracted, running balance reconciled to the paisa.

## Adding a fixture

Create one folder per statement under `tests/golden/`, e.g.
`tests/golden/icici-savings-01/`, containing a `fixture.json`:

```json
{
  "description": "ICICI savings, 3 months, salary account",
  "bank": "ICICI Bank",
  "textFile": "statement.txt",
  "expected": {
    "transactionCount": 214,
    "accountNumber": "XXXXXX1234",
    "accountHolder": "SAI PRAHLAD",
    "closingBalance": 152340.55,
    "integrity": "ok"
  }
}
```

- `textFile` points to the raw text extracted from the PDF (what `pdf-parse`
  returns). To capture it from a real PDF, run the app locally, or:
  `node -e "require('pdf-parse/lib/pdf-parse.js')(require('fs').readFileSync('stmt.pdf')).then(d => require('fs').writeFileSync('statement.txt', d.text))"`
- Alternatively inline the text as a `"text"` field instead of `textFile`.
- Only `transactionCount` and `integrity` are mandatory in `expected`; the
  other keys are asserted when present.
- **Anonymize before committing**: replace names/account numbers in the text
  and keep amounts/dates intact (they're what the math checks).

The harness (`src/lib/parser/golden.test.ts`) discovers every folder
automatically — no code changes needed per fixture. Run with `npm test`.
