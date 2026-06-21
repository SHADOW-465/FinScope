<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FinScope Developer & Agent Manual

Welcome! This document serves as the single source of truth for AI agents and developers working on the **FinScope** platform.

---

## 1. Core Architecture & Philosophy

FinScope is a credit underwriting and financial intelligence dashboard designed to deploy natively on **Vercel's Free Tier** (zero-database overhead, zero persistent storage, 100% ephemeral privacy).

* **In-Memory Parsing**: Bank statement PDFs are uploaded, parsed into text using `pdf-parse` in-memory inside Next.js Serverless Route Handlers (`/api/process`), and immediately analyzed.
* **Client-Side Session State**: Processed results are returned to the React frontend and stored in state. No files or transaction records are saved to disk or database.
* **Stateless Reports**: Exporting documents (Excel reports via SheetJS) is done dynamically via stateless route handlers. PDF reports are printed client-side via CSS printing rules (`window.print()`).
* **On-Device AI Classifier**: After the API returns, a quantised DistilBERT ONNX model (`Xenova/distilbert-base-uncased-mnli`, ~68 MB int8) is loaded from the HuggingFace CDN and runs **entirely in the browser** via ONNX Runtime Web (WebAssembly / WebGPU). It reclassifies `Miscellaneous` and low-confidence transactions using zero-shot NLI entailment. The original keyword classifier always runs first; the on-device model is a non-blocking verifier layer that never delays the initial result display.

---

## 2. Directory Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts          # LLM query assistant (Google Gemini / Groq Llama 3)
│   │   │   ├── export/route.ts        # SheetJS Excel exporter (maps Source File)
│   │   │   └── process/route.ts       # Main PDF parsing, grouping, and risk engine
│   │   ├── globals.css                # Tailwind, glassmorphic layout, print page breaks
│   │   ├── layout.tsx                 # SEO titles & global layout
│   │   └── page.tsx                   # Main Dashboard + ONNX enhancement orchestration
│   ├── components/
│   │   ├── Charts.tsx                 # Recharts (credits/debits and balance trends)
│   │   ├── ChatAssistant.tsx          # Floating chat interface with inline Markdown parser
│   │   ├── OverviewCards.tsx          # Account summary KPIs (holder, balance, ratio)
│   │   ├── Panels.tsx                 # Details panel for Income, Obligations, Bounces
│   │   ├── RiskCard.tsx               # Underwriting score gauge (sticky position, auto-height)
│   │   ├── TransactionTable.tsx       # Ledger with Source File badges + AI-enhanced row indicator
│   │   └── UploadZone.tsx             # Drag-and-drop file upload handler
│   ├── lib/
│   │   ├── engine/
│   │   │   ├── classifier.ts          # Keyword/regex-based primary classifier (server-side)
│   │   │   ├── local-classifier.ts    # On-device ONNX verifier (client-side, @huggingface/transformers)
│   │   │   └── risk.ts                # Underwriting formulas and risk profile builder
│   │   └── parser/
│   │       ├── detector.ts            # Bank IFSC and header structure sniffer
│   │       └── extractors.ts          # Bank-specific text parser logic
│   └── types/
│       └── pdf-parse.d.ts             # TypeScript types for pdf-parse package
```

---

## 3. Parsing & Extracting Logic (`src/lib/parser/extractors.ts`)

FinScope uses customized regex-based parsers to clean and parse statement lines into a double-entry ledger.

### Bank Detector (`detector.ts`)
* Matches statement keywords or IFSC prefixes to route files to the correct parser:
  * **Bank of Baroda** (IFSC matches `BARB`)
  * **ICICI Bank** (IFSC matches `ICIC`)
  * **IndusInd Bank** (IFSC matches `INDB`)
  * **Canara Bank** (IFSC matches `CNRB` or header patterns)
  * **Generic Fallback** (default regex parser)

### Custom Parser Quirks & Solutions (`extractors.ts`):
* **ICICI Bank**:
  * Transactions are parsed using a block-grouping method keyed on alphanumeric serials (`/^\d+([A-Z]\d+)$/`, e.g., `20M3423`).
  * *Line-wrap fixes*: Decimal values (`.XX`), transaction indicators (`Cr`/`Dr`), and split negative symbols (`-`) wrapping to separate lines are reverse-merged.
  * *Metadata*: Splitting is done on `"A/C"` and `"Branch"` to isolate clean account holder names (`SAI PRAHLAD`).
* **Canara Bank**:
  * Extracts account number and holder name inline on the same line (e.g. `Account Holders NameO B DENESH CHAKKARAVARTHY`) by stripping the prefix.
* **IndusInd Bank**:
  * *Customer Name*: Scans backward from the pin code/country text block near `"Page 2 of"` until it hits a numeric transaction balance line. The line immediately following this balance is extracted as the customer's name (`AMETHYST BIO LABS PRIVATE LIMITED`).
  * *Three-Line Amount Scanner*: Scans transaction subgroups to match three consecutive lines for Debit, Credit, and Balance, resolving address wrap issues.

---

## 4. Processing & Multi-Account Aggregation (`/api/process`)

When multiple files are uploaded together:
1. **Independent Account Grouping**: The API parses each file individually and groups them by a unique key: `bankName_accountNumber` (or `bankName_accountHolder` if account number is unknown).
2. **Stable Sorting Timeline**: For each unique account group:
   * Merges all transactions from all statements in that group.
   * Stably sorts the combined list using **Date -> File Upload Index -> Relative Position Index**. This prevents scrambled intra-day running balances.
3. **Independent Underwriting Score Calculation**: Computes a separate `riskProfile` (Weighted Underwriting Score, monthly credits/debits, EMI liabilities, negative balances) for each account.
4. **Account Switcher**: The client-side dashboard renders an interactive selector when multiple distinct accounts are uploaded, updating visual cards, charts, and chatbot context on the fly.

---

## 5. On-Device AI Classifier (`src/lib/engine/local-classifier.ts`)

The on-device classifier is a **post-processing verifier** that runs in the user's browser after the deterministic parser & keyword classifier have already produced results.

### Architecture

| Layer | Where | What it does |
|-------|-------|-------------|
| `classifier.ts` | Server-side (Serverless) | Fast keyword/regex rules. Always runs first. Produces instant results. |
| `local-classifier.ts` | Client-side browser (ONNX WASM) | Zero-shot NLI entailment via DistilBERT. Reclassifies edge cases only. Never delays initial render. |

### Model Details
* **Model**: `Xenova/distilbert-base-uncased-mnli`
* **Format**: int8-quantised ONNX (~68 MB)
* **Runtime**: `@huggingface/transformers` v3 -> ONNX Runtime Web (WebAssembly / WebGPU)
* **Hosting**: HuggingFace CDN (not bundled with the Vercel deploy). Browser-cached after first load.

### Invocation Criteria
The ONNX model is only invoked for transactions where:
* `category === "Miscellaneous"` **OR**
* `confidenceScore < 0.75`

This keeps inference time proportional to the number of ambiguous transactions (typically 5-20% of the total set) rather than the full ledger.

### Result Policy
* The model's answer is accepted only when its top-label NLI score exceeds **0.60**.
* Accepted reclassifications set `aiEnhanced: true` on the transaction object.
* The TransactionTable renders a sparkle icon in the category badge for AI-enhanced rows.
* If the model fails to load (network error, WASM blocked), the system falls back to the keyword classifier results silently.

### State Management in `page.tsx`
```
API response -> setAnalysisResult (instant display)
                      |  (non-blocking, dynamic import)
            enhanceClassifications()
                      |  per-account, sequential
            setEnhancedReports()  <- replaces transactions array for that account
