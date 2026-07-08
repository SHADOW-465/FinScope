/// <reference types="vitest/globals" />
import { buildAIContext, redactNarration } from "@/lib/ai/context-builder";
import { validateAIResponse } from "@/lib/ai/validate";
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

describe("redactNarration", () => {
  it("masks UPI handles and long digit runs", () => {
    expect(redactNarration("UPI/RAHUL/rahul@okhdfc 9876543210")).toBe("UPI/RAHUL/[id] #####");
  });
});

describe("buildAIContext", () => {
  it("exposes metric and evidence ids and gates the validator", () => {
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
    const profile = computeRiskProfile(txns, 100000, 191500, "a", "h", "Bank", "p");
    const c = buildAIContext(profile);

    expect(c.allowedIds).toContain("metric.score");
    expect(c.allowedIds).toContain("metric.foir_post");
    expect(c.allowedIds).toContain("liability.0");

    const good = {
      strengths: ["Stable salary income"],
      concerns: ["One active EMI"],
      recommendation: "manual_review",
      evidence: ["metric.foir_post", "liability.0"],
    };
    expect(validateAIResponse(good, c.allowedIds).valid).toBe(true);

    const fabricated = { ...good, evidence: ["metric.score", "income.999"] };
    expect(validateAIResponse(fabricated, c.allowedIds).valid).toBe(false);
  });
});
