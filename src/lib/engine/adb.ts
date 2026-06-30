export interface DailyBalancePoint {
  /** ISO date "YYYY-MM-DD". */
  date: string;
  /** Closing balance immediately AFTER the last transaction of consideration. */
  balance: number;
}

export interface ADBOptions {
  /** Balance in effect for calendar days BEFORE the first transaction. Default 0. */
  openingBalance?: number;
  /** ISO "YYYY-MM-DD". Defaults to the earliest point date. */
  periodStart?: string;
  /** ISO "YYYY-MM-DD". Defaults to the latest point date. */
  periodEnd?: string;
}

/** Round to 2 decimal places using "round half away from zero". */
function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/** Parse an ISO date string as a UTC midnight timestamp. */
function parseUTC(dateStr: string): number {
  return new Date(dateStr + "T00:00:00Z").getTime();
}

/** True iff the string is a valid YYYY-MM-DD date. */
function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = parseUTC(s);
  return !Number.isNaN(t);
}

/**
 * Time-weighted Average Daily Balance over [periodStart, periodEnd] inclusive.
 * Each calendar day's end-of-day balance = the balance of the last point on or
 * before that day; days with no point carry the previous day's balance forward;
 * days before the first point use openingBalance. Returns INR rounded to 2 dp.
 */
export function averageDailyBalance(
  points: DailyBalancePoint[],
  opts?: ADBOptions
): number {
  const openingBalance = opts?.openingBalance ?? 0;

  // Step 6: filter out invalid dates
  const validPoints = points.filter((p) => isValidDate(p.date));

  // Step 1: empty (or all-invalid) input
  if (validPoints.length === 0) {
    return round2(openingBalance);
  }

  // Step 2: stable sort by date ascending; same-date entries keep original order
  // so the last one in original order stays last after sort (stable sort guarantees this).
  const sorted = [...validPoints].sort((a, b) => {
    const da = parseUTC(a.date);
    const db = parseUTC(b.date);
    return da - db;
  });

  // Step 3: determine period
  const earliestDate = sorted[0].date;
  const latestDate = sorted[sorted.length - 1].date;

  const startStr = opts?.periodStart ?? earliestDate;
  const endStr = opts?.periodEnd ?? latestDate;

  let startMs = parseUTC(startStr);
  let endMs = parseUTC(endStr);

  // If end < start, treat as single-day period at start
  if (endMs < startMs) {
    endMs = startMs;
  }

  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  // Build a map: date string -> closing balance (last point for that date)
  const dayMap = new Map<string, number>();
  for (const p of sorted) {
    // Overwriting same-date entries preserves "last in original order wins"
    // because stable sort keeps same-date items in their original relative order.
    dayMap.set(p.date, p.balance);
  }

  // Step 4: walk each calendar day
  let runningBalance = openingBalance;
  let sum = 0;
  let dayCount = 0;

  for (let ms = startMs; ms <= endMs; ms += MS_PER_DAY) {
    const dateStr = new Date(ms).toISOString().slice(0, 10); // "YYYY-MM-DD" in UTC
    if (dayMap.has(dateStr)) {
      runningBalance = dayMap.get(dateStr)!;
    }
    sum += runningBalance;
    dayCount++;
  }

  // Step 5: return rounded result
  return round2(sum / dayCount);
}
