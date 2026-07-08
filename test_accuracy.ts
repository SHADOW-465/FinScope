import fs from "fs";
import pdf from "pdf-parse";
import { detectBank } from "./src/lib/parser/detector";
import { parseStatementText, spatialPageRender } from "./src/lib/parser/extractors";

const pdfParser = typeof pdf === "function" ? pdf : (pdf as any).default || require("pdf-parse");

async function checkAccuracy() {
  const refDir = "c:\\Users\\acer\\Downloads\\reference";
  if (!fs.existsSync(refDir)) {
    console.error(`Reference directory not found: ${refDir}`);
    return;
  }

  const files = fs.readdirSync(refDir).filter(f => f.toLowerCase().endsWith(".pdf"));

  for (const filename of files) {
    const filePath = `${refDir}\\${filename}`;
    console.log(`\n====================================================`);
    console.log(`VALIDATING DOUBLE-ENTRY LEDGER FOR: ${filename}`);
    console.log(`====================================================`);

    try {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParser(dataBuffer);
      
      const bankName = detectBank(pdfData.text);
      console.log(`Detected Bank: ${bankName}`);
      
      let textToParse = pdfData.text;
      if (bankName === "HDFC") {
        const spatialData = await pdfParser(dataBuffer, { pagerender: spatialPageRender });
        textToParse = spatialData.text;
      }
      
      const parsed = parseStatementText(textToParse, bankName);

      console.log(`Total Extracted Transactions: ${parsed.transactions.length}`);
      console.log(`Expected Statement Opening Balance: ${parsed.openingBalance}`);
      console.log(`Expected Statement Closing Balance: ${parsed.closingBalance}`);

      let prevBalance = parsed.openingBalance;
      let errorsCount = 0;

      for (let i = 0; i < parsed.transactions.length; i++) {
        const tx = parsed.transactions[i];
        
        // Calculate expected balance
        const expectedBalance = prevBalance + tx.credit - tx.debit;
        const diff = Math.abs(expectedBalance - tx.balance);

        // Check if there is a math discrepancy (tolerance of 0.05 for rounding)
        if (diff > 0.05) {
          errorsCount++;
          if (errorsCount <= 5) {
            console.warn(`  [MISMATCH] Row ${i+1}: Date: ${tx.date} | Desc: ${tx.description.slice(0, 30)}`);
            console.warn(`    Prev Bal: ${prevBalance.toFixed(2)} | Dr: ${tx.debit} | Cr: ${tx.credit} | Got Bal: ${tx.balance.toFixed(2)} | Expected: ${expectedBalance.toFixed(2)} | Diff: ${diff.toFixed(2)}`);
          }
        }
        prevBalance = tx.balance;
      }

      if (errorsCount === 0) {
        console.log(`  [SUCCESS] 100% Ledger Consistency! Previous balance + Credits - Debits matches current balance for every transaction.`);
      } else {
        console.error(`  [FAILURE] Found ${errorsCount} discrepancies in the transaction history.`);
      }
    } catch (e: any) {
      console.error(`  [CRASH] Accuracy check failed:`, e.message || e);
    }
  }
}

checkAccuracy();
