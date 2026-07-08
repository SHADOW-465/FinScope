# FinScope — MVP & Full-Product Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Companion specs:** `PRD.md` (vision) + `PRD-v2-Revisions.md` (corrections — wins on conflict).

**Goal:** Ship a sellable, single-user-first credit-underwriting tool — upload bank-statement PDFs → trustworthy, evidence-backed underwriting report — built on a persistent backend so the team/enterprise build needs no rework.

**Architecture:** Next.js 16 App Router on Vercel (Fluid Compute) + Supabase (Postgres + Auth + Storage, RLS multi-tenant from day one). Deterministic TypeScript engines compute every number; one evidence-constrained LLM call (via Vercel AI Gateway) writes the narrative. On-device ONNX classifier stays as a non-blocking enhancement.

**Tech Stack:** Next.js 16, TypeScript, Tailwind v4, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), `pdf-parse`/`pdfjs`, `jspdf` + `xlsx`, Vercel AI SDK + AI Gateway, `@huggingface/transformers` (existing).

---

## How this plan is structured

This is a **phased roadmap plan**. The near-term phases (0–2) are detailed to task altitude because they're being built now. Later phases (3–6) are scoped at milestone altitude — **per the YAGNI principle, each later phase gets expanded into its own bite-sized TDD plan when it's picked up**, not speculatively now. Ask me to expand any phase and I'll generate the task-by-task version.

**Definition of "done" for every phase:** code + tests pass, the phase's acceptance criteria are met and verified by running the app (not just unit tests), and changes are committed.

---

## File / module map (target state for MVP)

```
src/
  app/
    (auth)/login, /signup                      # Supabase Auth UI
    (app)/
      cases/                                    # case list + create (captures loan ask)
      cases/[id]/                               # case workspace (dashboard tabs)
    api/
      process/route.ts        (exists)          # parse → classify → metrics → risk; now persists
      report/route.ts         (new)             # server-side report assembly
      ai/summary/route.ts      (new)            # one evidence-constrained Credit Officer prompt
      chat/route.ts           (exists)          # retrieval-scoped chat
      export/route.ts         (exists)          # Excel export
  lib/
    db/                        (new)            # supabase clients (server/browser), typed queries
    parser/  detector.ts, extractors.ts (exist) + integrity.ts (new: §B.4 tamper checks)
    engine/  classifier.ts, risk.ts (exist, corrected) + foir.ts (new), adb.ts (new),
             emi-detect.ts (new), local-classifier.* (exist)
    policy/   policies.ts      (new)            # lender policy evaluation (§E)
    ai/       context-builder.ts, validate.ts (new)  # retrieval + guardrail validation
  types/      domain.ts        (new)            # Case, Transaction, RiskResult, Policy contracts
supabase/
  migrations/                                   # SQL schema (§G of PRD-v2)
docs/plans/                                     # this file
tests/                                          # golden corpus + unit/integration
```

---

# PHASE 0 — Persistent foundation (the spine)

**Outcome:** A logged-in user can create a case, and the schema/RLS exists for everything downstream. No parsing changes yet.

### Task 0.1: Provision Supabase + wire clients

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Create: `src/lib/db/server.ts`, `src/lib/db/browser.ts`
- Modify: `.env.local` (keys via `vercel env` / Supabase dashboard — never commit)

