/// <reference types="vitest/globals" />
import {
  evaluatePolicy,
  getDefaultPolicy,
  policyInputFromRiskProfile,
  type PolicyInput,
} from "@/lib/policy/policies";
import { computeRiskProfile } from "@/lib/engine/risk";
import type { ClassifiedTransaction } from "@/lib/engine/classifier";
import type { ProductType } from "@/types/domain";

const goodInput: PolicyInput = {
  postLoanFOIRPct: 30,
  preLoanFOIRPct: 20,
  averageBalance: 50000,
  bounceCount: 0,
  negativeBalanceEvents: 0,
  incomeStability: 90,
  overallScore: 85,
  emiBurden: 20,
};

describe("evaluatePolicy", () => {
  it("passes a clean applicant under the vehicle policy", () => {
    const r = evaluatePolicy(goodInput, getDefaultPolicy("vehicle"));
    expect(r.verdict).toBe("pass");
    expect(r.passed).toBe(true);
    expect(r.triggeredRules).toEqual([]);
  });

  it("fails on a hard FOIR breach", () => {
    const r = evaluatePolicy(
      { ...goodInput, postLoanFOIRPct: 58 },
      getDefaultPolicy("vehicle")
    );
    expect(r.verdict).toBe("fail");
    expect(r.passed).toBe(false);
    expect(r.triggeredRules.map((x) => x.id)).toContain("max_foir");
  });

  it("returns review when only a soft rule fails", () => {
    const r = evaluatePolicy(
      { ...goodInput, averageBalance: 5000 }, // below the soft min_avg_balance
      getDefaultPolicy("vehicle")
    );
    expect(r.verdict).toBe("review");
    expect(r.passed).toBe(true); // no hard failure
    expect(r.triggeredRules.map((x) => x.id)).toContain("min_avg_balance");
  });

  it("treats a non-computable (null) FOIR as a hard failure", () => {
    const r = evaluatePolicy(
      { ...goodInput, postLoanFOIRPct: null },
      getDefaultPolicy("vehicle")
    );
    expect(r.verdict).toBe("fail");
    expect(r.triggeredRules.map((x) => x.id)).toContain("max_foir");
  });

  it("provides a default policy for every product type", () => {
    const types: ProductType[] = [
      "personal",
      "vehicle",
      "gold",
      "msme",
      "lap",
      "working_capital",
    ];
    for (const t of types) {
      const p = getDefaultPolicy(t);
      expect(p.productType).toBe(t);
      expect(p.rules.length).toBeGreaterThan(0);
    }
    // Gold is collateral-backed: its FOIR rule is advisory, not blocking.
    const goldFoir = getDefaultPolicy("gold").rules.find((r) => r.id === "max_foir");
    expect(goldFoir?.severity).toBe("soft");
  });
});

describe("policyInputFromRiskProfile", () => {
  it("maps a computed RiskProfile into a PolicyInput the engine can evaluate", () => {
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

    const txns = [
      ctx({ date: "2025-01-01", transactionType: "CREDIT", credit: 100000, balance: 100000 }),
      ctx({ date: "2025-02-01", transactionType: "CREDIT", credit: 100000, balance: 200000 }),
    ];
    const profile = computeRiskProfile(txns, 0, 200000, "a", "h", "Bank", "p");
    const input = policyInputFromRiskProfile(profile);

    expect(input.averageBalance).toBe(profile.overview.averageBalance);
    expect(input.postLoanFOIRPct).toBe(profile.foir.post_loan_pct);
    expect(input.bounceCount).toBe(0);
    expect(input.negativeBalanceEvents).toBe(0);

    const evaluation = evaluatePolicy(input, getDefaultPolicy("personal"));
    expect(evaluation.verdict).toBe("pass");
  });
});
