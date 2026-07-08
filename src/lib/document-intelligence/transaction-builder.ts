import { RawTransaction, Transaction, FieldConfidence } from "./types";

/**
 * Parses a raw date string into ISO YYYY-MM-DD format.
 * Automatically handles common separators (- or /) and month name abbreviations.
 */
function parseDate(rawDate: string): FieldConfidence<string> {
  const clean = rawDate.trim().replace(/\s+/g, " ");

  // 1. Explicitly check numeric DD/MM/YYYY or DD-MM-YYYY
  const numericRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/;
  const numMatch = clean.match(numericRegex);
  if (numMatch) {
    const day = numMatch[1].padStart(2, "0");
    const month = numMatch[2].padStart(2, "0");
    let year = numMatch[3];
    if (year.length === 2) {
      year = `20${year}`;
    }
    return { value: `${year}-${month}-${day}`, confidence: 0.95 };
  }

  // 2. Handle patterns like "DD MMM YYYY" or "DD-MMM-YY"
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
  };

  const alphaRegex = /(\d{1,2})[-/ ]([a-zA-Z]{3})[-/ ](\d{2,4})/;
  const alphaMatch = clean.match(alphaRegex);
  if (alphaMatch) {
    const day = alphaMatch[1].padStart(2, "0");
    const monthStr = alphaMatch[2].toLowerCase();
    let year = alphaMatch[3];
    if (year.length === 2) {
      year = `20${year}`;
    }
    const month = months[monthStr];
    if (month) {
      return { value: `${year}-${month}-${day}`, confidence: 0.95 };
    }
  }

  // 3. Fallback to native parsing, but formatted with timezone-safe local coordinates
  const parsed = Date.parse(clean);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const dy = String(d.getDate()).padStart(2, "0");
    return { value: `${yr}-${mo}-${dy}`, confidence: 0.9 };
  }

  return { value: clean, confidence: 0.5 };
}

/**
 * Parses numeric text into floats, stripping commas and indicators.
 */
function parseNumber(rawNum: string): FieldConfidence<number> {
  const clean = rawNum.replace(/[^\d.-]/g, "").trim();
  const val = parseFloat(clean);
  if (isNaN(val)) {
    return { value: 0, confidence: 0.0 };
  }
  return { value: Math.abs(val), confidence: 1.0 };
}

/**
 * Extracts reference numbers (UPI, UTR, Checks, IMPS) from narrative text.
 */
function extractReference(description: string): FieldConfidence<string> {
  const desc = description.toUpperCase();
  
  // 12-digit UPI / IMPS transaction reference
  const upiMatch = desc.match(/\b\d{12}\b/);
  if (upiMatch) {
    return { value: upiMatch[0], confidence: 1.0 };
  }

  // NEFT / RTGS UTR (e.g. SBINR520230712...)
  const utrMatch = desc.match(/\b[A-Z]{4}[RNC]\d{9,16}\b/);
  if (utrMatch) {
    return { value: utrMatch[0], confidence: 1.0 };
  }

  // 6-digit Check number
  const checkMatch = desc.match(/\bCHQ\b\s*\b\d{6}\b|\bCHEQUE\b\s*\b\d{6}\b/i);
  if (checkMatch) {
    const num = checkMatch[0].match(/\d{6}/);
    if (num) return { value: num[0], confidence: 1.0 };
  }

  return { value: "Unknown", confidence: 0.5 };
}

/**
 * Classifies transaction channel from narrative text.
 */
function classifyChannel(description: string): FieldConfidence<string> {
  const desc = description.toUpperCase();

  if (desc.includes("UPI") || desc.includes("IMPS/P2A") || desc.includes("IMPS/P2P")) {
    return { value: "UPI", confidence: 1.0 };
  }
  if (desc.includes("IMPS")) {
    return { value: "IMPS", confidence: 1.0 };
  }
  if (desc.includes("NEFT")) {
    return { value: "NEFT", confidence: 1.0 };
  }
  if (desc.includes("RTGS")) {
    return { value: "RTGS", confidence: 1.0 };
  }
  if (desc.includes("CASH DEP") || desc.includes("CASH WDL") || desc.includes("SELF DEP")) {
    return { value: "CASH", confidence: 1.0 };
  }
  if (desc.includes("POS") || desc.includes("ECOM") || desc.includes("DEBIT CARD") || desc.includes("VISA")) {
    return { value: "CARD", confidence: 1.0 };
  }
  if (desc.includes("INT.COLL") || desc.includes("INTEREST RECEIVE") || desc.includes("INT.REC")) {
    return { value: "INTEREST", confidence: 0.95 };
  }
  if (desc.includes("EMI") || desc.includes("LOAN EMI")) {
    return { value: "EMI", confidence: 0.95 };
  }

  return { value: "OTHERS", confidence: 0.7 };
}

/**
 * Builds a structured Transaction object from a RawTransaction row.
 * Parses dates, divides credit/debit amount, extracts references, and estimates confidence.
 * 
 * @param raw - The RawTransaction row containing raw parsed columns
 */
export function buildTransaction(raw: RawTransaction): Transaction {
  const dateResult = parseDate(raw.dateText);
  const descResult = { value: raw.descriptionText.trim(), confidence: 1.0 };
  const balanceResult = parseNumber(raw.balanceText);

  // Parse amount details
  const amountResult = parseNumber(raw.amountText);
  
  let withdrawalVal = 0;
  let depositVal = 0;
  
  // Decide credit (deposit) vs debit (withdrawal)
  const isDebit = raw.amountText.includes("-") || 
                  raw.amountText.toUpperCase().includes("DR") || 
                  raw.descriptionText.toUpperCase().includes("CHARGES") ||
                  raw.descriptionText.toUpperCase().includes("DEBITED") ||
                  raw.descriptionText.toUpperCase().includes("WITHDRAWAL") ||
                  raw.descriptionText.toUpperCase().includes("EMI");

  if (isDebit) {
    withdrawalVal = amountResult.value;
  } else {
    depositVal = amountResult.value;
  }

  const withdrawalResult = { value: withdrawalVal, confidence: amountResult.confidence };
  const depositResult = { value: depositVal, confidence: amountResult.confidence };

  // Extracted helper fields
  const refResult = extractReference(raw.descriptionText);
  const channelResult = classifyChannel(raw.descriptionText);

  // Compute average field confidence
  const overallConfidence = (
    dateResult.confidence +
    descResult.confidence +
    amountResult.confidence +
    balanceResult.confidence +
    refResult.confidence +
    channelResult.confidence
  ) / 6;

  return {
    date: dateResult,
    description: descResult,
    withdrawal: withdrawalResult,
    deposit: depositResult,
    balance: balanceResult,
    reference: refResult,
    channel: channelResult,
    raw_text: `${raw.dateText} | ${raw.descriptionText} | ${raw.amountText} | ${raw.balanceText}`,
    confidence: parseFloat(overallConfidence.toFixed(4))
  };
}
