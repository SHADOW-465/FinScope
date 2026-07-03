import { RawTransaction } from "../parser/extractors";

export interface ClassifiedTransaction extends RawTransaction {
  category: string;
  counterparty: string;
  confidenceScore: number;
  /** Set to true when the local ONNX model overrode the keyword classifier */
  aiEnhanced?: boolean;
}

export function classifyTransactions(rawTxns: RawTransaction[]): ClassifiedTransaction[] {
  return rawTxns.map(txn => {
    const desc = txn.description;
    const descLower = desc.toLowerCase();
    // PDF extraction splits words mid-token ("Cas h Dep") — compact form
    // catches keywords the spaced form misses.
    const descCompact = descLower.replace(/\s+/g, "");
    const amount = txn.credit > 0 ? txn.credit : txn.debit;
    
    let category = "Miscellaneous";
    let counterparty = "Unknown";
    let confidenceScore = 0.7; // Default heuristic confidence
    
    // Extract Counterparty from common formats
    // E.g. UPI/SENTHILKUM/senthilkumarl1/Anarchy SS/State Bank/603214213833/SBI62493555d58e48f891bcc935fc8b60ed -> "SENTHILKUM" or "Anarchy SS"
    // E.g. UPI/KARTHICK R/karthickrajend -> "KARTHICK R"
    // E.g. UPI/Swiggy/swiggystores@i -> "Swiggy"
    if (descLower.includes("upi/")) {
      const parts = desc.split("/");
      // If parts[1] is "DR" or "CR" or empty, skip it to find the name
      let nameIdx = 1;
      while (nameIdx < parts.length && (parts[nameIdx].toUpperCase() === "DR" || parts[nameIdx].toUpperCase() === "CR" || parts[nameIdx].trim() === "")) {
        nameIdx++;
      }
      if (nameIdx < parts.length) {
        let rawName = parts[nameIdx].trim();
        // If it's a numeric reference code, try the next part
        if (rawName.match(/^\d+$/) && nameIdx + 1 < parts.length) {
          rawName = parts[nameIdx + 1].trim();
        }
        counterparty = cleanCounterpartyName(rawName);
      }
    } else if (descLower.includes("transfer debit") || descLower.includes("transfer credit")) {
      // IndusInd: "Transfer Debit - N/INDBH19119982914/SIBL/SUPERMAX CNC" -> "SUPERMAX CNC"
      const parts = desc.split("/");
      if (parts.length > 0) {
        counterparty = cleanCounterpartyName(parts[parts.length - 1]);
      }
    } else {
      // Generic parsing: RTGS/NEFT/CMS narrations embed the payee between
      // reference codes ("RTGS- CNRBR52...-SREE BALAJI ENTERPRISES- 1200...").
      counterparty = extractGenericCounterparty(desc);
    }
    
    // Perform Categorization
    if (txn.transactionType === "CREDIT") {
      // CREDIT CATEGORIZATION
      if (
        descLower.includes("salary") || 
        descLower.includes("payroll") || 
        descLower.includes("wage") ||
        descLower.includes("sal ") ||
        descLower.includes("salpkg")
      ) {
        category = "Salary";
        confidenceScore = 0.95;
      } else if (
        descLower.includes("loan") || 
        descLower.includes("disburs") || 
        descLower.includes("credit line") ||
        descLower.includes("disbursal")
      ) {
        category = "Loan Credit";
        confidenceScore = 0.9;
      } else if (
        descCompact.includes("cashdeposit") ||
        descCompact.includes("cashdep") ||
        descCompact.includes("selfdep") ||
        descCompact.includes("cshdep") ||
        descCompact.includes("bydeposit")
      ) {
        category = "Cash Deposit";
        confidenceScore = 0.9;
      } else if (descLower.includes("upi/")) {
        // Credits via UPI
        // Check if UPI looks like salary/business or personal
        if (amount > 25000 && (descLower.includes("pvt") || descLower.includes("ltd") || descLower.includes("enterprises"))) {
          category = "Business Revenue";
          confidenceScore = 0.8;
        } else {
          category = "UPI Transfer";
          confidenceScore = 0.85;
        }
      } else if (descLower.includes("interest") || descLower.includes("int.rec")) {
        category = "Investment";
        confidenceScore = 0.85;
      } else if (
        // Reversals/cancellations are money coming BACK, never income.
        descLower.includes("cancln") ||
        descLower.includes("cancel") ||
        descLower.includes("reversal") ||
        descLower.includes("rev of") ||
        descLower.includes("refund")
      ) {
        category = "Refund/Reversal";
        confidenceScore = 0.9;
      } else {
        // Default Credit
        if (amount > 10000) {
          category = "Business Revenue";
        } else {
          category = "Personal Transfer";
        }
      }
    } else {
      // DEBIT CATEGORIZATION
      if (
        /\bemi\b/.test(descLower) || // whole-word: avoid matching "premium", "chemistry", etc.
        descLower.includes("loan") ||
        descLower.includes("lending") || 
        descLower.includes("bajaj") || 
        descLower.includes("finance") || 
        descLower.includes("capital first") ||
        descLower.includes("idfc") || 
        descLower.includes("bfl") ||
        descLower.includes("nach dr")
      ) {
        category = "EMI Payment";
        confidenceScore = 0.9;
      } else if (descLower.includes("rent") || descLower.includes("lease")) {
        category = "Rent";
        confidenceScore = 0.9;
      } else if (
        descLower.includes("electricity") || 
        descLower.includes("eb chg") || 
        descLower.includes("phone bill") || 
        descLower.includes("jio") || 
        descLower.includes("airtel") || 
        descLower.includes("utility") || 
        descLower.includes("broadband") ||
        descLower.includes("water bill")
      ) {
        category = "Utility";
        confidenceScore = 0.9;
      } else if (
        descLower.includes("insurance") || 
        descLower.includes("lic") || 
        descLower.includes("hdfc ergo") || 
        descLower.includes("sbi life") || 
        descLower.includes("tata aia") || 
        descLower.includes("max life")
      ) {
        category = "Insurance";
        confidenceScore = 0.95;
      } else if (
        descLower.includes("mutual fund") || 
        descLower.includes("zerodha") || 
        descLower.includes("groww") || 
        descLower.includes("stock") || 
        descLower.includes("securities") || 
        descLower.includes("sip") || 
        descLower.includes("nippon") || 
        descLower.includes("investment")
      ) {
        category = "Investment";
        confidenceScore = 0.9;
      } else if (
        descLower.includes("atm") || 
        descLower.includes("cash wdl") || 
        descLower.includes("cash withdrawal") ||
        descLower.includes("withdrawal") && descLower.includes("cash")
      ) {
        category = "ATM Withdrawal";
        confidenceScore = 0.95;
      } else if (descLower.includes("upi/")) {
        // UPI Debits
        // Check if UPI represents business vendor or personal
        if (descLower.includes("swiggy") || descLower.includes("zomato") || descLower.includes("uber") || descLower.includes("ola") || descLower.includes("zepto") || descLower.includes("blinkit")) {
          category = "Utility"; // Quick lifestyle spending
          confidenceScore = 0.85;
        } else if (amount > 15000) {
          category = "Vendor Payment";
          confidenceScore = 0.75;
        } else {
          category = "UPI Transfer";
          confidenceScore = 0.8;
        }
      } else {
        if (amount > 20000) {
          category = "Vendor Payment";
        } else {
          category = "Personal Transfer";
        }
      }
    }
    
    return {
      ...txn,
      category,
      counterparty,
      confidenceScore
    };
  });
}

