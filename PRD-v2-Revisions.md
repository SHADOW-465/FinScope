# FinScope — PRD v2: Corrections, Gaps & Additions

> **Status:** Companion document to `PRD.md` (v1).
> **How to read this:** `PRD.md` remains the vision document and is **not** deleted. This file is the *engineering-and-strategy correction layer*. **Where this document conflicts with `PRD.md`, this document wins.** Everything in `PRD.md` not contradicted here still stands.
> **Date:** 2026-06-30 · **Author:** Validation pass over the ChatGPT-authored v1.
> **Decisions baked in (confirmed with product owner):**
> 1. New PRD delivered as a *targeted v2 companion* (this file).
> 2. MVP is built on a **full persistent backend from day one** (no throwaway/ephemeral spine).
> 3. Near-term goal: **ship a sellable, single-user-first MVP fast**, then expand.

---

## 0. Executive verdict on v1

The v1 PRD has an excellent **product doctrine** and weak **engineering realism**. Keep the doctrine; fix the realism.

**Keep (these are the IP):**
- "Numbers come from deterministic code. Narratives come from AI." (v1 Part 3 & 7) — correct and non-negotiable.
- Evidence-linked explainability (every score cites transactions/metrics/rules).
- Configurable **Lender Policy Engine** (per-product FOIR/balance/bounce thresholds).
- **Cross-document validation** (GST vs. bank credits, ITR vs. observed income) — the real moat.
- Chennai/Tamil Nadu grounding (IOB, TN cooperative banks, seasonal MSME income, hidden-loan detection).

**Fix (this document):** architecture self-contradiction, compliance, data sourcing, parsing-accuracy realism, financial math, AI over-architecting, persistence model, timeline, and MVP scope discipline.

---

## A. Architecture reconciliation (the most important correction)

### A.1 The contradiction in v1
- `PRD.md` Part 5 mandates a **FastAPI/Python backend, multi-tenant DB, persistent case management, branch hierarchy, audit trails**.
- The **shipped code** (`src/`, `AGENTS.md`) is **Next.js 16 on Vercel, in-memory, no database, client-side ONNX, "100% ephemeral privacy."**
- v1 never reconciles "ephemeral/no-storage privacy" with "persistent enterprise case management." You cannot lead with both.

### A.2 Decision (overrides v1 Part 5 stack)
Build on a **persistent backend from day one**, staying **Vercel-native** rather than introducing a separate Python service:

| Layer | v1 said | **v2 decision** | Why |
|---|---|---|---|
| Frontend | Next.js | **Next.js 16 App Router (keep)** | Already built; no reason to change. |
| Backend | Separate FastAPI/Python | **Next.js Route Handlers / Server Actions on Vercel Fluid Compute** | One repo, one deploy, full Node.js on Fluid Compute (300s timeout) covers PDF parsing + orchestration. A second Python service is premature ops overhead for a fast single-user MVP. Revisit Python only if a parsing/ML library has no JS equivalent. |
| Database | "Session storage / DB" (vague) | **Postgres via Supabase (Vercel Marketplace)** | Postgres + Auth + Storage + Row-Level Security in one product; native Vercel integration; gives multi-tenant isolation *now* so there is zero rework when we add teams. |
| Auth | "Email/password, SSO later" | **Supabase Auth (email/password) for MVP; SSO later** | Same vendor as DB; RLS ties cleanly to `auth.uid()`. |
| File storage | "Temporary" | **Supabase Storage, private bucket, server-side encryption, configurable retention** | Replaces the "nothing is ever stored" claim with "stored encrypted, deletable, isolated" (see §B). |
| Deterministic engines | Python (pandas/numpy) | **Keep the existing TypeScript engines** (`src/lib/engine/*`, `src/lib/parser/*`) | They already exist and work for the first banks; porting to Python is wasted effort. |
| On-device classifier | Not in v1 | **Keep the client-side ONNX verifier as an optional enhancement layer** | It's a genuine privacy/UX nicety, but it must never be on the critical path (it already isn't). |
| LLM access | "Never hardcode one vendor" (correct) | **Route through Vercel AI Gateway** with `"provider/model"` strings | Achieves v1's multi-provider goal without per-provider SDK lock-in; gives fallbacks, observability, and zero-retention options in one place. |

### A.3 Revised privacy posture (overrides the "ephemeral / zero-storage" positioning)
The current marketing line ("100% ephemeral privacy, nothing stored") is **incompatible with the persistent backend we just chose, and with cloud LLM calls.** Replace it with an honest, defensible posture:

