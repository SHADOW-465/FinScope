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
});