/**
 * Pulls the payee name out of bank-mode narrations (RTGS/NEFT/CMS/IMPS):
 * strips the leading statement date, splits on the code separators, and
 * keeps the longest mostly-alphabetic segment — names beat reference codes.
 */
function extractGenericCounterparty(desc: string): string {
  // Leading date: "03/Nov/2 025", "03 Nov 2025", "03-11-2025" (parser
  // line-merges can split the year as "2 025").
  const stripped = desc.replace(
    /^\d{1,2}[\/\s\-](?:[A-Za-z]{3}|\d{1,2})[\/\s\-]\d\s?\d{3}\s*/i,
    ""
  );
  let best = "";
  for (const seg of stripped.split(/[\/\-]/)) {
    const s = seg.trim();
    const letters = (s.match(/[A-Za-z]/g) || []).length;
    const digits = (s.match(/[0-9]/g) || []).length;
    if (
      letters >= 4 &&
      letters > digits * 2 &&
      !/^(rtgs|neft|imps|cms|upi|inf|trf|bil|ach|nach|dd|chq|mmt|ib|mb)\b/i.test(s) &&
      s.length > best.length
    ) {
      best = s;
    }
  }
  return cleanCounterpartyName(best || stripped);
}

function cleanCounterpartyName(name: string): string {
  let cleaned = name.trim();

  // Remove starting dates/refs — numeric ("03-11-2025") and textual
  // ("03 Nov 2025" / parser-split "03 Nov 2 025") forms.
  cleaned = cleaned.replace(/^[0-9\-]{6,}\s+/i, "");
  cleaned = cleaned.replace(/^\d{1,2}\s+[A-Za-z]{3}\s+\d\s?\d{3}\s+/i, "");
  // Drop long reference-number runs anywhere in the name.
  cleaned = cleaned.replace(/\b\d{6,}\b/g, " ");
  
  // Remove ending trash, numbers, codes
  cleaned = cleaned.split("-")[0].trim();
  cleaned = cleaned.split("@")[0].trim(); // UPI handle split
  
  // Replace symbols/dashes
  cleaned = cleaned.replace(/[^A-Za-z\s0-9\.\&]/g, " ").replace(/\s+/g, " ").trim();
  
  // Title case it
  if (cleaned.length > 0) {
    cleaned = cleaned
      .toLowerCase()
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  
  // Cap length
  if (cleaned.length > 25) {
    cleaned = cleaned.slice(0, 25) + "...";
  }
  
  return cleaned || "Unknown";
}
