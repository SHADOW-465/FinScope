/// <reference types="vitest/globals" />
import { indicativeEMI, computeFOIR } from "@/lib/engine/foir";

// ---------------------------------------------------------------------------
// indicativeEMI
// ---------------------------------------------------------------------------
describe("indicativeEMI", () => {
  // 1. Standard reducing-balance formula
  it("computes standard reducing-balance EMI for P=100000 rate=12 n=12", () => {
    // monthly r = 0.01, (1.01)^12 ≈ 1.126825, EMI ≈ 8884.88
    expect(indicativeEMI(100000, 12, 12)).toBeCloseTo(8884.88, 2);
  });

  // 2. Zero-interest edge case
  it("returns P/n when interest rate is 0", () => {
    expect(indicativeEMI(120000, 0, 12)).toBe(10000);
  });

  // 3. Guard conditions
  it("returns 0 when principal is 0", () => {
    expect(indicativeEMI(0, 12, 12)).toBe(0);
  });

  it("returns 0 when tenureMonths is 0", () => {
    expect(indicativeEMI(100000, 12, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeFOIR
// ---------------------------------------------------------------------------
describe("computeFOIR", () => {
  // 4. No loan ask: indicativeNewEMI = 0, pre == post
  it("returns zero indicativeNewEMI and equal pre/post FOIR when no loanAsk given", () => {
    const result = computeFOIR({
      existingMonthlyObligations: 20000,
      avgMonthlyIncome: 100000,
    });
    expect(result.indicativeNewEMI).toBe(0);
    expect(result.totalObligations).toBe(20000);
    expect(result.preLoanFOIRPct).toBe(20);
    expect(result.postLoanFOIRPct).toBe(20);
  });

  // 5. With loan ask — post-loan FOIR incorporates new EMI
  it("computes post-loan FOIR incorporating indicative EMI when loanAsk provided", () => {
    const result = computeFOIR({
      existingMonthlyObligations: 20000,
      avgMonthlyIncome: 100000,
      loanAsk: {
        productType: "personal",
        requestedAmount: 100000,
        tenureMonths: 12,
        interestRateAnnualPct: 12,
      },
    });
    expect(result.indicativeNewEMI).toBeCloseTo(8884.88, 2);
    expect(result.preLoanFOIRPct).toBe(20);
    // (20000 + ~8884.88) / 100000 * 100 ≈ 28.88
    expect(result.postLoanFOIRPct).toBeCloseTo(28.88, 1);
  });

  // 6. Zero income → null FOIR percentages
  it("returns null for both FOIR percentages when avgMonthlyIncome is 0", () => {
    const result = computeFOIR({
      existingMonthlyObligations: 5000,
      avgMonthlyIncome: 0,
    });
    expect(result.preLoanFOIRPct).toBeNull();
    expect(result.postLoanFOIRPct).toBeNull();
    expect(result.totalObligations).toBe(5000);
  });

  // 7. Default rate of 14% is applied when loanAsk omits interestRateAnnualPct
  it("uses default 14% rate when loanAsk has no interestRateAnnualPct", () => {
    const result = computeFOIR({
      existingMonthlyObligations: 0,
      avgMonthlyIncome: 50000,
      loanAsk: {
        productType: "vehicle",
        requestedAmount: 200000,
        tenureMonths: 24,
        // no interestRateAnnualPct
      },
    });
    const expected = indicativeEMI(200000, 14, 24);
    expect(result.indicativeNewEMI).toBe(expected);
  });
});
