/**
 * FOIR (Fixed Obligation to Income Ratio) engine.
 *
 * Pure functions — no I/O, no side-effects. Meant to be composed into the
 * wider underwriting pipeline (risk.ts) in a later task.
 */
import type { LoanAsk } from "@/types/domain";

// ---------------------------------------------------------------------------
// indicativeEMI
// ---------------------------------------------------------------------------

/**
 * Standard reducing-balance EMI formula.
 *   r = annualRatePct / 12 / 100   (monthly rate)
 *   EMI = P * r * (1+r)^n / ((1+r)^n - 1)
 *
 * Special cases:
 *   - When r == 0  → EMI = P / n (simple equal instalments).
 *   - Returns 0 when principal <= 0 or tenureMonths <= 0.
 *
 * @returns INR value rounded to 2 decimal places.
 */
export function indicativeEMI(
  principal: number,
  annualRatePct: number,
  tenureMonths: number
): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;

  const r = annualRatePct / 12 / 100;

  if (r === 0) {
    return Math.round((principal / tenureMonths) * 100) / 100;
  }

  const onePlusR = 1 + r;
  const power = Math.pow(onePlusR, tenureMonths);
  const emi = (principal * r * power) / (power - 1);

  return Math.round(emi * 100) / 100;
}

// ---------------------------------------------------------------------------
// computeFOIR
// ---------------------------------------------------------------------------

export interface FOIRBreakdown {
  /** Monthly fixed obligations passed in (existing loans, rent, etc.). */
  existingObligations: number;
  /** Indicative EMI for the new loan; 0 when no loanAsk was provided. */
  indicativeNewEMI: number;
  /** existingObligations + indicativeNewEMI, rounded to 2 dp. */
  totalObligations: number;
  /** Average monthly income as passed in. */
  avgMonthlyIncome: number;
  /**
   * (existingObligations / avgMonthlyIncome) * 100, rounded to 2 dp.
   * null when avgMonthlyIncome <= 0 (ratio undefined without income).
   */
  preLoanFOIRPct: number | null;
  /**
   * (totalObligations / avgMonthlyIncome) * 100, rounded to 2 dp.
   * null when avgMonthlyIncome <= 0.
   */
  postLoanFOIRPct: number | null;
}

export interface FOIRParams {
  /** Sum of all known monthly fixed obligations (EMIs, rent, etc.) in INR. */
  existingMonthlyObligations: number;
  /** Average monthly net income derived from the bank statement. */
  avgMonthlyIncome: number;
  /** Details of the new loan being underwritten. Optional. */
  loanAsk?: LoanAsk;
  /**
   * Fallback annual interest rate (%) used to compute the indicative EMI
   * when `loanAsk.interestRateAnnualPct` is absent.
   * @default 14
   */
  defaultRateAnnualPct?: number;
}

export function computeFOIR(params: FOIRParams): FOIRBreakdown {
  const {
    existingMonthlyObligations,
    avgMonthlyIncome,
    loanAsk,
    defaultRateAnnualPct = 14,
  } = params;

  // Compute indicative EMI for the new loan if one is provided.
  const newEMI = loanAsk
    ? indicativeEMI(
        loanAsk.requestedAmount,
        loanAsk.interestRateAnnualPct ?? defaultRateAnnualPct,
        loanAsk.tenureMonths
      )
    : 0;

  const totalObligations =
    Math.round((existingMonthlyObligations + newEMI) * 100) / 100;

  // FOIR percentages are null (not Infinity/NaN) when income is zero.
  const foirPct = (obligations: number): number | null => {
    if (avgMonthlyIncome <= 0) return null;
    return Math.round((obligations / avgMonthlyIncome) * 100 * 100) / 100;
  };

  return {
    existingObligations: existingMonthlyObligations,
    indicativeNewEMI: newEMI,
    totalObligations,
    avgMonthlyIncome,
    preLoanFOIRPct: foirPct(existingMonthlyObligations),
    postLoanFOIRPct: foirPct(totalObligations),
  };
}