```

`activeReport` prefers `enhancedReports[id]` over `analysisResult.reports[id]` once enhancement is complete.

### Next.js / Webpack Requirements
`next.config.ts` must alias out `onnxruntime-node` from the browser bundle and set
`Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`
headers to enable SharedArrayBuffer for multi-threaded WASM.

---

## 6. Visual Layout & UI Quirks

* **Widescreen Responsive Scaling**: Page layout is designed to stretch to wider monitors (`max-w-[96%] 2xl:max-w-[1700px]`) to fully utilize screen space.
* **Underwriting Score Widget**: Set to `h-auto` and `lg:sticky` in the sidebar so it remains visible while scrolling down the ledger without vertical stretching.
* **Pagination Print Breaks**: Injected CSS print breaks (`.print-page-break`) between dashboard components. Printing creates a beautiful, paginated 3-page PDF.
* **AI Chat Assistant**: Fitted with a custom inline markdown formatter in React to handle bullet points, bold headers, and code quotes. Runs a local heuristic rules model if no API key is set in settings.
* **AI Enhancement Status Badge**: Shown in the header while the ONNX model is loading/running (`AIEnhancementBadge` component in `page.tsx`). Transitions: loading -> running (with % progress) -> done (enhanced count) -> error (graceful fallback message).
* **AI-Enhanced Row Indicator**: Category badges in `TransactionTable` show a small sparkle icon when a row was reclassified by the on-device model (`aiEnhanced: true`).

---

## 7. Key Commands

* **Local Dev Server**:
  ```bash
  npm run dev
  ```
* **Production Build Compile**:
  ```bash
  npm run build
  ```
* **TypeScript Validation**:
  ```bash
  npx tsc --noEmit
  ```
* **Ledger Math & Parser Verification (Must run in CommonJS mode)**:
  ```powershell
  # Windows PowerShell
  $env:TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node"}'; npx ts-node --transpileOnly test_accuracy.ts
  ```
