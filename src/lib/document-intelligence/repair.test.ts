import { describe, it, expect } from "vitest";
import { repairLedger } from "./repair";
import { validateLedger } from "./validator";
import { Transaction } from "./types";

describe("Reconciliation Repair Engine", () => {
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

  it("successfully self-heals a dropped debit amount", () => {
    // Initial balance = 100
    // Row 1: 0 withdrawal, 0 deposit, balance is 80 (should have been withdrawal of 20!)
    const list = [
      dummyTxn(0, 0, 80)
    ];

    const repaired = repairLedger(list, 100);
    expect(repaired[0].withdrawal.value).toBe(20);
    expect(repaired[0].deposit.value).toBe(0);

    const valResult = validateLedger(repaired, 100);
    expect(valResult.valid).toBe(true);
  });

  it("aborts correction loop when balance jump is non-reconcilable", () => {
    // Initial balance = 100
    // Row 1: -20 + 0 = 80 (actual balance is 50! and amount is already non-zero -> abort!)
    const list = [
      dummyTxn(20, 0, 50)
    ];

    const repaired = repairLedger(list, 100);
    // Amount should remain unmodified
    expect(repaired[0].withdrawal.value).toBe(20);
    
    const valResult = validateLedger(repaired, 100);
    expect(valResult.valid).toBe(false);
  });
});
