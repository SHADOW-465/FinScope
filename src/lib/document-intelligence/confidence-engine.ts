import { Transaction, LedgerConfidence } from "./types";

/**
 * Consolidates extraction and validation scores into a unified confidence profile.
 * Weighted: 40% extraction confidence, 60% mathematical validation score.
 * 
 * @param transactions - List of parsed Transaction objects
 * @param reconciliationScore - Mathematical sound quotient from validator (0.0 to 1.0)
 */
export function calculateLedgerConfidence(
  transactions: Transaction[],
  reconciliationScore: number
): LedgerConfidence {
  if (transactions.length === 0) {
    return {
      averageTransactionConfidence: 1.0,
      reconciliationScore: 1.0,
      overallConfidenceScore: 1.0
    };
  }

  const sumConfidence = transactions.reduce((acc, t) => acc + t.confidence, 0);
  const avgTxnConf = sumConfidence / transactions.length;

  const combinedScore = (avgTxnConf * 0.4) + (reconciliationScore * 0.6);

  return {
    averageTransactionConfidence: parseFloat(avgTxnConf.toFixed(4)),
    reconciliationScore: parseFloat(reconciliationScore.toFixed(4)),
    overallConfidenceScore: parseFloat(combinedScore.toFixed(4))
  };
}