- [ ] **Step 1:** Create the Supabase project (Vercel Marketplace → Supabase) and pull keys with `vercel env pull` (or set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- [ ] **Step 2:** Write `0001_init.sql` implementing the data model in `PRD-v2-Revisions.md` §G (organizations, users, applicant_cases, consents, documents, transactions, counterparties, metrics, risk_results, fraud_indicators, reports, lender_policies, ai_responses, audit_log). Enable RLS on every table; policy: rows visible only where `org_id = (select org_id from users where id = auth.uid())`.
- [ ] **Step 3:** Apply the migration (Supabase MCP `apply_migration` or `supabase db push`). Verify with `list_tables`.
- [ ] **Step 4:** Implement `server.ts` (service-role client for Route Handlers) and `browser.ts` (anon client via `@supabase/ssr`).
- [ ] **Step 5:** Commit. `git commit -m "feat(db): persistent schema + RLS + supabase clients"`

**Acceptance:** `list_tables` shows all tables with RLS enabled; a manual insert as one org is invisible to another.

### Task 0.2: Auth + first-run org bootstrap

**Files:** Create `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`, `src/lib/db/bootstrap.ts`; Modify `src/app/layout.tsx` (session provider), add `middleware.ts` (protect `(app)` routes).

- [ ] **Step 1 (test):** Write an integration test: unauthenticated GET of `/cases` redirects to `/login`.
- [ ] **Step 2:** Run it — expect FAIL.
- [ ] **Step 3:** Implement Supabase Auth email/password screens + `middleware.ts` route protection. On first login, `bootstrap.ts` creates an `organizations` row and a `users` row (role `owner`) for that user.
- [ ] **Step 4:** Run the test — expect PASS; manually sign up, confirm an org+user row exists.
- [ ] **Step 5:** Commit.

**Acceptance:** Sign up → land on empty case list; a second account sees its own (empty) list, never the first's data.

### Task 0.3: Case creation captures the loan ask (closes PRD-v2 §E.4 gap)

**Files:** Create `src/app/(app)/cases/page.tsx` (list), `src/app/(app)/cases/new/page.tsx` (form), `src/types/domain.ts`.

- [ ] **Step 1 (test):** Test that creating a case persists `applicant_name`, `product_type`, `requested_amount`, `tenure_months` and returns a case id.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement the create form (product_type enum: personal/vehicle/gold/msme/lap/working_capital) + server action inserting into `applicant_cases`, plus a `consents` row capturing borrower-consent text (DPDP, §B.1).
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Commit.

**Acceptance:** A case exists in DB with the loan ask + a consent record, before any document is uploaded.

---

# PHASE 1 — Trustworthy core analysis (the product)

**Outcome:** Upload PDFs to a case → reconciled transactions, corrected metrics, policy-aware risk score, evidence-linked AI narrative, downloadable report. This is the sellable MVP.

### Task 1.1: Persist the existing pipeline + statement integrity (PRD-v2 §B.4, §D)

**Files:** Modify `src/app/api/process/route.ts`; Create `src/lib/parser/integrity.ts`; Test `tests/parser/integrity.test.ts`.

- [ ] **Step 1 (test):** Given rows where `balance[n] != balance[n-1] ± amount`, `checkBalanceContinuity()` returns a flagged break with the offending row index.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement `integrity.ts`: balance-continuity reconciliation, cross-page opening/closing match, PDF metadata anomaly hints. Wire `process/route.ts` to (a) attach a case id, (b) persist `documents`+`transactions`, (c) store `integrity_status`, (d) compute real per-row `confidence` (reconciled? canonical layout? OCR used?) instead of hardcoded values.
- [ ] **Step 4:** Run — PASS; upload a known-good statement → `integrity_status = ok`.
- [ ] **Step 5:** Commit.

**Acceptance:** Transactions persist per case; a tampered/mis-parsed statement shows a visible **Statement Integrity** warning distinct from the risk score.

### Task 1.2: Correct the financial math (PRD-v2 §E)

**Files:** Create `src/lib/engine/adb.ts`, `src/lib/engine/foir.ts`, `src/lib/engine/emi-detect.ts`; Modify `src/lib/engine/risk.ts`; Test `tests/engine/*.test.ts`.

- [ ] **Step 1 (test — ADB):** A statement with one ₹1,00,000 balance held 20 days and ₹0 held 10 days yields ADB ≈ ₹66,667 (time-weighted), **not** the per-transaction mean.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement `adb.ts` (carry daily closing balance across gaps, average over calendar days). Replace `averageBalance` usage in `risk.ts`.
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5 (test — FOIR):** `computeFOIR(existingEMIs, indicativeNewEMI, avgMonthlyIncome)` returns the v1 ratio; post-loan FOIR includes the new EMI derived from the case's loan ask.
- [ ] **Step 6:** Implement `foir.ts` + indicative-EMI helper (rate/tenure configurable). Remove the non-standard `debt_ratio = EMI/avgBalance` from the score.
- [ ] **Step 7 (test — EMI):** `detectEMIs()` flags recurring ~equal NACH/SI debits to a repeated payee as a loan obligation by periodicity, not by `category == "EMI Payment"`.
- [ ] **Step 8:** Implement `emi-detect.ts`; feed results into liabilities + FOIR.
- [ ] **Step 9:** Run all — PASS. Commit.

**Acceptance:** Risk breakdown shows time-weighted ADB and a real pre/post-loan FOIR tied to the requested amount.

### Task 1.3: Lender Policy Engine (PRD-v2 §E, v1 Part 3 §21)

**Files:** Create `src/lib/policy/policies.ts`, default policy seeds; Test `tests/policy/policies.test.ts`.

- [ ] **Step 1 (test):** A vehicle-finance policy (`max_foir: 50, max_bounces: 1, min_avg_balance: 15000`) marks a case with FOIR 58% as failing the FOIR rule with that rule id in the result.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement `evaluatePolicy(metrics, policy)` returning triggered rules + pass/fail per rule. Seed default policies per product type into `lender_policies`.
- [ ] **Step 4:** Run — PASS; risk_result stores the `policy_profile_id` used (reproducibility).
- [ ] **Step 5:** Commit.

**Acceptance:** Same applicant scored under two product policies yields two different, explained verdicts.

### Task 1.4: One evidence-constrained Credit Officer prompt (PRD-v2 §F)

**Files:** Create `src/app/api/ai/summary/route.ts`, `src/lib/ai/context-builder.ts`, `src/lib/ai/validate.ts`; Test `tests/ai/validate.test.ts`.

- [ ] **Step 1 (test):** `validateAIResponse()` rejects any narrative claim whose `evidence[]` references a metric/transaction id not present in the supplied context.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement `context-builder.ts` (assemble only metrics + policy result + top evidence transactions, redacting PII per §F.3), the `summary` route calling Vercel AI Gateway with a fixed JSON schema (`strengths/concerns/recommendation/evidence`), and `validate.ts` rejecting unsupported/ schema-breaking output (regenerate once, else fall back to deterministic summary).
- [ ] **Step 4:** Run — PASS.
- [ ] **Step 5:** Persist to `ai_responses` (prompt_version, model, referenced ids). Commit.

**Acceptance:** Every sentence in the narrative links to real evidence; an injected fake-id claim is blocked.

### Task 1.5: Case workspace UI + report

**Files:** Create `src/app/(app)/cases/[id]/page.tsx` (tabs: Summary / Income / Liabilities / Banking / Transactions / Integrity), `src/app/api/report/route.ts`; reuse existing components (`OverviewCards`, `Charts`, `Panels`, `RiskCard`, `TransactionTable`, `ChatAssistant`).

- [ ] **Step 1:** Wire the case workspace to read persisted data; show risk score **with component breakdown + policy verdict + loan-ask eligibility**.
- [ ] **Step 2:** Add the "augment, not replace — human approves" disclaimer on the recommendation screen + report footer (§B.3).
- [ ] **Step 3:** Server-assemble the PDF report (exec summary, income, cash flow, liabilities, risk, integrity, AI opinion, evidence appendix); keep Excel export.
- [ ] **Step 4 (verify):** Run the app, process a real sample statement end-to-end, download the report, confirm numbers match the dashboard.
- [ ] **Step 5:** Commit.

**Acceptance:** A loan officer can go upload → decision-ready report in minutes, with every number traceable.

### Task 1.6: Golden-corpus accuracy gates (PRD-v2 §D, §H)

**Files:** Create `tests/golden/<bank>/*.json` (anonymized expected outputs), `tests/golden/run.test.ts`.

- [ ] **Step 1:** Collect/anonymize ≥3 real statements per supported bank (start: ICICI, Canara, IndusInd, BoB — the banks already parsed).
- [ ] **Step 2 (test):** For each golden file, parsed transactions reconcile to the paisa and ADB/FOIR match expected.
- [ ] **Step 3:** Mark a bank "supported" in the UI only once its golden tests pass (≥98% reconciled).
- [ ] **Step 4:** Commit. Wire into CI so parser regressions fail the build.

**Acceptance:** No bank is advertised as supported without a passing golden gate.

---

# PHASE 2 — Make it sellable & sticky (≈ weeks after MVP)

Milestone-level (expand to TDD plan when picked up):
- **Retention/secure-delete UX** (configurable per org; verifiable deletion record) — completes the honest privacy posture (§A.3).
- **Saved cases, search, case history/versioning** (schema already supports it).
- **Pattern fraud signals** (round-tripping, window-dressing, circular transfers) as flagged indicators with confidence + evidence (v1 Module 14) — *advisory only*.
- **Per-report billing wedge** + free-trial reports (§I): integrate an Indian payment gateway; meter analyses.
- **More banks** via the golden-gate process (SBI, HDFC, Axis, IOB, Kotak, Union, Federal, IDFC FIRST).
- **PII-redaction hardening** + enterprise zero-retention LLM route (§F.3).

**Acceptance:** A Chennai financier can pay per report, save/search past cases, and trust the fraud/integrity flags.

---

# PHASE 3 — Multi-document intelligence & legitimate data (the moat)

Milestone-level:
- **Document-processor contract** generalized → GST returns, ITR, salary slips, Form 16 (v1 Part 5 §19).
- **Cross-document validation engine** (GST turnover vs. bank credits; ITR income vs. observed; salary slip vs. salary credits; declared vs. detected EMIs) — v1's strongest differentiator.
- **RBI Account Aggregator integration** via a TSP/AA partner → bank-sourced, consented, tamper-proof data behind the same `Transaction[]` contract (§B.2, §C). Eliminates the upload tamper-risk for AA-sourced cases.

**Acceptance:** One case ingests multiple document types and surfaces consistency mismatches with severity + evidence; AA feed works as an alternate source.

---

# PHASE 4 — Teams & enterprise (no rework, schema already multi-tenant)

Milestone-level:
- Multi-user RBAC (roles already in schema), branch hierarchy, case assignment, internal notes, approval workflow, immutable audit trail (v1 Parts 4 & 8).
- White-label branding + report templating.
- Billing/subscription engine + admin/ops dashboards.
- SSO (Entra ID / Google Workspace).

**Acceptance:** A syndicate with multiple analysts and branches operates with isolation, assignment, and audit.

---

# PHASE 5 — Intelligence depth

Milestone-level: multi-agent AI orchestration (split the single prompt only now), domain knowledge packs per product, credit-simulation ("what-if") UI on top of the deterministic engine, bureau-integration framework, portfolio analytics.

# PHASE 6 — Reach & deployment options

Milestone-level: regional-language report summaries (Tamil first), on-prem/private-cloud packaging (secrets already externalized), API + webhooks for LOS/LMS/CRM.

---

## Risks & mitigations (carry into execution)

| Risk | Mitigation |
|---|---|
| Parsing accuracy across bank formats (the real hard part) | Golden-corpus gates (Task 1.6); per-bank "supported" flag; computed confidence. |
| Privacy story breaks on cloud LLM calls | PII redaction + zero-retention gateway route; on-device option (§F.3). |
| Compliance exposure (DPDP / fair lending) | Consent capture, processor DPA, "human approves" framing, no discriminatory proxies (§B). |
| Document forgery | Statement-integrity checks now; AA path as the durable fix (§B.2/§B.4). |
| Scope creep back toward v1's everything-at-once | Hard MVP line in `PRD-v2-Revisions.md` §K; later phases stay milestone-level until picked up. |
| Sourcing anonymized test statements | Start collecting in Phase 1; treat as a blocking prerequisite, not a chore. |

---

## Self-review notes

- **Spec coverage:** Every PRD-v2 correction maps to a task — architecture (Phase 0), compliance/DPDP/consent (0.3, §B), tamper detection (1.1), corrected math (1.2), policy engine (1.3), right-sized AI + PII (1.4), persistence model (0.1), accuracy gates (1.6), AA/cross-doc moat (Phase 3), enterprise (Phase 4). Cuts in §K are deferred, not dropped.
- **Granularity:** Phases 0–1 are task-level (now); Phases 2–6 are milestone-level by design (YAGNI) and each expands to its own TDD plan on pickup.
- **No throwaway:** RLS multi-tenant schema from day one means the single-user MVP becomes a team product without a rewrite — directly serving the "persistent backend now + ship single-user fast" decision.
