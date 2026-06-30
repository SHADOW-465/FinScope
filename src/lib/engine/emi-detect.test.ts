/// <reference types="vitest/globals" />
import { detectEMIs } from "@/lib/engine/emi-detect";
import type { ClassifiedTransaction } from "@/lib/engine/classifier";

// Minimal DEBIT ClassifiedTransaction builder.
function tx(date: string, debit: number, counterparty: string): ClassifiedTransaction {
  return {
    date,
    description: "x",
    debit,
    credit: 0,
    balance: 0,
    transactionType: "DEBIT",
    category: "x",
    counterparty,
    confidenceScore: 0.7,
  };
}

describe("detectEMIs", () => {
  it("detects a clean monthly EMI", () => {
    const txns = [
      tx("2025-01-05", 8500, "Bajaj Finance"),
      tx("2025-02-05", 8500, "Bajaj Finance"),
      tx("2025-03-05", 8500, "Bajaj Finance"),
      tx("2025-04-05", 8500, "Bajaj Finance"),
    ];
    const result = detectEMIs(txns);
    expect(result).toHaveLength(1);
    const o = result[0];
    expect(o.payee).toBe("Bajaj Finance");
    expect(o.emiAmount).toBe(8500);
    expect(o.occurrences).toBe(4);
    expect(o.firstDate).toBe("2025-01-05");
    expect(o.lastDate).toBe("2025-04-05");
    expect(o.confidence).toBeGreaterThan(0.8);
    expect(o.transactionIndices).toHaveLength(4);
  });

  it("does not detect irregular (non-monthly) cadence", () => {
    const txns = [
      tx("2025-01-01", 500, "Random Shop"),
      tx("2025-01-03", 500, "Random Shop"),
      tx("2025-01-10", 500, "Random Shop"),
    ];
    expect(detectEMIs(txns)).toEqual([]);
  });

  it("does not detect with too few occurrences", () => {
    const txns = [
      tx("2025-01-10", 1000, "Foo"),
      tx("2025-02-10", 1000, "Foo"),
    ];
    expect(detectEMIs(txns)).toEqual([]);
  });

  it("clusters near-equal amounts within tolerance", () => {
    const txns = [
      tx("2025-01-07", 10000, "HDFC Loan"),
      tx("2025-02-07", 10200, "HDFC Loan"),
      tx("2025-03-07", 9900, "HDFC Loan"),
    ];
    const result = detectEMIs(txns);
    expect(result).toHaveLength(1);
    expect(result[0].emiAmount).toBe(10000);
    expect(result[0].occurrences).toBe(3);
  });

  it("detects only the recurring cluster for a payee with one-off debits", () => {
    const txns = [
      tx("2025-01-02", 2000, "Cardco"),
      tx("2025-02-02", 2000, "Cardco"),
      tx("2025-03-02", 2000, "Cardco"),
      tx("2025-01-15", 50, "Cardco"),
      tx("2025-02-20", 75, "Cardco"),
    ];
    const result = detectEMIs(txns);
    expect(result).toHaveLength(1);
    expect(result[0].emiAmount).toBe(2000);
    expect(result[0].occurrences).toBe(3);
  });

  it("detects an Unknown-payee obligation by behaviour", () => {
    const txns = [
      tx("2025-01-09", 3000, "Unknown"),
      tx("2025-02-09", 3000, "Unknown"),
      tx("2025-03-09", 3000, "Unknown"),
    ];
    const result = detectEMIs(txns);
    expect(result).toHaveLength(1);
    expect(result[0].payee).toBe("Unknown");
    expect(result[0].emiAmount).toBe(3000);
  });

  it("returns an empty array for empty input", () => {
    expect(detectEMIs([])).toEqual([]);
  });
});
