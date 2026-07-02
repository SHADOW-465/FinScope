/**
 * Lender Policy Engine (PRD-v2 §E, v1 Part 3 §21).
 *
 * A policy is a set of configurable threshold rules per lending product. The
 * engine evaluates a metrics bundle against a policy and returns which rules
 * failed and an overall verdict. Rules are "hard" (blocking) or "soft"
 * (advisory → manual review). Kept decoupled from RiskProfile: callers build a
 * {@link PolicyInput} from whatever metrics source they have.
 */
import type { ProductType } from "@/types/domain";
import type { RiskProfile } from "@/lib/engine/risk";

export type RuleOperator = "<=" | ">=" | "<" | ">";
export type RuleSeverity = "hard" | "soft";

export interface PolicyRule {
  id: string;
  label: string;
  /** Key of {@link PolicyInput} this rule reads. */
  metric: keyof PolicyInput;
  operator: RuleOperator;
  threshold: number;
  severity: RuleSeverity;
}

export interface LenderPolicy {
  productType: ProductType;
  name: string;
  rules: PolicyRule[];
}

/** The metrics a policy can reference. Numeric; null means "not computable". */
export interface PolicyInput {
  postLoanFOIRPct: number | null;
  preLoanFOIRPct: number | null;
  averageBalance: number;
  bounceCount: number;
  negativeBalanceEvents: number;
  incomeStability: number;
  overallScore: number;
  emiBurden: number;
}

export interface RuleResult {
  id: string;
  label: string;
  metric: keyof PolicyInput;
  operator: RuleOperator;
  threshold: number;
  actual: number | null;
  passed: boolean;
  severity: RuleSeverity;
}

export interface PolicyEvaluation {
  productType: ProductType;
  policyName: string;
  /** True when no HARD rule failed. */
  passed: boolean;
  verdict: "pass" | "review" | "fail";
  /** Rules that failed, in policy order. */
  triggeredRules: RuleResult[];
  allRules: RuleResult[];
}

function checkRule(actual: number | null, op: RuleOperator, threshold: number): boolean {
  // A threshold cannot be satisfied without the underlying data — fail safe.
  if (actual === null) return false;
  switch (op) {
    case "<=": return actual <= threshold;
    case ">=": return actual >= threshold;
    case "<": return actual < threshold;
    case ">": return actual > threshold;
  }
}

export function evaluatePolicy(input: PolicyInput, policy: LenderPolicy): PolicyEvaluation {
  const allRules: RuleResult[] = policy.rules.map((rule) => {
    const actual = input[rule.metric];
    return {
      id: rule.id,
      label: rule.label,
      metric: rule.metric,
      operator: rule.operator,
      threshold: rule.threshold,
      actual,
      passed: checkRule(actual, rule.operator, rule.threshold),
      severity: rule.severity,
    };
  });

  const triggeredRules = allRules.filter((r) => !r.passed);
  const hardFail = triggeredRules.some((r) => r.severity === "hard");
  const softFail = triggeredRules.some((r) => r.severity === "soft");
  const verdict = hardFail ? "fail" : softFail ? "review" : "pass";

  return {
    productType: policy.productType,
    policyName: policy.name,
    passed: !hardFail,
    verdict,
    triggeredRules,
    allRules,
  };
}

// ---------------------------------------------------------------------------
// Default seed policies. Configurable per organisation later; these are the
// out-of-the-box starting points per product.
// ---------------------------------------------------------------------------

