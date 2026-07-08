import { describe, it, expect } from "vitest";
import { calculateLedgerConfidence } from "./confidence-engine";
import { Transaction } from "./types";

describe("Confidence Engine", () => {
  const dummyTxn = (conf: number): Transaction => ({
    date: { value: "2023-07-12", confidence: conf },
    description: { value: "TXN", confidence: conf },
    withdrawal: { value: 0, confidence: conf },
    deposit: { value: 0, confidence: conf },
    balance: { value: 0, confidence: conf },
    reference: { value: "Unknown", confidence: conf },
    channel: { value: "OTHERS", confidence: conf },
    raw_text: ``,
    confidence: conf
  });

  it("calculates correct weighted confidence metrics", () => {
    const list = [
      dummyTxn(0.8),
      dummyTxn(0.9)
    ];

    // Average transaction extraction confidence = 0.85
    // Reconciliation Score = 0.9
    // Overall = 0.85 * 0.4 + 0.9 * 0.6 = 0.34 + 0.54 = 0.88
    const result = calculateLedgerConfidence(list, 0.9);
    
    expect(result.averageTransactionConfidence).toBe(0.85);
    expect(result.reconciliationScore).toBe(0.9);
    expect(result.overallConfidenceScore).toBe(0.88);
  });

  it("handles empty lists gracefully", () => {
    const result = calculateLedgerConfidence([], 1.0);
    expect(result.overallConfidenceScore).toBe(1.0);
  });
});
