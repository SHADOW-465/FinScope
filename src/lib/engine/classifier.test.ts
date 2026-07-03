/// <reference types="vitest/globals" />
import { classifyTransactions } from "@/lib/engine/classifier";
import { RawTransaction } from "@/lib/parser/extractors";

// Helper to build a minimal RawTransaction
function makeTxn(overrides: Partial<RawTransaction> & { transactionType: "CREDIT" | "DEBIT" }): RawTransaction {
  return {
    date: "2025-11-01",
    description: "",
    debit: 0,
    credit: 0,
    balance: 50000,
    ...overrides,
  };
}

describe("classifyTransactions", () => {
  it("classifies a salary credit correctly", () => {
    const txn = makeTxn({
      transactionType: "CREDIT",
      description: "SALARY CREDIT NOV 2025",
      credit: 45000,
    });
    const [result] = classifyTransactions([txn]);
    expect(result.category).toBe("Salary");
    expect(result.confidenceScore).toBe(0.95);
  });

  it("classifies an EMI debit via NACH correctly", () => {
    const txn = makeTxn({
      transactionType: "DEBIT",
      description: "NACH DR BAJAJ FINANCE EMI",
      debit: 8500,
    });
    const [result] = classifyTransactions([txn]);
    expect(result.category).toBe("EMI Payment");
    expect(result.confidenceScore).toBe(0.9);
  });

  it("classifies an ATM withdrawal correctly", () => {
    const txn = makeTxn({
      transactionType: "DEBIT",
      description: "ATM WDL 12345",
      debit: 5000,
    });
    const [result] = classifyTransactions([txn]);
    expect(result.category).toBe("ATM Withdrawal");
    expect(result.confidenceScore).toBe(0.95);
  });

  it("classifies a UPI credit below the business threshold as UPI Transfer", () => {
    const txn = makeTxn({
      transactionType: "CREDIT",
      description: "UPI/JOHN DOE/johndoe@upi",
      credit: 500,
    });
    const [result] = classifyTransactions([txn]);
    expect(result.category).toBe("UPI Transfer");
    expect(result.confidenceScore).toBe(0.85);
  });

  it("classifies a large UPI credit from a company as Business Revenue", () => {
    const txn = makeTxn({
      transactionType: "CREDIT",
      description: "UPI/ACME PVT LTD/acmepvt@upi",
      credit: 75000,
    });
    const [result] = classifyTransactions([txn]);
    expect(result.category).toBe("Business Revenue");
    expect(result.confidenceScore).toBe(0.8);
  });

  it("classifies a Swiggy UPI debit as Utility", () => {
    const txn = makeTxn({
      transactionType: "DEBIT",
      description: "UPI/Swiggy/swiggystores@icici",
      debit: 350,
    });
    const [result] = classifyTransactions([txn]);
    expect(result.category).toBe("Utility");
    expect(result.confidenceScore).toBe(0.85);
  });

  it("classifies an SBI Life insurance debit correctly", () => {
    // "sbi life" keyword triggers insurance; description must not contain EMI sub-keywords
    const txn = makeTxn({
      transactionType: "DEBIT",
      description: "SBI LIFE POLICY DEBIT",
      debit: 3200,
    });
    const [result] = classifyTransactions([txn]);
    expect(result.category).toBe("Insurance");
    expect(result.confidenceScore).toBe(0.95);
  });

  it("extracts the counterparty name from a UPI description", () => {
    const txn = makeTxn({
      transactionType: "DEBIT",
      description: "UPI/SENTHILKUM/senthilkumarl1@sbi",
      debit: 200,
    });
    const [result] = classifyTransactions([txn]);
    // cleanCounterpartyName title-cases the name part after UPI/
    expect(result.counterparty).toBe("Senthilkum");
  });

  it("returns aiEnhanced as undefined for a freshly classified transaction", () => {
    const txn = makeTxn({
      transactionType: "CREDIT",
      description: "MISC CREDIT",
      credit: 100,
    });
    const [result] = classifyTransactions([txn]);
    expect(result.aiEnhanced).toBeUndefined();
  });

  it("handles an empty transaction array without throwing", () => {
    const result = classifyTransactions([]);
    expect(result).toEqual([]);
  });

  it("extracts the payee from RTGS/CMS narrations, not the date or ref codes", () => {
    const rtgs = makeTxn({
      transactionType: "CREDIT",
      description: "03/Nov/2 025 RTGS- CNRBR5202511036 9199906-SREE BALAJI ENTERPRISES- 120027384488 -CNRB0002",
      credit: 5000000,
    });
    const cms = makeTxn({
      transactionType: "CREDIT",
      description: "21/Nov/2 025 CMS/ CMS5411393794/G ODREJ FINANCE LIMITED",
      credit: 2500000,
    });
    const [r1, r2] = classifyTransactions([rtgs, cms]);
    expect(r1.counterparty).toBe("Sree Balaji Enterprises");
    expect(r2.counterparty).toBe("G Odrej Finance Limited");
  });

  it("classifies DD cancellations as Refund/Reversal, not income", () => {
    const txn = makeTxn({
      transactionType: "CREDIT",
      description: "15/Nov/2 025 DD Cancln 515960",
      credit: 3200000,
    });
    const [result] = classifyTransactions([txn]);
    expect(result.category).toBe("Refund/Reversal");
  });

  it("does not classify a 'PREMIUM' description as EMI (whole-word match regression)", () => {
    // "premium" contains the substring "emi"; the EMI branch must use a
    // whole-word match so insurance premiums fall through to Insurance.
    const txn = makeTxn({
      transactionType: "DEBIT",
      description: "HDFC ERGO HEALTH INSURANCE PREMIUM",
      debit: 4500,
    });
    const [result] = classifyTransactions([txn]);
    expect(result.category).toBe("Insurance");
  });
});
