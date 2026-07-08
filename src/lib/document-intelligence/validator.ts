import { Transaction, LedgerValidationResult, ValidationAnomaly } from "./types";

/**
 * Validates the ledger integrity using accounting rules: Prev Balance - Debit + Credit = Current Balance.
 * Isolates anomalies without immediately raising fraudulent alarms.
 * 
 * @param transactions - List of stably sorted Transaction objects
 * @param openingBalance - Optional opening balance override
 */
export function validateLedger(
  transactions: Transaction[],
  openingBalance?: number
): LedgerValidationResult {
  const anomalies: ValidationAnomaly[] = [];
  const total = transactions.length;

  if (total === 0) {
    return { valid: true, anomalies: [], mathematicalScore: 1.0 };
  }

  let mismatchesCount = 0;
  
  // Initialize running balance
  let runningPrevBalance = openingBalance !== undefined
    ? openingBalance
    : Math.round((transactions[0].balance.value + transactions[0].withdrawal.value - transactions[0].deposit.value) * 100) / 100;

  for (let i = 0; i < total; i++) {
    const txn = transactions[i];
    const wdl = txn.withdrawal.value;
    const dep = txn.deposit.value;
    const actualBal = txn.balance.value;

    const expectedBal = Math.round((runningPrevBalance - wdl + dep) * 100) / 100;
    const roundedActual = Math.round(actualBal * 100) / 100;

    if (expectedBal !== roundedActual) {
      mismatchesCount++;
      anomalies.push({
        type: "balance_mismatch",
        message: `Balance mismatch at row ${i + 1}: expected ${expectedBal}, got ${roundedActual}.`,
        transactionIndex: i,
        expectedValue: expectedBal,
        actualValue: roundedActual
      });
    }

    if (roundedActual < 0) {
      anomalies.push({
        type: "negative_balance",
        message: `Negative balance detected at row ${i + 1}: ${roundedActual}.`,
        transactionIndex: i,
        actualValue: roundedActual
      });
    }

    // Reset previous balance to the actual balance of this row to isolate mismatches
    // and prevent cascade failures across the rest of the ledger.
    runningPrevBalance = roundedActual;
  }

  const score = total > 0 ? (total - mismatchesCount) / total : 1.0;

  return {
    valid: anomalies.length === 0,
    anomalies,
    mathematicalScore: parseFloat(score.toFixed(4))
  };
}
