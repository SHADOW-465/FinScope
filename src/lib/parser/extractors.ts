export interface RawTransaction {
  date: string;
  originalDate?: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  transactionType: "DEBIT" | "CREDIT";
}

export interface ParsedStatement {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  statementPeriod: string;
  openingBalance: number;
  closingBalance: number;
  transactions: RawTransaction[];
}

// Helper to clean numeric strings
function parseAmount(val: string): number {
  if (!val || val.trim() === "-" || val.trim() === "") return 0;
  // Remove commas, spaces, Cr, Dr, etc.
  const cleaned = val.replace(/,/g, "").replace(/[a-zA-Z\s]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Helper to clean dates
function cleanDate(val: string): string {
  const cleaned = val.trim().replace(/\r/g, " ").replace(/\n/g, " ");
  
  // Handlers for YY formats (e.g., "05-01-26")
  let m = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    const year = "20" + m[3];
    return `${year}-${month}-${day}`;
  }

  // 1. DD/MM/YYYY or DD-MM-YYYY
  m = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    const year = m[3];
    return `${year}-${month}-${day}`;
  }

  // 2. DD/MMM/YYYY or DD-MMM-YYYY (e.g. 01/Feb/2026)
  m = cleaned.match(/(\d{1,2})[\/\-]([A-Za-z]{3})[\/\-](\d{4})/);
  if (m) {
    const months: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
    };
    const day = m[1].padStart(2, "0");
    const month = months[m[2].toLowerCase()] || "01";
    const year = m[3];
    return `${year}-${month}-${day}`;
  }

  // Try standard parsing but avoid timezone shift by using local components
  try {
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  } catch (e) {}

  return cleaned;
}

export function parseStatementText(text: string, bankName: string): ParsedStatement {
  const result: ParsedStatement = {
    bankName,
    accountNumber: "Unknown",
    accountHolder: "Unknown",
    statementPeriod: "Unknown",
    openingBalance: 0.0,
    closingBalance: 0.0,
    transactions: []
  };

  const lines = text.split("\n").map(l => l.trim()).filter(l => l !== "");

  if (bankName === "Bank of Baroda") {
    parseBankOfBaroda(lines, result);
  } else if (bankName === "ICICI") {
    parseICICI(lines, result);
  } else if (bankName === "IndusInd Bank") {
    parseIndusInd(lines, result);
  } else if (bankName === "Canara Bank") {
    parseCanaraBank(lines, result);
  } else {
    parseGeneric(lines, result);
  }

  // Post-processing to compute correct opening/closing balance and clean transactions
  if (result.transactions.length > 0) {
    // Guess opening/closing balance from first/last transaction if not explicitly extracted
    if (result.openingBalance === 0.0) {
      const first = result.transactions[0];
      const change = first.credit - first.debit;
      result.openingBalance = first.balance - change;
    }
    if (result.closingBalance === 0.0) {
      result.closingBalance = result.transactions[result.transactions.length - 1].balance;
    }
  }

  return result;
}

/**
 * BANK OF BARODA PARSER
 */
