/**
 * Statement integrity checks (PRD-v2 §B.4).
 *
 * The core, concrete check is running-balance reconciliation: for every
 * transaction, balance[n] must equal balance[n-1] (+credit -debit). A break
 * means the statement was tampered with or mis-parsed. This is surfaced as an
 * integrity status separate from the borrower's risk score.
 *
 * Cross-page continuity and PDF-metadata anomaly checks are added when page
 * numbers / the raw PDF buffer are plumbed through (process route, Task 14).
 */
import type { RawTransaction } from "./extractors";

export interface BalanceBreak {
  /** Index in the input array of the transaction whose balance doesn't reconcile. */
  index: number;
  date: string;
  expectedBalance: number;
  actualBalance: number;
  /** actualBalance - expectedBalance, rounded to 2 dp. */
  delta: number;
}

export interface IntegrityReport {
  status: "ok" | "warning" | "fail";
  transactionsChecked: number;
  balanceBreaks: BalanceBreak[];
  notes: string[];
}

export interface IntegrityOptions {
  /** If provided, the first transaction is reconciled against this opening balance. */
  openingBalance?: number;
  /** Absolute mismatch (INR) above which a row is flagged. Default 1.0. */
  toleranceInr?: number;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

export function checkStatementIntegrity(
  txns: RawTransaction[],
  opts?: IntegrityOptions
): IntegrityReport {
  const tolerance = opts?.toleranceInr ?? 1.0;
  const notes: string[] = [];
  const balanceBreaks: BalanceBreak[] = [];

  if (txns.length === 0) {
    return {
      status: "ok",
      transactionsChecked: 0,
      balanceBreaks,
      notes: ["No transactions to verify."],
    };
  }

  let checked = 0;
  for (let i = 0; i < txns.length; i++) {
    const t = txns[i];

    let prevBalance: number;
    if (i === 0) {
      if (opts?.openingBalance === undefined) {
        // First row is the anchor — nothing to reconcile it against.
        continue;
      }
      prevBalance = Number(opts.openingBalance) || 0;
    } else {
      prevBalance = Number(txns[i - 1].balance) || 0;
    }

    const expected = prevBalance + (Number(t.credit) || 0) - (Number(t.debit) || 0);
    const actual = Number(t.balance) || 0;
    const delta = round2(actual - expected);
    checked++;

    if (Math.abs(delta) > tolerance) {
      balanceBreaks.push({
        index: i,
        date: t.date,
        expectedBalance: round2(expected),
        actualBalance: round2(actual),
        delta,
      });
    }
  }

  let status: IntegrityReport["status"] = "ok";
  if (balanceBreaks.length > 0) {
    const ratio = checked > 0 ? balanceBreaks.length / checked : 1;
    status = ratio < 0.25 ? "warning" : "fail";
    notes.push(
      `${balanceBreaks.length} of ${checked} transactions did not reconcile ` +
        `(running-balance mismatch). Possible tampering or a parser error — needs review.`
    );
  } else {
    notes.push(`All ${checked} reconcilable transactions passed the running-balance check.`);
  }

  return { status, transactionsChecked: checked, balanceBreaks, notes };
}