- **Data minimization, not data absence.** We store what case management needs (cases, transactions, metrics, reports) and nothing more.
- **Encryption** in transit (TLS 1.3) and at rest (AES-256 / provider-managed keys).
- **Tenant isolation** enforced by Postgres RLS — cross-tenant access is technically impossible.
- **Configurable retention + hard delete** (immediate / 24h / 7d / manual), with a verifiable deletion record.
- **PII boundary for LLMs** (see §F.3): transaction narrations are PII; either redact before sending to a cloud model, use an enterprise zero-retention gateway route, or offer an on-device LLM mode. Pick one *explicitly* per deployment and document it on the security page.

> The differentiator is no longer "we store nothing." It is **"your applicant data never trains anyone's model, is isolated per tenant, and is deletable on demand."**

---

## B. Compliance & regulatory (NEW — largely missing from v1, and the #1 risk)

A credit-underwriting product handling Indian financial PII cannot treat compliance as a footnote. Add a dedicated workstream.

### B.1 DPDP Act 2023 (Digital Personal Data Protection)
- FinScope is a **Data Processor** acting for the lender (**Data Fiduciary**). Reflect this in ToS and a DPA template.
- Requirements to build into the product, not bolt on:
  - **Consent capture**: record that the borrower consented to their statement being analyzed (timestamp, purpose, who uploaded). Add a `consent` record per case.
  - **Purpose limitation**: data used only for the stated underwriting purpose.
  - **Right to erasure**: the hard-delete flow in §A.3 satisfies this.
  - **Breach notification** readiness (audit logs + alerting already in v1 Part 8 — keep).

### B.2 RBI Account Aggregator (AA) — elevate from "future" to *strategic primary path*
v1 lists AA as a vague future integration. For a serious underwriting tool this is backwards:
- **PDF upload of someone else's bank statement is the weak path**: consent is informal and the file is trivially forged (see §B.4).
- **AA is the RBI-sanctioned, consent-driven, tamper-proof path** to fetch statement data directly from the bank.
- **v2 stance:** PDF upload is the **MVP wedge** (fast, no partnerships needed), but the data layer must be designed so an **AA feed is a drop-in alternate source** behind the same `Transaction[]` contract. Plan an AA integration (via a TSP/AA partner) as a **Phase 3** headline feature, not a someday-maybe.

### B.3 Fair-lending & model-governance positioning
- Keep v1's "augment, not replace" stance — it's correct and protective.
- **The product must never be marketed as *making* the credit decision.** It produces an *evidence-backed recommendation*; a human approves. Put this in the UI (every recommendation screen) and the report footer.
- Avoid any feature that could read as discriminatory proxying (e.g., scoring on inferred religion/caste/area). Keep scoring strictly on financial behavior.

### B.4 Document authenticity / tamper detection (NEW — v1's "fraud engine" misses this)
v1's fraud engine inspects **transaction patterns** (round-tripping, window dressing) but **not document forgery**. For uploaded PDFs add:
- **PDF metadata & structure checks** (producer, edit history, font/object anomalies, incremental-update markers).
- **Running-balance integrity check**: for every row, `balance[n] == balance[n-1] ± amount`. A break = tampering or a parse error — flag it.
- **Cross-page continuity** (opening balance of page N matches closing of page N-1).
- Surface an explicit **"Statement Integrity"** indicator separate from the borrower's risk score.
- This is also the strongest argument for the AA path (§B.2): AA data is bank-sourced and needs no tamper check.

---

## C. Data-sourcing strategy (NEW)

| Source | When | Consent | Tamper risk | Effort |
|---|---|---|---|---|
| **PDF upload** | MVP (now) | Informal (capture in-app, §B.1) | High → run §B.4 checks | Low |
| **AA feed** | Phase 3 | Formal, RBI-grade | None (bank-sourced) | High (partner + certification) |
| **Net-banking statement export / CSV** | Optional Phase 2 | Informal | Medium | Low |

Design every downstream engine to consume a single normalized `Transaction[]` so the source is swappable.

---

## D. Parsing & accuracy realism (v1 under-weights the hardest problem)

v1 says "FinScope is **not** a PDF reader" and treats extraction as a commodity with "95%+ extraction / 90%+ classification" targets. In reality, **parsing heterogeneous Indian bank PDFs is the single riskiest engineering surface** and it gates everything.

