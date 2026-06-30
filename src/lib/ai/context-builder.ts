/**
 * AI context builder (PRD-v2 §F.3).
 *
 * Assembles the *only* data the Credit Officer prompt is allowed to use:
 * a curated set of deterministic metrics and evidence items, each with a stable
 * id, plus the union of allowed ids the validator checks against. Narration text
 * is PII-redacted before it can leave the device to a cloud model.
 *
 * Note: this redaction masks account/reference numbers, UPI handles and emails.
 * Personal names embedded in narrations are not fully removable heuristically;
 * an on-device model (or enterprise zero-retention route) remains the stronger
 * guarantee for name-level PII.
 */
import type { RiskProfile } from "@/lib/engine/risk";
import type { PolicyEvaluation } from "@/lib/policy/policies";

export interface EvidenceMetric {
  id: string;
  label: string;
  value: number | string | null;
}

export interface EvidenceItem {
  id: string;
  kind: "income" | "liability" | "bounce";
  label: string;
  amount: number;
}

export interface AIContext {
  metrics: EvidenceMetric[];
  evidence: EvidenceItem[];
  /** Every id the AI is permitted to cite. */
  allowedIds: string[];
}

const UPI_HANDLE = /\b[\w.\-]+@[\w.\-]+\b/g;
const LONG_DIGITS = /\d{5,}/g;

export function redactNarration(text: string): string {
  return (text ?? "")
    .replace(UPI_HANDLE, "[id]")
    .replace(LONG_DIGITS, "#####");
}

export function buildAIContext(
  profile: RiskProfile,
  policy?: PolicyEvaluation
): AIContext {
  const metrics: EvidenceMetric[] = [
    { id: "metric.average_balance", label: "Average daily balance", value: profile.overview.averageBalance },
    { id: "metric.total_credits", label: "Total credits", value: profile.overview.totalCredits },
    { id: "metric.total_debits", label: "Total debits", value: profile.overview.totalDebits },
    { id: "metric.net_cash_flow", label: "Net cash flow", value: profile.metrics.net_cash_flow },
    { id: "metric.income_stability", label: "Income stability", value: profile.metrics.income_stability },
    { id: "metric.emi_burden", label: "EMI burden %", value: profile.metrics.emi_burden },
    { id: "metric.foir_pre", label: "Pre-loan FOIR %", value: profile.foir.pre_loan_pct },
    { id: "metric.foir_post", label: "Post-loan FOIR %", value: profile.foir.post_loan_pct },
    { id: "metric.score", label: "Underwriting score", value: profile.risk_score.score },
  ];

  const evidence: EvidenceItem[] = [];
  profile.income_analysis.forEach((s, i) => {
    evidence.push({ id: `income.${i}`, kind: "income", label: redactNarration(s.source), amount: s.amount });
  });
  profile.liability_analysis.forEach((l, i) => {
    evidence.push({ id: `liability.${i}`, kind: "liability", label: redactNarration(l.lender), amount: l.emi_amount });
  });
  profile.bounce_analysis.forEach((b, i) => {
    evidence.push({ id: `bounce.${i}`, kind: "bounce", label: redactNarration(b.description), amount: b.amount });
  });

  const ruleIds = policy ? policy.allRules.map((r) => `rule.${r.id}`) : [];

  const allowedIds = [
    ...metrics.map((m) => m.id),
    ...evidence.map((e) => e.id),
    ...ruleIds,
  ];

  return { metrics, evidence, allowedIds };
}
