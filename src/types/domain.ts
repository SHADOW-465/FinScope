/**
 * Shared domain contracts used across the underwriting engines, the policy
 * engine, and the persistence/UI layer.
 *
 * Kept deliberately small (YAGNI): only the cross-cutting types that more than
 * one module needs live here. Module-local shapes stay in their own files
 * (e.g. `RawTransaction` in parser/extractors.ts, `RiskProfile` in engine/risk.ts).
 */

/** Lending products FinScope underwrites. Drives policy selection (PRD-v2 §E). */
export type ProductType =
  | "personal"
  | "vehicle"
  | "gold"
  | "msme"
  | "lap"
  | "working_capital";

/** Human labels for {@link ProductType}, for dropdowns and report copy. */
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  personal: "Personal Loan",
  vehicle: "Vehicle Finance",
  gold: "Gold Loan",
  msme: "MSME / Business Loan",
  lap: "Loan Against Property",
  working_capital: "Working Capital",
};

/**
 * What is actually being underwritten. Without this the FOIR / eligibility math
 * is meaningless (PRD-v2 §E.4). Captured at case creation.
 */
export interface LoanAsk {
  productType: ProductType;
  /** Requested principal in INR. */
  requestedAmount: number;
  /** Requested tenure in months. */
  tenureMonths: number;
  /**
   * Annual interest rate (percent) used to derive the indicative EMI.
   * Optional: when absent, callers fall back to a configurable default rate.
   */
  interestRateAnnualPct?: number;
}

/** Lifecycle of an applicant case. */
export type CaseStatus =
  | "draft"
  | "processing"
  | "ready"
  | "approved"
  | "declined"
  | "manual_review";
