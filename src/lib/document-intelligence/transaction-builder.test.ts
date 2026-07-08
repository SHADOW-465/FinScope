import { describe, it, expect } from "vitest";
import { buildTransaction } from "./transaction-builder";
import { RawTransaction } from "./types";

describe("Transaction Builder Engine", () => {
  it("successfully parses date and credit amounts with correct confidence scores", () => {
    const raw: RawTransaction = {
      dateText: "12-Jul-23",
      descriptionText: "UPI-JOHN-312345678901",
      amountText: "1,500.00",
      balanceText: "24,592.56",
      confidence: 0.95
    };

    const txn = buildTransaction(raw);
    expect(txn.date.value).toBe("2023-07-12");
    expect(txn.date.confidence).toBe(0.95);
    
    expect(txn.deposit.value).toBe(1500.00);
    expect(txn.withdrawal.value).toBe(0);
    expect(txn.balance.value).toBe(24592.56);
    
    expect(txn.reference.value).toBe("312345678901");
    expect(txn.reference.confidence).toBe(1.0);
    
    expect(txn.channel.value).toBe("UPI");
    expect(txn.channel.confidence).toBe(1.0);

    expect(txn.confidence).toBeGreaterThan(0.9);
  });

  it("handles debit amounts (withdrawals) and sets fields correctly", () => {
    const raw: RawTransaction = {
      dateText: "15/04/2023",
      descriptionText: "NEFT-UTR-SBINR520230712-CHARGES",
      amountText: "-100.00",
      balanceText: "24,492.56",
      confidence: 0.95
    };

    const txn = buildTransaction(raw);
    expect(txn.date.value).toBe("2023-04-15");
    expect(txn.withdrawal.value).toBe(100.00);
    expect(txn.deposit.value).toBe(0);
    expect(txn.reference.value).toBe("SBINR520230712");
    expect(txn.channel.value).toBe("NEFT");
  });
});