function parseBankOfBaroda(lines: string[], result: ParsedStatement) {
  // Extract Metadata
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("A/C Number") || line.includes("A/C Number")) {
      const parts = line.split(":");
      if (parts.length > 1) {
        result.accountNumber = parts[1].trim().split(" ")[0];
      }
    }
    if (line.includes("A/C Name") || line.includes("Account Name")) {
      const parts = line.split(":");
      if (parts.length > 1) {
        result.accountHolder = parts[1].trim();
      }
    }
    if (line.includes("period of") || line.includes("Statement of account for")) {
      const match = line.match(/(\d{2}-\d{2}-\d{4})\s+to\s+(\d{2}-\d{2}-\d{4})/);
      if (match) {
        result.statementPeriod = `${match[1]} to ${match[2]}`;
      }
    }
  }

  let prevBalance = 0.0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Matches dates in format DD-MM-YY (e.g. 05-01-26) or DD-MM-YYYY (e.g. 05-01-2026)
    const dateMatch = line.match(/^(\d{2}-\d{2}-\d{2,4})/);
    if (dateMatch) {
      const date = cleanDate(dateMatch[1]);
      const tokens = line.split(/\s{2,}/).filter(t => t.trim() !== "");
      
      if (tokens.length >= 3) {
        const balanceStr = tokens[tokens.length - 1];
        const balance = parseAmount(balanceStr);
        
        let amountStr = tokens[tokens.length - 2];
        let description = tokens.slice(1, tokens.length - 2).join(" ");
        let amount = parseAmount(amountStr);

        // Gather description continuation lines
        let j = i + 1;
        const continuation: string[] = [];
        while (j < lines.length) {
          const nextLine = lines[j];
          if (nextLine.match(/^(\d{2}-\d{2}-\d{2,4})/) || nextLine.includes("Page Total:") || nextLine.includes("-----")) {
            break;
          }
          continuation.push(nextLine);
          j++;
        }
        if (continuation.length > 0) {
          description += " " + continuation.join(" ");
        }

        // Determine Debit/Credit via balance change
        let debit = 0;
        let credit = 0;
        let type: "DEBIT" | "CREDIT" = "DEBIT";

        if (prevBalance !== 0.0) {
          const change = balance - prevBalance;
          if (change > 0) {
            credit = amount || change;
            type = "CREDIT";
          } else {
            debit = amount || Math.abs(change);
            type = "DEBIT";
          }
        } else {
          if (balanceStr.toUpperCase().includes("CR")) {
            credit = amount;
            type = "CREDIT";
          } else {
            debit = amount;
            type = "DEBIT";
          }
        }

        result.transactions.push({
          date,
          originalDate: dateMatch[1],
          description,
          debit,
          credit,
          balance,
          transactionType: type
        });
        prevBalance = balance;
      }
    }
  }
}

/**
 * ICICI BANK PARSER (Block-Based Grouping)
 */
/**
 * Helper to preprocess ICICI lines and merge split 4-digit serial numbers
 */
function preprocessICICILines(lines: string[]): string[] {
  const merged: string[] = [];
  let i = 0;
  
  while (i < lines.length) {
    // Check for split 4-digit serial number and Tran ID:
    // e.g. lines[i] = "100" (3 digits), lines[i+1] = "0" (1 digit), lines[i+2] = "S8831", lines[i+3] = "5596"
    if (i + 3 < lines.length &&
        /^\d{3}$/.test(lines[i]) &&
        /^\d$/.test(lines[i + 1]) &&
        /^[A-Z]\d+$/.test(lines[i + 2]) &&
        /^\d+$/.test(lines[i + 3])) {
      
      const mergedLine = lines[i] + lines[i+1] + lines[i+2] + lines[i+3];
      merged.push(mergedLine);
      i += 4;
      continue;
    }
    
    // Check if only the serial number is split but Tran ID is not (or is not 2 parts):
    // e.g. lines[i] = "100", lines[i+1] = "0", lines[i+2] = "S8831"
    if (i + 2 < lines.length &&
        /^\d{3}$/.test(lines[i]) &&
        /^\d$/.test(lines[i + 1]) &&
        /^[A-Z]\d+$/.test(lines[i + 2])) {
      
      const mergedLine = lines[i] + lines[i+1] + lines[i+2];
      merged.push(mergedLine);
      i += 3;
      continue;
    }
    
    merged.push(lines[i]);
    i++;
  }
  
  return merged;
}

/**
 * ICICI BANK PARSER (Block-Based Grouping)
 */
