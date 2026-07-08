import { Transaction } from "./types";
import { validateLedger } from "./validator";

/**
 * Iteratively repairs transaction ledgers containing balance mismatches.
 * Self-heals dropped credits/debits in place and returns the updated transactions list.
 * 
 * @param transactions - List of Transaction objects to verify and self-heal
 * @param maxIterations - Maximum correction passes to prevent infinite loops
 */
export function repairLedger(
  transactions: Transaction[],
  openingBalance?: number,
  maxIterations = 3
): Transaction[] {
  // Deep copy transactions to avoid mutating inputs directly
  let repaired = transactions.map(t => ({
    ...t,
    date: { ...t.date },
    description: { ...t.description },
    withdrawal: { ...t.withdrawal },
    deposit: { ...t.deposit },
    balance: { ...t.balance },
    reference: { ...t.reference },
    channel: { ...t.channel }
  }));

  for (let iter = 1; iter <= maxIterations; iter++) {
    const result = validateLedger(repaired, openingBalance);
    if (result.valid) {
      console.log(`[Repair] Ledger successfully reconciled on pass ${iter - 1}.`);
      break;
    }

    const firstMismatch = result.anomalies.find(a => a.type === "balance_mismatch");
    if (!firstMismatch || firstMismatch.transactionIndex === undefined) {
      break;
    }

    const idx = firstMismatch.transactionIndex;
    const expected = firstMismatch.expectedValue || 0;
    const actual = firstMismatch.actualValue || 0;
    const diff = Math.round((actual - expected) * 100) / 100;

    if (diff === 0) break;

    const txn = repaired[idx];
    
    // Check if the transaction has zero amount values (likely a dropped cell)
    const isDroppedAmount = txn.withdrawal.value === 0 && txn.deposit.value === 0;

    if (isDroppedAmount) {
      if (diff > 0) {
        // Actual is higher, indicating a dropped deposit
        txn.deposit = { value: diff, confidence: 0.9 };
        console.log(`[Repair] Pass ${iter}: Self-healed dropped deposit of ${diff} at row ${idx + 1}.`);
      } else {
        // Actual is lower, indicating a dropped withdrawal
        txn.withdrawal = { value: Math.abs(diff), confidence: 0.9 };
        console.log(`[Repair] Pass ${iter}: Self-healed dropped withdrawal of ${Math.abs(diff)} at row ${idx + 1}.`);
      }
    } else {
      // If the row already has amounts, this is an impossible balance jump (cannot self-heal safely)
      console.warn(`[Repair] Pass ${iter}: Non-reconcilable balance jump of ${diff} at row ${idx + 1}. Aborting repair loop.`);
      break;
    }
  }

  return repaired;
}
