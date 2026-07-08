/**
 * Periodicity-based EMI / loan-obligation detection.
 *
 * Detects recurring obligations by BEHAVIOUR — same payee, near-equal amount,
 * roughly monthly cadence — rather than by any category string. Pure, no I/O.
 */
import type { ClassifiedTransaction } from "@/lib/engine/classifier";

export interface DetectedObligation {
  /** Counterparty of the group (display form), or "Unknown". */
  payee: string;
  /** Representative monthly amount = median of the cluster, 2 dp. */
  emiAmount: number;
  occurrences: number;
  /** Earliest ISO date in the cluster. */
  firstDate: string;
  /** Latest ISO date in the cluster. */
  lastDate: string;
  /** 0..1, 2 dp. */
  confidence: number;
  /** Indices into the INPUT array (evidence), ascending. */
  transactionIndices: number[];
}

export interface EMIDetectionOptions {
  /** Minimum recurring occurrences to qualify. Default 3. */
  minOccurrences?: number;
  /** Cluster width relative to the cluster minimum, in %. Default 5. */
  amountTolerancePct?: number;
  /** Monthly-cadence lower bound on the median gap, in days. Default 25. */
  minGapDays?: number;
  /** Monthly-cadence upper bound on the median gap, in days. Default 35. */
  maxGapDays?: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

function parseUTC(d: string): number {
  return new Date(d + "T00:00:00Z").getTime();
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const a = [...values].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 === 0 ? (a[mid - 1] + a[mid]) / 2 : a[mid];
}

function popStdev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

interface Entry {
  index: number;
  amount: number;
  date: string;
  payee: string;
}

export function detectEMIs(
  txns: ClassifiedTransaction[],
  opts?: EMIDetectionOptions
): DetectedObligation[] {
  const minOccurrences = opts?.minOccurrences ?? 3;
  const amountTolerancePct = opts?.amountTolerancePct ?? 5;
  const minGapDays = opts?.minGapDays ?? 25;
  const maxGapDays = opts?.maxGapDays ?? 35;

  // 1. Qualifying debits, keeping original input index.
  const entries: Entry[] = [];
  txns.forEach((t, index) => {
    if (t.transactionType === "DEBIT" && t.debit > 0 && ISO_DATE.test(t.date)) {
      entries.push({ index, amount: t.debit, date: t.date, payee: t.counterparty });
    }
  });

  // 2. Group by payee key.
  const groups = new Map<string, Entry[]>();
  for (const e of entries) {
    const key = (e.payee ?? "").trim().toLowerCase() || "unknown";
    const group = groups.get(key);
    if (group) group.push(e);
    else groups.set(key, [e]);
  }

  const results: DetectedObligation[] = [];

  for (const groupEntries of groups.values()) {
    const displayPayee = (groupEntries[0].payee ?? "").trim() || "Unknown";

    // 3. Cluster by amount (ascending), anchored at the cluster minimum.
    const byAmount = [...groupEntries].sort((a, b) => a.amount - b.amount);
    const clusters: Entry[][] = [];
    let current: Entry[] = [];
    let clusterMin = 0;
    for (const e of byAmount) {
      if (current.length === 0) {
        current = [e];
        clusterMin = e.amount;
      } else if ((e.amount - clusterMin) / clusterMin <= amountTolerancePct / 100) {
        current.push(e);
      } else {
        clusters.push(current);
        current = [e];
        clusterMin = e.amount;
      }
    }
    if (current.length > 0) clusters.push(current);

    // 4. Evaluate each cluster for monthly cadence.
    for (const cluster of clusters) {
      if (cluster.length < minOccurrences) continue;

      const byDate = [...cluster].sort(
        (a, b) => parseUTC(a.date) - parseUTC(b.date)
      );
      const gaps: number[] = [];
      for (let i = 1; i < byDate.length; i++) {
        gaps.push((parseUTC(byDate[i].date) - parseUTC(byDate[i - 1].date)) / MS_PER_DAY);
      }
      const medianGap = median(gaps);
      if (medianGap < minGapDays || medianGap > maxGapDays) continue;

      const amounts = cluster.map((c) => c.amount);
      const medAmt = median(amounts);
      const minAmt = Math.min(...amounts);
      const maxAmt = Math.max(...amounts);
      const spread = medAmt > 0 ? (maxAmt - minAmt) / medAmt : 0;

      let confidence = 0.6;
      if (spread < 0.01) confidence += 0.2;
      else if (spread < 0.03) confidence += 0.1;
      const gapStdev = popStdev(gaps);
      if (gapStdev <= 2) confidence += 0.15;
      else if (gapStdev <= 4) confidence += 0.05;
      if (cluster.length >= 4) confidence += 0.05;
      confidence = Math.min(0.97, round2(confidence));

      results.push({
        payee: displayPayee,
        emiAmount: round2(medAmt),
        occurrences: cluster.length,
        firstDate: byDate[0].date,
        lastDate: byDate[byDate.length - 1].date,
        confidence,
        transactionIndices: cluster.map((c) => c.index).sort((a, b) => a - b),
      });
    }
  }

  // 5. Largest obligations first.
  results.sort((a, b) => b.emiAmount - a.emiAmount);
  return results;
}