function parseICICI(rawLines: string[], result: ParsedStatement) {
  // Extract Metadata
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (line.includes("A/C No") || line.includes("Account Number")) {
      const match = line.match(/(?:A\/C No|Account Number):\s*(\d+)/i);
      if (match) {
        result.accountNumber = match[1];
      }
    }
    if (line.startsWith("Name:") || line.includes("Name:")) {
      const namePart = line.replace("Name:", "").trim();
      const acIndex = namePart.indexOf("A/C");
      const branchIndex = namePart.indexOf("Branch");
      let cleanName = namePart;
      if (acIndex !== -1) {
        cleanName = namePart.substring(0, acIndex).trim();
      } else if (branchIndex !== -1) {
        cleanName = namePart.substring(0, branchIndex).trim();
      }
      result.accountHolder = cleanName.replace(/[\/\-:\\]+$/, "").trim();
    }
    if (line.includes("Transaction Period:")) {
      result.statementPeriod = line.replace("Transaction Period:", "").trim();
    }
  }

  // Preprocess lines to merge split serial numbers and Tran IDs
  const lines = preprocessICICILines(rawLines);

  const blocks: string[][] = [];
  let currentBlock: string[] | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match serial numbers and Tran IDs concatenated e.g. "1S2327" or "20M3423"
    const startMatch = line.match(/^(\d+)([A-Z]\d+)$/);
    
    if (startMatch) {
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = [line];
    } else if (currentBlock) {
      if (line.includes("Page ") || line.includes("Statement Summary") || line.includes("Detailed Statement")) {
        blocks.push(currentBlock);
        currentBlock = null;
      } else {
        currentBlock.push(line);
      }
    }
  }
  if (currentBlock) blocks.push(currentBlock);

  let prevBalance = 0.0;
  let hasPrevBalance = false;

  blocks.forEach(block => {
    if (block.length < 2) return;
    
    const firstLine = block[0];
    const startMatch = firstLine.match(/^(\d+)([A-Z]\d+)$/);
    if (!startMatch) return;
    
    let tranId = startMatch[2];
    
    let nextIndex = 1;
    if (block[1] && block[1].match(/^\d+$/)) {
      tranId += " " + block[1];
      nextIndex = 2;
    }
    
    // Process wrapped decimals, indicators, and negative signs at the end of the block
    let workingLines = block.slice(nextIndex).map(l => l.trim());
    let j = workingLines.length - 1;
    while (j >= 0) {
      const current = workingLines[j];
      // 1. Check if current line is a wrapped decimal (.XX) or a wrapped indicator (Cr/Dr)
      // or if it's the decimal digits after a dot that is at the end of the previous line
      if (j > 0 && (current.match(/^\.\d{2}(Cr|Dr)?$/i) || 
          current.match(/^(Cr|Dr)$/i) ||
          (current.match(/^\d{2}(Cr|Dr)?$/i) && workingLines[j - 1].endsWith(".")))) {
        workingLines[j - 1] = workingLines[j - 1] + current;
        workingLines.splice(j, 1);
      }
      // 2. Check if previous line is a minus sign and current line is a valid number
      else if (j > 0 && workingLines[j - 1] === "-" && current.match(/^[\d,\.\-]+(Cr|Dr)?$/i)) {
        workingLines[j - 1] = "-" + current;
        workingLines.splice(j, 1);
      }
      // 3. Check if current line ends with a minus sign (concatenated with amount)
      else if (current.endsWith("-") && current.slice(0, -1).match(/^[\d,\.\s]+$/) && j + 1 < workingLines.length) {
        workingLines[j] = current.slice(0, -1).trim();
        workingLines[j + 1] = "-" + workingLines[j + 1];
      }
      j--;
    }
    
    if (workingLines.length === 0) return;
    
    let parsedAmountAndBal: { amount: number; balance: number; indicator: string; descPrefix: string; descCount: number } | null = null;
    const lastLine = workingLines[workingLines.length - 1];
    
    // Case A: Last line matches the concatenated amount+balance e.g. "DD CANCELLED100.0015,00,871.75"
    let amountBalMatch = lastLine.match(/([\d,]+\.\d{2})([\d,\-]+\.\d{2})(Cr|Dr)?$/i);
    if (amountBalMatch) {
      const matchStr = amountBalMatch[0];
      const matchIndex = lastLine.lastIndexOf(matchStr);
      const prefix = lastLine.substring(0, matchIndex).trim();
      parsedAmountAndBal = {
        amount: parseAmount(amountBalMatch[1]),
        balance: parseAmount(amountBalMatch[2]),
        indicator: amountBalMatch[3] || "",
        descPrefix: prefix,
        descCount: workingLines.length - 1
      };
    } else if (workingLines.length >= 2) {
      // Case B: Last two lines are separate: [amount, balance]
      const secondLastLine = workingLines[workingLines.length - 2];
      const amountMatch = secondLastLine.match(/([\d,]+\.\d{2})(Cr|Dr)?$/i);
      const balanceMatch = lastLine.match(/([\d,\-]+\.\d{2})(Cr|Dr)?$/i);
      
      if (amountMatch && balanceMatch) {
        const amountStr = amountMatch[0];
        const balanceStr = balanceMatch[0];
        const amountPrefix = secondLastLine.substring(0, secondLastLine.lastIndexOf(amountStr)).trim();
        const balancePrefix = lastLine.substring(0, lastLine.lastIndexOf(balanceStr)).trim();
        
        parsedAmountAndBal = {
          amount: parseAmount(amountMatch[1]),
          balance: parseAmount(balanceMatch[1]),
          indicator: lastLine.match(/(Cr|Dr)$/i)?.[0] || "",
          descPrefix: (amountPrefix + " " + balancePrefix).trim(),
          descCount: workingLines.length - 2
        };
      }
    }
    
    if (!parsedAmountAndBal) return;
    
    const { amount, balance, indicator, descPrefix, descCount } = parsedAmountAndBal;
    
    let date = "2026-02-01";
    let originalDate = "";
    const remarks: string[] = [];
    
    for (let k = 0; k < descCount; k++) {
      const bLine = workingLines[k];
      
      const dateMatch = bLine.match(/(\d{1,2}\/[A-Za-z]{3}\/\d{2,4})|(\d{1,2}\/\d{2}\/\d{4})/g);
      if (dateMatch && dateMatch.length > 0) {
        date = cleanDate(dateMatch[0]);
        originalDate = dateMatch[0];
        continue;
      }
      
      if (bLine.match(/\d{2}:\d{2}:\d{2}/)) {
        continue;
      }
      
      remarks.push(bLine);
    }
    
    if (descPrefix) {
      remarks.push(descPrefix);
    }
    
    const description = remarks.join(" ");
    
    let debit = 0;
    let credit = 0;
    let type: "DEBIT" | "CREDIT" = "DEBIT";
    
    if (hasPrevBalance) {
      const change = balance - prevBalance;
      if (change > 0.01) {
        credit = amount || change;
        type = "CREDIT";
      } else {
        debit = amount || Math.abs(change);
        type = "DEBIT";
      }
    } else {
      if (indicator.toUpperCase() === "CR") {
        credit = amount;
        type = "CREDIT";
      } else if (indicator.toUpperCase() === "DR") {
        debit = amount;
        type = "DEBIT";
      } else {
        const descLower = description.toLowerCase();
        if (descLower.includes("dep") || descLower.includes("refund") || descLower.includes("credit")) {
          credit = amount;
          type = "CREDIT";
        } else {
          debit = amount;
          type = "DEBIT";
        }
      }
    }
    
    result.transactions.push({
      date,
      originalDate: originalDate || date,
      description,
      debit,
      credit,
      balance,
      transactionType: type
    });
    
    prevBalance = balance;
    hasPrevBalance = true;
  });
}

