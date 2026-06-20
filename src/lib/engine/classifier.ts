import { RawTransaction } from "../parser/extractors";

export interface ClassifiedTransaction extends RawTransaction {
  category: string;
  counterparty: string;
  confidenceScore: number;
}

export function classifyTransactions(rawTxns: RawTransaction[]): ClassifiedTransaction[] {
  return rawTxns.map(txn => {
    const desc = txn.description;
    const descLower = desc.toLowerCase();
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
      // Usually parts[1] is the user-visible name, parts[2] is UPI ID, or vice versa
      if (parts.length > 1) {
        let rawName = parts[1].trim();
        // If it's a code, try parts[2]
        if (rawName.match(/^\d+$/) && parts.length > 2) {
          rawName = parts[2].trim();
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
      // Generic parsing
      // Remove numbers, dates, references
      counterparty = cleanCounterpartyName(desc);
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
        descLower.includes("cash deposit") || 
        descLower.includes("cash dep") || 
        descLower.includes("self dep")
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
        descLower.includes("emi") || 
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

function cleanCounterpartyName(name: string): string {
  let cleaned = name.trim();
  
  // Remove starting dates/refs
  cleaned = cleaned.replace(/^[0-9\-]{6,}\s+/i, "");
  
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