export const DEFAULT_POLICIES: Record<ProductType, LenderPolicy> = {
  personal: {
    productType: "personal",
    name: "Personal Loan (default)",
    rules: [
      { id: "max_foir", label: "Post-loan FOIR ≤ 45%", metric: "postLoanFOIRPct", operator: "<=", threshold: 45, severity: "hard" },
      { id: "max_bounces", label: "Cheque/NACH bounces ≤ 2", metric: "bounceCount", operator: "<=", threshold: 2, severity: "hard" },
      { id: "min_income_stability", label: "Income stability ≥ 60", metric: "incomeStability", operator: ">=", threshold: 60, severity: "soft" },
      { id: "min_score", label: "Underwriting score ≥ 60", metric: "overallScore", operator: ">=", threshold: 60, severity: "soft" },
    ],
  },
  vehicle: {
    productType: "vehicle",
    name: "Vehicle Finance (default)",
    rules: [
      { id: "max_foir", label: "Post-loan FOIR ≤ 50%", metric: "postLoanFOIRPct", operator: "<=", threshold: 50, severity: "hard" },
      { id: "max_bounces", label: "Cheque/NACH bounces ≤ 1", metric: "bounceCount", operator: "<=", threshold: 1, severity: "hard" },
      { id: "max_negative_events", label: "No negative-balance events", metric: "negativeBalanceEvents", operator: "<=", threshold: 0, severity: "hard" },
      { id: "min_avg_balance", label: "Average balance ≥ ₹15,000", metric: "averageBalance", operator: ">=", threshold: 15000, severity: "soft" },
    ],
  },
  gold: {
    productType: "gold",
    name: "Gold Loan (default)",
    rules: [
      // Gold loans are collateral-backed: banking behaviour carries less weight.
      { id: "max_foir", label: "Post-loan FOIR ≤ 60%", metric: "postLoanFOIRPct", operator: "<=", threshold: 60, severity: "soft" },
      { id: "max_bounces", label: "Cheque/NACH bounces ≤ 3", metric: "bounceCount", operator: "<=", threshold: 3, severity: "soft" },
    ],
  },
  msme: {
    productType: "msme",
    name: "MSME / Business Loan (default)",
    rules: [
      { id: "max_foir", label: "Post-loan FOIR ≤ 55%", metric: "postLoanFOIRPct", operator: "<=", threshold: 55, severity: "hard" },
      { id: "max_bounces", label: "Cheque/NACH bounces ≤ 2", metric: "bounceCount", operator: "<=", threshold: 2, severity: "hard" },
      { id: "min_avg_balance", label: "Average balance ≥ ₹25,000", metric: "averageBalance", operator: ">=", threshold: 25000, severity: "soft" },
    ],
  },
  lap: {
    productType: "lap",
    name: "Loan Against Property (default)",
    rules: [
      { id: "max_foir", label: "Post-loan FOIR ≤ 50%", metric: "postLoanFOIRPct", operator: "<=", threshold: 50, severity: "hard" },
      { id: "min_avg_balance", label: "Average balance ≥ ₹20,000", metric: "averageBalance", operator: ">=", threshold: 20000, severity: "soft" },
      { id: "min_score", label: "Underwriting score ≥ 65", metric: "overallScore", operator: ">=", threshold: 65, severity: "soft" },
    ],
  },
  working_capital: {
    productType: "working_capital",
    name: "Working Capital (default)",
    rules: [
      { id: "max_foir", label: "Post-loan FOIR ≤ 55%", metric: "postLoanFOIRPct", operator: "<=", threshold: 55, severity: "hard" },
      { id: "min_avg_balance", label: "Average balance ≥ ₹30,000", metric: "averageBalance", operator: ">=", threshold: 30000, severity: "soft" },
    ],
  },
};

export function getDefaultPolicy(productType: ProductType): LenderPolicy {
  return DEFAULT_POLICIES[productType];
}

/** Maps a computed RiskProfile into the shape the policy engine reads. */
export function policyInputFromRiskProfile(profile: RiskProfile): PolicyInput {
  const negativeBalanceEvents = profile.balance_risks.filter(
    (r) => r.risk_type === "Negative Balance"
  ).length;

  return {
    postLoanFOIRPct: profile.foir.post_loan_pct,
    preLoanFOIRPct: profile.foir.pre_loan_pct,
    averageBalance: profile.overview.averageBalance,
    bounceCount: profile.bounce_analysis.length,
    negativeBalanceEvents,
    incomeStability: profile.metrics.income_stability,
    overallScore: profile.risk_score.score,
    emiBurden: profile.metrics.emi_burden,
  };
}
