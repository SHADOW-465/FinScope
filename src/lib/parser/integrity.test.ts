/// <reference types="vitest/globals" />
import { checkStatementIntegrity } from "@/lib/parser/integrity";
import type { RawTransaction } from "@/lib/parser/extractors";

function rt(p: { date: string; credit?: number; debit?: number; balance: number }): RawTransaction {
  const credit = p.credit ?? 0;
  const debit = p.debit ?? 0;
  return {
    date: p.date,
    description: "x",
    credit,
    debit,
    balance: p.balance,
    transactionType: credit >= debit ? "CREDIT" : "DEBIT",
  };
}

describe("checkStatementIntegrity", () => {
  it("passes a cleanly reconciling ledger (with opening balance)", () => {
    const txns = [
      rt({ date: "2025-01-01", credit: 10000, balance: 10000 }),
      rt({ date: "2025-01-02", debit: 3000, balance: 7000 }),
      rt({ date: "2025-01-03", credit: 5000, balance: 12000 }),
    ];
    const r = checkStatementIntegrity(txns, { openingBalance: 0 });
    expect(r.status).toBe("ok");
    expect(r.transactionsChecked).toBe(3);
    expect(r.balanceBreaks).toEqual([]);
  });

  it("treats the first row as an anchor when no opening balance is given", () => {
    const txns = [
      rt({ date: "2025-01-01", balance: 10000 }),
      rt({ date: "2025-01-02", debit: 3000, balance: 7000 }),
      rt({ date: "2025-01-03", credit: 5000, balance: 12000 }),
    ];
    const r = checkStatementIntegrity(txns);
    expect(r.status).toBe("ok");
    expect(r.transactionsChecked).toBe(2); // first row not checked
    expect(r.balanceBreaks).toEqual([]);
  });

  it("flags a tampered closing balance", () => {
    const txns = [
      rt({ date: "2025-01-01", credit: 10000, balance: 10000 }),
      rt({ date: "2025-01-02", debit: 3000, balance: 7000 }),
      rt({ date: "2025-01-03", credit: 5000, balance: 99999 }), // should be 12000
    ];
    const r = checkStatementIntegrity(txns, { openingBalance: 0 });
    expect(r.status).not.toBe("ok");
    expect(r.balanceBreaks).toHaveLength(1);
    expect(r.balanceBreaks[0].index).toBe(2);
    expect(r.balanceBreaks[0].expectedBalance).toBe(12000);
    expect(r.balanceBreaks[0].actualBalance).toBe(99999);
  });

  it("reports a single break in a long ledger as a warning (not fail)", () => {
    const txns = [
      rt({ date: "2025-01-01", credit: 10000, balance: 10000 }),
      rt({ date: "2025-01-02", credit: 5000, balance: 15000 }),
      rt({ date: "2025-01-03", debit: 3000, balance: 12000 }),
      rt({ date: "2025-01-04", credit: 8000, balance: 20000 }),
      rt({ date: "2025-01-05", debit: 2000, balance: 18000 }),
      rt({ date: "2025-01-06", credit: 4000, balance: 22000 }),
      rt({ date: "2025-01-07", debit: 1000, balance: 21000 }),
      rt({ date: "2025-01-08", credit: 1000, balance: 50000 }), // should be 22000
    ];
    const r = checkStatementIntegrity(txns, { openingBalance: 0 });
    expect(r.status).toBe("warning"); // 1/8 < 0.25
    expect(r.balanceBreaks).toHaveLength(1);
    expect(r.balanceBreaks[0].index).toBe(7);
  });

  it("returns ok with nothing checked for empty input", () => {
    const r = checkStatementIntegrity([]);
    expect(r.status).toBe("ok");
    expect(r.transactionsChecked).toBe(0);
  });

  it("heals a transaction with missing debit/credit based on balance change", () => {
    const txns = [
      rt({ date: "2025-01-01", credit: 10000, balance: 10000 }),
      rt({ date: "2025-01-02", balance: 7000 }), // missing debit 3000
      rt({ date: "2025-01-03", balance: 12000 }), // missing credit 5000
    ];
    const r = checkStatementIntegrity(txns, { openingBalance: 0 });
    expect(r.status).toBe("ok");
    expect(r.transactionsChecked).toBe(3);
    expect(r.balanceBreaks).toEqual([]);
    expect(txns[1].debit).toBe(3000);
    expect(txns[1].transactionType).toBe("DEBIT");
    expect(txns[2].credit).toBe(5000);
    expect(txns[2].transactionType).toBe("CREDIT");
  });

  it("heals a transaction with swapped credit/debit columns", () => {
    const txns = [
      rt({ date: "2025-01-01", credit: 10000, balance: 10000 }),
      // parsed as credit=3000, but balance went down from 10000 to 7000, so it's a debit!
      { date: "2025-01-02", description: "x", credit: 3000, debit: 0, balance: 7000, transactionType: "CREDIT" as const },
      // parsed as debit=5000, but balance went up from 7000 to 12000, so it's a credit!
      { date: "2025-01-03", description: "x", credit: 0, debit: 5000, balance: 12000, transactionType: "DEBIT" as const },
    ];
    const r = checkStatementIntegrity(txns, { openingBalance: 0 });
    expect(r.status).toBe("ok");
    expect(txns[1].debit).toBe(3000);
    expect(txns[1].credit).toBe(0);
    expect(txns[1].transactionType).toBe("DEBIT");
    expect(txns[2].credit).toBe(5000);
    expect(txns[2].debit).toBe(0);
    expect(txns[2].transactionType).toBe("CREDIT");
  });
});
