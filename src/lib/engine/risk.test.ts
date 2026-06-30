/// <reference types="vitest/globals" />
import { computeRiskProfile } from "@/lib/engine/risk";
import type { ClassifiedTransaction } from "@/lib/engine/classifier";

function ctx(p: {
  date: string;
  transactionType: "CREDIT" | "DEBIT";
  debit?: number;
  credit?: number;
  balance?: number;
  category?: string;
  counterparty?: string;
}): ClassifiedTransaction {
  return {
    date: p.date,
    description: "x",
    debit: p.debit ?? 0,
    credit: p.credit ?? 0,
    balance: p.balance ?? 0,
    transactionType: p.transactionType,
    category: p.category ?? "Miscellaneous",
    counterparty: p.counterparty ?? "Unknown",
    confidenceScore: 0.7,
  };
}

describe("computeRiskProfile integration", () => {
  it("uses the time-weighted ADB, not the mean of per-transaction balances", () => {
    // ₹100,000 held for 30 days then 0 on the last day → ADB ≈ 96,774.19,
    // whereas a naive mean of the two balances would be 50,000.
    const txns = [
      ctx({ date: "2025-01-01", transactionType: "CREDIT", credit: 100000, balance: 100000 }),
      ctx({ date: "2025-01-31", transactionType: "DEBIT", debit: 100000, balance: 0 }),
    ];
    const r = computeRiskProfile(txns, 0, 0, "a", "h", "Bank", "p");
    expect(r.overview.averageBalance).toBeCloseTo(96774.19, 1);
  });

  it("detects EMI liabilities behaviourally and computes pre-loan FOIR", () => {
    const txns = [
      ctx({ date: "2025-01-01", transactionType: "CREDIT", credit: 100000, balance: 200000, category: "Salary", counterparty: "Employer" }),
      ctx({ date: "2025-02-01", transactionType: "CREDIT", credit: 100000, balance: 200000, category: "Salary", counterparty: "Employer" }),
      ctx({ date: "2025-03-01", transactionType: "CREDIT", credit: 100000, balance: 200000, category: "Salary", counterparty: "Employer" }),
      ctx({ date: "2025-04-01", transactionType: "CREDIT", credit: 100000, balance: 200000, category: "Salary", counterparty: "Employer" }),
      ctx({ date: "2025-01-05", transactionType: "DEBIT", debit: 8500, balance: 191500, counterparty: "Bajaj Finance" }),
      ctx({ date: "2025-02-05", transactionType: "DEBIT", debit: 8500, balance: 191500, counterparty: "Bajaj Finance" }),
      ctx({ date: "2025-03-05", transactionType: "DEBIT", debit: 8500, balance: 191500, counterparty: "Bajaj Finance" }),
      ctx({ date: "2025-04-05", transactionType: "DEBIT", debit: 8500, balance: 191500, counterparty: "Bajaj Finance" }),
    ];
    const r = computeRiskProfile(txns, 100000, 191500, "a", "h", "Bank", "p");

    const bajaj = r.liability_analysis.find((l) => l.lender === "Bajaj Finance");
    expect(bajaj).toBeDefined();
    expect(bajaj!.emi_amount).toBe(8500);

    expect(r.foir.existing_obligations).toBe(8500);
    expect(r.foir.avg_monthly_income).toBe(100000);
    expect(r.foir.pre_loan_pct).toBeCloseTo(8.5, 1);
  });

  it("adds the requested loan's indicative EMI into post-loan FOIR", () => {
    const txns = [
      ctx({ date: "2025-01-01", transactionType: "CREDIT", credit: 100000, balance: 200000, category: "Salary", counterparty: "Employer" }),
      ctx({ date: "2025-02-01", transactionType: "CREDIT", credit: 100000, balance: 200000, category: "Salary", counterparty: "Employer" }),
      ctx({ date: "2025-03-01", transactionType: "CREDIT", credit: 100000, balance: 200000, category: "Salary", counterparty: "Employer" }),
      ctx({ date: "2025-04-01", transactionType: "CREDIT", credit: 100000, balance: 200000, category: "Salary", counterparty: "Employer" }),
      ctx({ date: "2025-01-05", transactionType: "DEBIT", debit: 8500, balance: 191500, counterparty: "Bajaj Finance" }),
      ctx({ date: "2025-02-05", transactionType: "DEBIT", debit: 8500, balance: 191500, counterparty: "Bajaj Finance" }),
      ctx({ date: "2025-03-05", transactionType: "DEBIT", debit: 8500, balance: 191500, counterparty: "Bajaj Finance" }),
      ctx({ date: "2025-04-05", transactionType: "DEBIT", debit: 8500, balance: 191500, counterparty: "Bajaj Finance" }),
    ];
    const r = computeRiskProfile(txns, 100000, 191500, "a", "h", "Bank", "p", {
      productType: "personal",
      requestedAmount: 100000,
      tenureMonths: 12,
      interestRateAnnualPct: 12,
    });
    expect(r.foir.indicative_new_emi).toBeCloseTo(8884.88, 1);
    // (8500 + 8884.88) / 100000 * 100 ≈ 17.38
    expect(r.foir.post_loan_pct).toBeCloseTo(17.38, 1);
  });
});