Corrections:
1. **Accept that parsing is the core risk, and budget for it.** The current repo has hand-written regex parsers for ~4 banks (`src/lib/parser/extractors.ts`, `detector.ts`). Each new bank/format is real work, not config.
2. **Golden-corpus first.** Before claiming any accuracy number, build a **versioned library of anonymized real statements** per bank (v1 Part 5 §24 mentions this — make it a *blocking prerequisite*, not a nice-to-have). Sourcing these is itself a mini-project; start collecting now.
3. **Per-bank accuracy gates.** A bank parser ships only when it passes its golden tests (balance-continuity must reconcile to the paisa on the corpus).
4. **Confidence honesty.** Hardcoded `confidence: 98` in v1's transaction schema is meaningless. Confidence must be **computed** (did balance reconcile? was the row layout canonical? did OCR fire?).
5. **Targets restated as honest, staged goals** (see §H), not launch guarantees.

---

## E. Corrected financial math (the code must catch up to the doctrine)

The current `src/lib/engine/risk.ts` is a good start but has underwriting-credibility bugs that v1's *prose* actually gets right. Fix the code to match the PRD:

1. **Average balance must be time-weighted (Average Daily Balance), not a mean of per-transaction balances.**
   - Current: `averageBalance = sum(txn.balance)/txns.length` — a day with 30 transactions is over-weighted; a 10-day gap is ignored.
   - Required: carry each day's closing balance forward across gaps and average over **calendar days** in the statement period. ADB is a number underwriters trust; the current one isn't.
2. **FOIR must use the v1 definition** (`Total monthly fixed obligations / Average monthly income`) and the **loan-ask** (see §E.4). The current `debt_ratio = monthlyEMI / averageBalance` is **not a standard ratio** — drop it or rename it; it shouldn't feed the score as-is.
3. **EMI detection ≠ category == "EMI Payment".** Recurring same-amount NACH/SI debits to known lenders should be detected by **periodicity + payee**, then the *remaining* obligation estimated. v1 Part 2 Module 10 is right; the code is naive.
4. **Capture the loan ask (NEW, missing entirely).** Underwriting is meaningless without *what is being underwritten*. Every case needs `requested_amount`, `tenure_months`, `product_type`. Then compute:
   - Indicative EMI for the ask (at a configurable rate/tenure).
   - **Post-loan FOIR** = (existing obligations + indicative new EMI) / average monthly income.
   - Eligibility verdict against the **lender policy** for that product.
   This also unlocks v1 Part 7's "Credit Simulation" feature almost for free.
5. **Seasonality-aware income** (v1 Module 16) should *down-weight* predictable troughs rather than penalize them — keep this principle in the income-stability score.

---

## F. AI layer right-sizing (v1 Part 7 is over-architected for now)

### F.1 Eleven agents is premature
v1 specifies 11 specialized agents + an orchestrator. For a fast MVP that is over-engineering. **MVP = one well-structured, evidence-constrained "Credit Officer" prompt** that takes the deterministic metrics bundle and returns strengths/concerns/recommendation/evidence in a fixed JSON schema. Split into multiple agents *only when* a single prompt demonstrably underperforms. Keep the orchestrator concept on the roadmap (Phase 2+).

### F.2 Keep the guardrails (v1 Part 7 §7, §11, §21 are excellent)
- AI never computes numbers, never invents transactions/EMIs.
- Every claim references a metric/transaction/rule ID.
- A validation pass rejects unsupported claims and schema violations before display.
- Insufficient evidence → explicit "not enough information" response.

### F.3 PII boundary (NEW — v1 ignores this)
The moment a transaction narration goes to Gemini/OpenAI, **PII leaves the device** — which breaks the privacy story unless handled. Choose per deployment and document it:
- **Default:** route through **Vercel AI Gateway** to a **zero-data-retention** model; send **redacted** narrations (strip names/account numbers, keep category/amount/date) where possible.
- **Enterprise option:** on-device / self-hosted model (the existing ONNX path is the seed of this).
- Never send the raw PDF to an LLM (v1 Part 5 §6 already forbids this — keep it).

---

## G. Persistence data model (NEW — required by the "persistent backend now" decision)

Postgres (Supabase) with RLS keyed on `org_id`. Multi-tenant from day one even though the MVP onboards a single user/org — this is what makes "single-user now, teams later" zero-rework.

