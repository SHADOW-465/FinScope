/// <reference types="vitest/globals" />
import { averageDailyBalance } from "@/lib/engine/adb";

describe("averageDailyBalance", () => {
  // 1. Time-weighting headline
  it("time-weights balances by day count, not transaction count", () => {
    // ₹100 000 for days 01–20 (20 days), ₹0 for days 21–30 (10 days)
    // ADB = (100000*20 + 0*10) / 30 = 2000000/30 = 66666.67
    // Naive per-transaction mean would be (100000 + 0) / 2 = 50000 — proves time-weighting
    const result = averageDailyBalance(
      [
        { date: "2025-01-01", balance: 100000 },
        { date: "2025-01-21", balance: 0 },
      ],
      { periodStart: "2025-01-01", periodEnd: "2025-01-30", openingBalance: 0 }
    );
    expect(result).toBe(66666.67);
  });

  // 2. Days before first transaction use openingBalance
  it("uses openingBalance for days before the first transaction", () => {
    // Mar 1–4 (4 days) at openingBalance 10000, Mar 5 (1 day) at 30000
    // ADB = (10000*4 + 30000*1) / 5 = 70000/5 = 14000
    const result = averageDailyBalance(
      [{ date: "2025-03-05", balance: 30000 }],
      { periodStart: "2025-03-01", periodEnd: "2025-03-05", openingBalance: 10000 }
    );
    expect(result).toBe(14000);
  });

  // 3. Single-day period
  it("returns the point balance for a single-day period", () => {
    const result = averageDailyBalance(
      [{ date: "2025-02-10", balance: 25000 }],
      { periodStart: "2025-02-10", periodEnd: "2025-02-10" }
    );
    expect(result).toBe(25000);
  });

  // 4. Empty points
  it("returns openingBalance when points array is empty", () => {
    expect(averageDailyBalance([], { openingBalance: 5000 })).toBe(5000);
  });

  it("returns 0 when points array is empty and no openingBalance is given", () => {
    expect(averageDailyBalance([])).toBe(0);
  });

  // 5. Same-day points: last one in original input order wins
  it("uses the last same-day point (by input order) as that day's closing balance", () => {
    // day1 (May 1): EOD = 7000 (last of the two same-date points)
    // day2 (May 2): carry forward 7000
    // ADB = (7000 + 7000) / 2 = 7000
    const result = averageDailyBalance(
      [
        { date: "2025-05-01", balance: 1000 },
        { date: "2025-05-01", balance: 7000 },
      ],
      { periodStart: "2025-05-01", periodEnd: "2025-05-02" }
    );
    expect(result).toBe(7000);
  });

  // 6. Defaults to point date range when no period given
  it("defaults periodStart/End to the earliest and latest point dates", () => {
    // Jun 1 = 200, Jun 2 = carry 200, Jun 3 = 800 → (200+200+800)/3 = 1200/3 = 400
    const result = averageDailyBalance([
      { date: "2025-06-01", balance: 200 },
      { date: "2025-06-03", balance: 800 },
    ]);
    expect(result).toBe(400);
  });
});
