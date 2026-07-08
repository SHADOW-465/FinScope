import { Transaction } from "./types";

/**
 * Reconstructs, deduplicates, and stably sorts transactions chronologically.
 * Tracks date continuity to flag anomalies.
 * 
 * @param transactions - List of parsed Transaction objects (possibly unsorted or overlapping)
 */
export function reconstructLedger(transactions: Transaction[]): Transaction[] {
  if (transactions.length === 0) return [];

  // 1. Deduplicate: remove exact matching duplicate rows
  const seenSignatures = new Set<string>();
  const uniqueTransactions: Transaction[] = [];

  for (const txn of transactions) {
    const signature = [
      txn.date.value,
      txn.description.value,
      txn.withdrawal.value,
      txn.deposit.value,
      txn.balance.value
    ].join("_");

    if (!seenSignatures.has(signature)) {
      seenSignatures.add(signature);
      uniqueTransactions.push(txn);
    }
  }

  // 2. Stable Sort: sort chronologically by date, keeping original relative order for identical dates
  const withOriginalIndex = uniqueTransactions.map((t, index) => ({ t, index }));
  
  withOriginalIndex.sort((a, b) => {
    const dateCompare = a.t.date.value.localeCompare(b.t.date.value);
    if (dateCompare !== 0) {
      return dateCompare;
    }
    return a.index - b.index; // Preserve relative sequence
  });

  const sortedTransactions = withOriginalIndex.map(item => item.t);

  // 3. Continuity check
  for (let i = 1; i < sortedTransactions.length; i++) {
    const prevDate = sortedTransactions[i - 1].date.value;
    const currDate = sortedTransactions[i].date.value;
    if (currDate < prevDate) {
      console.warn(
        `Chronological anomaly: Transaction at index ${i} has date (${currDate}) preceding previous transaction (${prevDate}).`
      );
    }
  }

  return sortedTransactions;
}