```
organizations         (id, name, branding, retention_policy, created_at)
users                 (id, org_id, email, role, created_at)          -- role enum even if only 'owner' at MVP
applicant_cases       (id, org_id, created_by, applicant_name, product_type,
                       requested_amount, tenure_months, status, created_at)
consents              (id, case_id, consent_text, captured_by, captured_at)   -- DPDP (§B.1)
documents             (id, case_id, bank_name, file_path, sha256, page_count,
                       integrity_status, ocr_used, processing_status, uploaded_at, delete_after)
transactions          (id, document_id, case_id, date, raw_desc, normalized_desc,
                       credit, debit, balance, category, counterparty, counterparty_type,
                       payment_method, confidence, page_number, ai_enhanced)
counterparties        (id, case_id, canonical_name, aliases[], type, freq, total_cr, total_db)
metrics               (id, case_id, metric_id, value, unit, formula_version, source_refs[], confidence)
risk_results          (id, case_id, overall_score, component_scores jsonb, triggered_rules[],
                       recommendation, policy_profile_id, generated_at)
fraud_indicators      (id, case_id, type, severity, confidence, evidence_txn_ids[], review_status)
reports               (id, case_id, version, pdf_path, generated_at)
lender_policies       (id, org_id, product_type, rules jsonb)            -- §E, v1 Part 3 §21
ai_responses          (id, case_id, prompt_version, model, question, answer,
                       referenced_metric_ids[], referenced_txn_ids[], latency_ms, validated)
audit_log             (id, org_id, user_id, action, target, metadata jsonb, created_at)  -- immutable
```

Rules:
- **Never overwrite original extracted values** (v1 Part 6 §15 — keep): store raw + normalized side by side.
- Every `risk_results` row references the **`formula_version`/`policy_profile_id`** that produced it → historical reports reproduce exactly (v1 Part 6 §23).
- `audit_log` is append-only.

---

## H. Honest, staged success metrics (replaces v1's blanket targets)

| Metric | v1 (stated as launch fact) | v2 (staged) |
|---|---|---|
| Extraction accuracy | "95%+" | **Per-bank gate: ≥98% balance-reconciled on that bank's golden corpus** before the bank is marked "supported." No global number marketed until 3+ banks pass. |
| Classification accuracy | ">90%" | **≥85% on MVP categories**, measured on a labeled set; ambiguous → "Needs review," never silently wrong. |
| Processing time | "<60s" | **<60s for native-text PDFs; OCR statements explicitly slower and labeled** as such. |
| Risk score | implied authoritative | Always shown **with component breakdown + policy profile**; never a black box. |

---

## I. Pricing & GTM tweaks (small but high-leverage)

- v1's tiers (₹4,999 / ₹14,999 / ₹39,999) are plausible, but **lead the individual-financier wedge with per-report pricing** (e.g., ₹X/analysis or a small monthly bundle). The Tier-1 financier doing 20–100 files/month is far easier to convert on pay-per-use than a ₹4,999 subscription.
- Add a **free trial / a handful of free reports** — adoption in this segment is trust-driven; let them see one real file analyzed before paying.
- Keep v1's geographic ladder (Chennai → Coimbatore → Madurai → Trichy → Salem → Tiruppur). It's sensible.

---

## J. Realistic timeline (replaces v1 Part 8 §22's optimism)

v1: full MVP in "0–2 months", entire platform (GST/ITR/bureau/voice/portfolio) in 12. For a small team that's ~2–3× optimistic. Restated phases live in the companion plan (`docs/plans/2026-06-30-finscope-mvp-and-full-product.md`). Headline correction: **the MVP is the persistent-backend single-user underwriting tool for 3–4 banks with a trustworthy report — not the multi-agent enterprise platform.**

---

## K. MVP scope discipline — what to explicitly NOT build yet

Cut from MVP (defer to later phases), regardless of v1 listing them:
- Multi-agent AI orchestration (use one prompt — §F.1).
- Branch hierarchy, multi-role RBAC, syndicate workspace, white-label, billing engine (v1 Parts 4/8). Keep the *schema* multi-tenant (§G) but ship single-user UX.
- GST/ITR/bureau/property modules and cross-document validation (Phase 3+ — but keep the `Transaction[]`/document-processor contracts that make them droppable-in).
- Account Aggregator integration (Phase 3 — but design the source-swappable data layer now, §C).
- Voice underwriter, regional-language UI, portfolio analytics (Phase 4+).
- On-premise/air-gapped deployment (Phase 4+; keep secrets out of code so it's possible later).

**MVP must do a few things with underwriter-grade trust, not many things shallowly.**

---

## L. Change log vs. v1

1. Resolved the FastAPI-vs-Vercel and ephemeral-vs-persistent contradictions → **Vercel-native + Supabase persistent backend.**
2. Added a real **compliance workstream** (DPDP, AA-as-strategy, fair-lending, **document tamper detection**).
3. Reframed **parsing as the core risk** with golden-corpus gates and computed confidence.
4. Corrected the **financial math** (time-weighted ADB, proper FOIR, loan-ask capture, periodicity-based EMI detection).
5. **Right-sized the AI** (one evidence-constrained prompt; PII boundary made explicit).
6. Added the **persistence data model** the new architecture requires.
7. Made **targets, timeline, pricing** honest and staged.
8. Drew a hard **MVP scope line**.
```

