import { describe, it, expect } from "vitest";
import { validateLedger } from "./validator";
import { Transaction } from "./types";

describe("Accounting Validation Engine", () => {
  const dummyTxn = (
    wdl: number,
    dep: number,
    bal: number
  ): Transaction => ({
    date: { value: "2023-07-12", confidence: 1.0 },
    description: { value: "TXN", confidence: 1.0 },
    withdrawal: { value: wdl, confidence: 1.0 },
    deposit: { value: dep, confidence: 1.0 },
    balance: { value: bal, confidence: 1.0 },
    reference: { value: "Unknown", confidence: 0.5 },
    channel: { value: "OTHERS", confidence: 0.7 },
    raw_text: ``,
    confidence: 0.95
  });

  it("passes cleanly on perfectly reconciled ledger balances", () => {
    // Initial balance = 100
    // Row 1: -20 + 0 = 80
    // Row 2: -0 + 50 = 130
    const list = [
      dummyTxn(20, 0, 80),
      dummyTxn(0, 50, 130)
    ];

    const result = validateLedger(list, 100);
    expect(result.valid).toBe(true);
    expect(result.anomalies.length).toBe(0);
    expect(result.mathematicalScore).toBe(1.0);
  });

  it("detects running balance mismatches and computes correct quality scores", () => {
    // Initial balance = 100
    // Row 1: -20 + 0 = 80 (actual balance is 75! -> mismatch)
    // Row 2: -0 + 50 = 125 (checks relative to actual balance 75 -> reconciled!)
    const list = [
      dummyTxn(20, 0, 75), // mismatch (expected 80)
      dummyTxn(0, 50, 125) // correct relative to 75
    ];

    const result = validateLedger(list, 100);
    expect(result.valid).toBe(false);
    expect(result.anomalies.length).toBe(1);
    expect(result.anomalies[0].type).toBe("balance_mismatch");
    expect(result.anomalies[0].expectedValue).toBe(80);
    expect(result.anomalies[0].actualValue).toBe(75);
    expect(result.mathematicalScore).toBe(0.5); // 1 of 2 rows failed
  });

  it("flags negative balances correctly", () => {
    const list = [
      dummyTxn(150, 0, -50)
    ];

    const result = validateLedger(list, 100);
    expect(result.valid).toBe(false);
    expect(result.anomalies.some(a => a.type === "negative_balance")).toBe(true);
  });
});