/**
 * INDUSIND BANK PARSER
 */
function parseIndusInd(lines: string[], result: ParsedStatement) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("Account No.") || line.includes("Account No")) {
      const match = line.match(/Account No\.\s*:\s*(\d+)/i);
      if (match) {
        result.accountNumber = match[1];
      }
    }
    if (line.startsWith("From :")) {
      const toLine = lines[i + 1] || "";
      result.statementPeriod = `${line.trim()} ${toLine.trim()}`;
    }
  }

  // Extract account holder name from Page 1 address block near Page 2
  let page2Index = -1;
  for (let j = 0; j < lines.length; j++) {
    if (lines[j].includes("Page 2 of")) {
      page2Index = j;
      break;
    }
  }
  if (page2Index !== -1) {
    let indiaIndex = -1;
    for (let j = page2Index - 1; j >= Math.max(0, page2Index - 10); j--) {
      if (lines[j] === "INDIA" || lines[j].includes("INDIA") || /^\d{6}$/.test(lines[j])) {
        indiaIndex = j;
        break;
      }
    }
    if (indiaIndex !== -1) {
      // Find the last numeric balance line before the address block
      let nameIndex = -1;
      for (let j = indiaIndex - 1; j >= 0; j--) {
        if (/^[\d,\-]+\.\d{2}$/.test(lines[j])) {
          nameIndex = j + 1;
          break;
        }
      }
      if (nameIndex !== -1 && nameIndex < indiaIndex) {
        result.accountHolder = lines[nameIndex].trim();
      }
    }
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const dateMatch = line.match(/^(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/);
    if (dateMatch) {
      const date = cleanDate(dateMatch[1]);
      let typeLine = lines[i + 1] || "";
      
      let j = i + 2;
      const subLines: string[] = [];
      while (j < lines.length) {
        const checkLine = lines[j];
        if (checkLine.match(/^(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/) || checkLine.includes("Page ") || checkLine.includes("Account Statement")) {
          break;
        }
        subLines.push(checkLine);
        j++;
      }
      
      let debitVal = 0;
      let creditVal = 0;
      let balanceVal = 0;
      let description = "";
      let foundValues = false;

      // Scan subLines for the 3 consecutive lines representing debit, credit, balance
      for (let k = 0; k < subLines.length - 2; k++) {
        const line1 = subLines[k].trim();
        const line2 = subLines[k+1].trim();
        const line3 = subLines[k+2].trim();

        const isLine3Bal = /^[\d,\-]+\.\d{2}$/.test(line3);
        const isLine2Cr = /^[\d,]+\.\d{2}$/.test(line2) || line2 === "-";
        const isLine1Dr = /^[\d,]+\.\d{2}$/.test(line1) || line1 === "-";

        if (isLine3Bal && isLine2Cr && isLine1Dr && !(line1 === "-" && line2 === "-")) {
          debitVal = parseAmount(line1);
          creditVal = parseAmount(line2);
          balanceVal = parseAmount(line3);
          
          const beforeDesc = subLines.slice(0, k);
          const afterDesc = subLines.slice(k + 3);
          description = [...beforeDesc, ...afterDesc].join(" ");
          
          foundValues = true;
          break;
        }
      }

      // Fallback if the pattern scan failed
      if (!foundValues && subLines.length >= 3) {
        balanceVal = parseAmount(subLines[subLines.length - 1]);
        creditVal = parseAmount(subLines[subLines.length - 2]);
        debitVal = parseAmount(subLines[subLines.length - 3]);
        description = subLines.slice(0, subLines.length - 3).join(" ");
      }

      if (foundValues || subLines.length >= 3) {
        let finalDebit = debitVal;
        let finalCredit = creditVal;
        let transType: "DEBIT" | "CREDIT" = typeLine.toLowerCase().includes("credit") ? "CREDIT" : "DEBIT";
        
        if (transType === "CREDIT" && finalCredit === 0 && finalDebit > 0) {
          finalCredit = finalDebit;
          finalDebit = 0;
        } else if (transType === "DEBIT" && finalDebit === 0 && finalCredit > 0) {
          finalDebit = finalCredit;
          finalCredit = 0;
        }
        
        result.transactions.push({
          date,
          originalDate: dateMatch[1],
          description: `${typeLine} - ${description}`,
          debit: finalDebit,
          credit: finalCredit,
          balance: balanceVal,
          transactionType: transType
        });
      }
      i = j - 1;
    }
    i++;
  }
}

/**
 * CANARA BANK PARSER (Concatenated Lines & Description Matching)
 */
function parseCanaraBank(lines: string[], result: ParsedStatement) {
  // Helper to format numbers in Indian currency format for reference resolution
  function formatIndian(num: number): string {
    const str = num.toFixed(2);
    const parts = str.split(".");
    let intPart = parts[0];
    const decPart = parts[1];
    
    let lastThree = intPart.substring(intPart.length - 3);
    const otherParts = intPart.substring(0, intPart.length - 3);
    if (otherParts !== '') {
      lastThree = ',' + lastThree;
    }
    const res = otherParts.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree + "." + decPart;
    return res;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("Account Number")) {
      const remaining = line.replace("Account Number", "").trim();
      if (remaining.length > 0) {
        result.accountNumber = remaining;
      } else {
        const match = lines[i + 1] || "";
        result.accountNumber = match.trim();
      }
    }
    if (line.includes("Account Holders Name")) {
      const remaining = line.replace("Account Holders Name", "").trim();
      if (remaining.length > 0) {
        result.accountHolder = remaining;
      } else {
        const match = lines[i + 1] || "";
        result.accountHolder = match.trim();
      }
    }
    if (line.includes("Opening Balance")) {
      result.openingBalance = parseAmount(line.replace("Opening Balance", "").replace(/Rs\.?/i, "").trim());
    }
    if (line.includes("Closing Balance")) {
      result.closingBalance = parseAmount(line.replace("Closing Balance", "").replace(/Rs\.?/i, "").trim());
    }
    if (line.startsWith("From ") || line.includes("Searched ByFrom")) {
      result.statementPeriod = line.replace("Searched By", "").trim();
    }
  }

  // Split lines by page to restrict correlation within pages
  interface PageLine {
    lineNum: number;
    line: string;
  }

  const pages: PageLine[][] = [];
  let currentPageLines: PageLine[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    currentPageLines.push({ lineNum: i + 1, line });
    if (line.includes("Page ") && line.includes(" of ")) {
      pages.push(currentPageLines);
      currentPageLines = [];
    }
  }
  if (currentPageLines.length > 0) {
    pages.push(currentPageLines);
  }

  const allTransactions: RawTransaction[] = [];
  let prevBalance = result.openingBalance || 82000.00; // Canara bank opening balance fallback
  let hasPrevBalance = true;

  pages.forEach((pageLines) => {
    interface PageTx {
      lineNum: number;
      date: string;
      originalDate?: string;
      valueDate: string;
      ref: string;
      amount: number;
      balance: number;
      type: "DEBIT" | "CREDIT";
      inlineDesc: string;
      description: string;
      matchedByRef: boolean;
    }

    const pageTxns: PageTx[] = [];
    
    interface PageDesc {
      lineNum: number;
      line: string;
      matched: boolean;
    }
    const pageDescLines: PageDesc[] = [];

    // Parse transactions and collect descriptions
    for (let i = 0; i < pageLines.length; i++) {
      const { lineNum, line } = pageLines[i];
      const prefixMatch = line.match(/^(\d{2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{2}:\d{2}:\d{2})\s*(\d{2}\s+[A-Za-z]{3}\s+\d{4})\s*/);
      
      if (prefixMatch) {
        const dateRaw = prefixMatch[1];
        const valueDate = prefixMatch[2];
        const remaining = line.substring(prefixMatch[0].length).trim();
        
        const numbersMatch = remaining.match(/^([\d,.\-]+)/);
        if (numbersMatch) {
          let numbersStr = numbersMatch[1];
          if (/,(\d{2})$/.test(numbersStr)) {
            numbersStr = numbersStr.replace(/,(\d{2})$/, ".$1");
          }
          
          const dots: number[] = [];
          let idx = numbersStr.indexOf(".");
          while (idx !== -1) {
            dots.push(idx);
            idx = numbersStr.indexOf(".", idx + 1);
          }
          
          if (dots.length >= 2) {
            const dot1 = dots[dots.length - 2];
            const balanceStr = numbersStr.substring(dot1 + 3);
            const amountAndRef = numbersStr.substring(0, dot1 + 3);
            
            const balance = parseFloat(balanceStr.replace(/,/g, ""));
            const amountMatch = amountAndRef.match(/((?:\d{1,2},)*\d{3}\.\d{2}|\d{1,3}\.\d{2})$/);
            if (amountMatch) {
              const amountStr = amountMatch[1];
              let amount = parseFloat(amountStr.replace(/,/g, ""));
              let type: "DEBIT" | "CREDIT" = "DEBIT";
              
              if (hasPrevBalance) {
                amount = Math.abs(balance - prevBalance);
                type = balance > prevBalance ? "CREDIT" : "DEBIT";
              } else {
                amount = parseFloat(amountStr.replace(/,/g, ""));
                type = "CREDIT";
              }
              
              const amtCommas = formatIndian(amount);
              const amtPlain = amount.toFixed(2);
              
              let ref = "";
              if (amountAndRef.endsWith(amtCommas)) {
                ref = amountAndRef.substring(0, amountAndRef.length - amtCommas.length).trim();
              } else if (amountAndRef.endsWith(amtPlain)) {
                ref = amountAndRef.substring(0, amountAndRef.length - amtPlain.length).trim();
              } else {
                ref = amountAndRef.substring(0, amountAndRef.length - amountStr.length).trim();
              }
              
              const inlineDesc = remaining.substring(numbersStr.length).trim();
              const date = cleanDate(dateRaw);
              
              pageTxns.push({
                lineNum,
                date,
                originalDate: valueDate || dateRaw.split(" ")[0],
                valueDate,
                ref,
                amount,
                balance,
                type,
                inlineDesc,
                description: inlineDesc || `Transaction - Ref ${ref}`,
                matchedByRef: false
              });
              
              prevBalance = balance;
              hasPrevBalance = true;
            }
          }
        }
      } else {
        const lower = line.toLowerCase();
        if (
          line !== "" &&
          !line.includes("Page ") &&
          !line.includes("Account Number") &&
          !line.includes("IFSC") &&
          !line.includes("Balance") &&
          !lower.includes("canara bank") &&
          !lower.includes("statement of account") &&
          !lower.includes("opening balance") &&
          !lower.includes("closing balance") &&
          !lower.includes("particulars")
        ) {
          pageDescLines.push({ lineNum, line, matched: false });
        }
      }
    }

    // Correlate page descriptions with page transactions
    // 1. Reference Match (exact or slice of length 12 if ref ends with bank padding like '33')
    pageTxns.forEach(tx => {
      if (tx.ref && tx.ref.length >= 6) {
        // Canara Bank appends "33" to transaction-line UPI references of length 14 (ending with 33)
        // Description block uses the clean 12-digit reference.
        let cleanRef = tx.ref;
        if (tx.ref.length === 14 && tx.ref.endsWith("33")) {
          cleanRef = tx.ref.substring(0, 12);
        }
        for (let k = 0; k < pageDescLines.length; k++) {
          const desc = pageDescLines[k];
          if (!desc.matched && (desc.line.includes(tx.ref) || desc.line.includes(cleanRef))) {
            let fullDesc = desc.line;
            desc.matched = true;
            
            // Combine adjacent lines
            let prev = k - 1;
            while (prev >= 0 && !pageDescLines[prev].matched && pageDescLines[prev].lineNum >= desc.lineNum - 2) {
              fullDesc = pageDescLines[prev].line + " " + fullDesc;
              pageDescLines[prev].matched = true;
              prev--;
            }
            let next = k + 1;
            while (next < pageDescLines.length && !pageDescLines[next].matched && pageDescLines[next].lineNum <= desc.lineNum + 2) {
              fullDesc = fullDesc + " " + pageDescLines[next].line;
              pageDescLines[next].matched = true;
              next++;
            }
            
            tx.description = (tx.inlineDesc ? tx.inlineDesc + " " : "") + fullDesc;
            tx.matchedByRef = true;
            break;
          }
        }
      }
    });

    // 2. Cheque Return / Bounce Fallback Match (recognizing padded cheque numbers)
    pageTxns.forEach(tx => {
      if (!tx.matchedByRef) {
        const refNum = parseInt(tx.ref, 10);
        const isCheque = /^\d+$/.test(tx.ref) && refNum <= 999999 && refNum > 0;
        const isBounce = tx.type === "DEBIT" && (isCheque || tx.amount === 300);
        
        if (isBounce) {
          for (let k = 0; k < pageDescLines.length; k++) {
            const desc = pageDescLines[k];
            const lower = desc.line.toLowerCase();
            const hasBounceKeyword = lower.includes("return") || lower.includes("rtn") || lower.includes("insufficient") || lower.includes("differs") || lower.includes("dishonor");
            
            if (!desc.matched && hasBounceKeyword) {
              let fullDesc = desc.line;
              desc.matched = true;
              
              let nextIdx = k + 1;
              while (nextIdx < pageDescLines.length && !pageDescLines[nextIdx].matched && pageDescLines[nextIdx].lineNum <= desc.lineNum + 3) {
                fullDesc += " " + pageDescLines[nextIdx].line;
                pageDescLines[nextIdx].matched = true;
                nextIdx++;
              }
              
              tx.description = (tx.inlineDesc ? tx.inlineDesc + " " : "") + fullDesc;
              tx.matchedByRef = true;
              break;
            }
          }
        }
      }
    });

    // 3. General Fallback Match in Relative Order
    const unmatchedTxns = pageTxns.filter(tx => !tx.matchedByRef);
    const unmatchedDescs = pageDescLines.filter(desc => !desc.matched);
    
    unmatchedTxns.forEach((tx, txIdx) => {
      if (txIdx < unmatchedDescs.length) {
        const desc = unmatchedDescs[txIdx];
        let fullDesc = desc.line;
        desc.matched = true;
        
        let nextIdx = pageDescLines.indexOf(desc) + 1;
        let added = 0;
        while (nextIdx < pageDescLines.length && !pageDescLines[nextIdx].matched && added < 2) {
          fullDesc += " " + pageDescLines[nextIdx].line;
          pageDescLines[nextIdx].matched = true;
          added++;
          nextIdx++;
        }
        
        tx.description = (tx.inlineDesc ? tx.inlineDesc + " " : "") + fullDesc;
        tx.matchedByRef = true;
      }
    });

    // Convert to RawTransaction format
    pageTxns.forEach(tx => {
      allTransactions.push({
        date: tx.date,
        originalDate: tx.originalDate,
        description: tx.description,
        debit: tx.type === "DEBIT" ? tx.amount : 0,
        credit: tx.type === "CREDIT" ? tx.amount : 0,
        balance: tx.balance,
        transactionType: tx.type
      });
    });
  });

  result.transactions = allTransactions;
}

/**
 * GENERIC FALLBACK PARSER
 */
function parseGeneric(lines: string[], result: ParsedStatement) {
  let prevBalance = 0.0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for date at the start
    const dateMatch = line.match(/^(\d{1,2}[\/\-\s][A-Za-z0-9]{2,3}[\/\-\s]\d{2,4})/);
    if (dateMatch) {
      const date = cleanDate(dateMatch[1]);
      const tokens = line.split(/\s{2,}/).filter(t => t.trim() !== "");
      const numberMatches = line.match(/[\d,]+\.\d{2}/g);
      
      if (numberMatches && numberMatches.length >= 1) {
        const balance = parseAmount(numberMatches[numberMatches.length - 1]);
        let amount = numberMatches.length >= 2 ? parseAmount(numberMatches[numberMatches.length - 2]) : 0;
        
        let description = tokens.slice(1, tokens.length - (numberMatches.length >= 2 ? 2 : 1)).join(" ");
        if (!description && tokens.length > 2) {
          description = tokens[1];
        }
        
        let debit = 0;
        let credit = 0;
        let type: "DEBIT" | "CREDIT" = "DEBIT";
        
        if (prevBalance !== 0.0) {
          const change = balance - prevBalance;
          if (change > 0) {
            credit = amount || change;
            type = "CREDIT";
          } else {
            debit = amount || Math.abs(change);
            type = "DEBIT";
          }
        } else {
          const descLower = description.toLowerCase();
          if (descLower.includes("credit") || descLower.includes("dep") || descLower.includes("upi/cr") || descLower.includes("salary")) {
            credit = amount;
            type = "CREDIT";
          } else {
            debit = amount;
            type = "DEBIT";
          }
        }
        
        result.transactions.push({
          date,
          originalDate: dateMatch[1],
          description: description || "Transaction",
          debit,
          credit,
          balance,
          transactionType: type
        });
        
        prevBalance = balance;
      }
    }
  }
}
