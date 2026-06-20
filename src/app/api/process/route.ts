import { NextRequest, NextResponse } from "next/server";
import pdf from "pdf-parse";
import { detectBank } from "@/lib/parser/detector";
import { parseStatementText, RawTransaction } from "@/lib/parser/extractors";
import { classifyTransactions } from "@/lib/engine/classifier";
import { computeRiskProfile } from "@/lib/engine/risk";

// Safe ESM/CJS interop for pdf-parse
const pdfParser = typeof pdf === "function" ? pdf : (pdf as any).default || require("pdf-parse");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const password = formData.get("password") as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files uploaded" },
        { status: 400 }
      );
    }

    const groups = new Map<string, any>();

    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Configure pdf-parse options (including password support if needed)
      const options: any = {};
      if (password) {
        options.ownerPassword = password;
        options.userPassword = password;
      }

      let pdfData;
      try {
        pdfData = await pdfParser(buffer, options);
      } catch (err: any) {
        console.error(`Error parsing PDF ${file.name}:`, err);
        return NextResponse.json(
          { error: `Failed to decrypt/parse PDF ${file.name}. Please check the password.` },
          { status: 422 }
        );
      }

      const extractedText = pdfData.text;
      if (!extractedText || extractedText.trim().length === 0) {
        return NextResponse.json(
          { error: `No readable text found in PDF ${file.name}. The file might be scanned or empty.` },
          { status: 422 }
        );
      }

      // Detect Bank
      const bankName = detectBank(extractedText);

      // Parse text to extract transactions & metadata
      const parsedData = parseStatementText(extractedText, bankName);
      
      // Determine unique group key for this account
      let groupKey = `${bankName}_${parsedData.accountNumber}`;
      if (parsedData.accountNumber === "Unknown") {
        groupKey = `${bankName}_${parsedData.accountHolder}`;
      }
      if (parsedData.accountNumber === "Unknown" && parsedData.accountHolder === "Unknown") {
        groupKey = `Unknown_File_${idx}`;
      }
      groupKey = groupKey.replace(/[^a-zA-Z0-9_]/g, "_");

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          id: groupKey,
          bankName: bankName,
          accountNumber: parsedData.accountNumber,
          accountHolder: parsedData.accountHolder,
          statementPeriod: parsedData.statementPeriod,
          openingBalance: parsedData.openingBalance || 0,
          closingBalance: parsedData.closingBalance || 0,
          files: []
        });
      }

      groups.get(groupKey).files.push({
        name: file.name,
        index: idx,
        parsed: parsedData
      });
    }

    const reports: Record<string, any> = {};
    const accountsList: any[] = [];

    for (const [key, group] of groups.entries()) {
      const allTxns: RawTransaction[] = [];
      
      // Merge transactions from files in this group
      group.files.forEach((fObj: any, fIdx: number) => {
        const txnsWithOrigin = fObj.parsed.transactions.map((tx: any, tIdx: number) => ({
          ...tx,
          fileOrigin: fObj.name,
          fileIndex: fIdx,
          txnIndex: tIdx
        }));
        allTxns.push(...txnsWithOrigin);
      });

      if (allTxns.length === 0) continue;

      // Stable sort transactions chronologically by date, then fileIndex, then txnIndex
      allTxns.sort((a: any, b: any) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        
        const fileCompare = a.fileIndex - b.fileIndex;
        if (fileCompare !== 0) return fileCompare;
        
        return a.txnIndex - b.txnIndex;
      });

      // Deduce overall metadata for this group
      let groupAccountNumber = "Unknown";
      let groupAccountHolder = "Unknown";
      for (const fObj of group.files) {
        if (fObj.parsed.accountNumber !== "Unknown") {
          groupAccountNumber = fObj.parsed.accountNumber;
          break;
        }
      }
      for (const fObj of group.files) {
        if (fObj.parsed.accountHolder !== "Unknown") {
          groupAccountHolder = fObj.parsed.accountHolder;
          break;
        }
      }
      if (groupAccountNumber === "Unknown") groupAccountNumber = group.accountNumber;
      if (groupAccountHolder === "Unknown") groupAccountHolder = group.accountHolder;

      // Opening balance of the first transaction (in chronological order)
      const firstTx = allTxns[0];
      const change = firstTx.credit - firstTx.debit;
      const groupOpeningBalance = firstTx.balance - change;

      // Closing balance of the last transaction
      const groupClosingBalance = allTxns[allTxns.length - 1].balance;

      // Statement period
      const groupStatementPeriod = `${allTxns[0].date} to ${allTxns[allTxns.length - 1].date}`;

      // Classify transactions
      const classifiedTransactions = classifyTransactions(allTxns);

      // Compute Underwriting Score and Risk Profile for this group
      const riskProfile = computeRiskProfile(
        classifiedTransactions,
        groupOpeningBalance,
        groupClosingBalance,
        groupAccountNumber,
        groupAccountHolder,
        group.bankName,
        groupStatementPeriod
      );

      reports[key] = {
        overview: riskProfile.overview,
        metrics: riskProfile.metrics,
        risk_score: riskProfile.risk_score,
        transactions: classifiedTransactions,
        monthly_analysis: riskProfile.monthly_analysis,
        income_analysis: riskProfile.income_analysis,
        liability_analysis: riskProfile.liability_analysis,
        bounce_analysis: riskProfile.bounce_analysis,
        balance_risks: riskProfile.balance_risks
      };

      accountsList.push({
        id: key,
        accountNumber: groupAccountNumber,
        accountHolder: groupAccountHolder,
        bankName: group.bankName,
        statementPeriod: groupStatementPeriod,
        transactionsCount: classifiedTransactions.length
      });
    }

    if (accountsList.length === 0) {
      return NextResponse.json(
        { error: "No transactions could be extracted from the uploaded statements. Please verify they are valid commercial statements." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      accounts: accountsList,
      reports: reports
    });

  } catch (error: any) {
    console.error("Statement processing crashed:", error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message || error}` },
      { status: 500 }
    );
  }
}
export const maxDuration = 30; // Set Vercel execution duration to max 30s for this function
export const dynamic = "force-dynamic";

