import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { overview, metrics, risk_score, transactions, income_analysis, liability_analysis, bounce_analysis } = data;

    if (!overview || !transactions) {
      return NextResponse.json(
        { error: "Invalid data payload. Summary and transactions are required." },
        { status: 400 }
      );
    }

    // 1. Initialize Workbook
    const wb = XLSX.utils.book_new();

    // 2. Sheet 1: Executive Underwriting Summary
    const summaryRows = [
      ["FINSCOPE UNDERWRITING REPORT - SUMMARY", ""],
      ["Generated Date", new Date().toLocaleDateString("en-IN")],
      [],
      ["ACCOUNT OVERVIEW", ""],
      ["Account Holder Name", overview.accountHolder || "Unknown"],
      ["Bank Name", overview.bankName || "Unknown"],
      ["Account Number", overview.accountNumber || "Unknown"],
      ["Statement Period", overview.statementPeriod || "Unknown"],
      ["Opening Balance", overview.openingBalance || 0],
      ["Closing Balance", overview.closingBalance || 0],
      ["Duration (Months)", overview.durationMonths || 1],
      [],
      ["CREDIT RISK PROFILE", ""],
      ["Underwriting Score (0-100)", risk_score.score || 0],
      ["Assigned Risk Level", risk_score.risk_level || "Unknown"],
      ["Average Monthly Balance", overview.averageBalance || 0],
      ["Net Cash Flow", metrics.net_cash_flow || 0],
      ["Income Stability Index", `${metrics.income_stability || 0}%`],
      ["Debt Service Ratio (EMI Burden)", `${metrics.emi_burden || 0}%`],
      ["Expense Ratio", `${metrics.expense_ratio || 0}%`],
      ["Cash Retention Ratio", `${metrics.cash_retention || 0}%`],
      [],
      ["RISK METRICS BREAKDOWN", ""],
      ["Income Stability Score (20% weight)", risk_score.breakdown?.["Income Stability"] || 0],
      ["Average Balance Score (15% weight)", risk_score.breakdown?.["Average Balance"] || 0],
      ["Cheque Bounce Score (20% weight)", risk_score.breakdown?.["Cheque Bounces"] || 0],
      ["Debt Burden Score (20% weight)", risk_score.breakdown?.["Debt Burden (EMIs)"] || 0],
      ["Cash Flow Consistency Score (15% weight)", risk_score.breakdown?.["Cash Flow Consistency"] || 0],
      ["Negative Balance Avoidance (10% weight)", risk_score.breakdown?.["Negative Balance Avoidance"] || 0]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Executive Summary");

    // 3. Sheet 2: All Transactions
    const txnHeaders = ["Date", "Description", "Debit (Withdrawal)", "Credit (Deposit)", "Running Balance", "Category", "Counterparty", "File Source"];
    const txnRows = [
      txnHeaders,
      ...transactions.map((t: any) => [
        t.date,
        t.description,
        t.debit || 0,
        t.credit || 0,
        t.balance,
        t.category || "Miscellaneous",
        t.counterparty || "Unknown",
        t.fileOrigin || "Unknown"
      ])
    ];
    const wsTxns = XLSX.utils.aoa_to_sheet(txnRows);
    XLSX.utils.book_append_sheet(wb, wsTxns, "Transactions History");

    // 4. Sheet 3: Liabilities (EMIs) & Income
    const liabHeaders = ["Lender / Institution", "Estimated Monthly EMI", "Frequency", "Confidence Score"];
    const liabRows = [
      ["EXISTING EMI LIABILITIES", "", "", ""],
      liabHeaders,
      ...liability_analysis.map((l: any) => [
        l.lender,
        l.emi_amount,
        l.frequency || "Monthly",
        l.confidence
      ]),
      [],
      ["INCOME STREAMS ESTIMATION", "", "", ""],
      ["Income Source", "Amount", "Category", "Frequency"],
      ...income_analysis.map((i: any) => [
        i.source,
        i.amount,
        i.category,
        i.frequency
      ])
    ];
    const wsLiab = XLSX.utils.aoa_to_sheet(liabRows);
    XLSX.utils.book_append_sheet(wb, wsLiab, "Obligations & Income");

    // 5. Sheet 4: Cheque Returns & Bounces
    const bounceHeaders = ["Date", "Description / Narration", "Amount Paid/Debited", "Heuristic Charge Fee"];
    const bounceRows = [
      ["FLAGGED CHEQUE RETURNS / failed ECS PAYMENTS", "", "", ""],
      bounceHeaders,
      ...bounce_analysis.map((b: any) => [
        b.date,
        b.description,
        b.amount,
        b.charge
      ])
    ];
    const wsBounces = XLSX.utils.aoa_to_sheet(bounceRows);
    XLSX.utils.book_append_sheet(wb, wsBounces, "Bounces & Returns");

    // 6. Write Buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const filename = `FinScope_Report_${overview.accountNumber || "export"}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=${filename}`
      }
    });

  } catch (error: any) {
    console.error("Excel generation failed:", error);
    return NextResponse.json(
      { error: `Failed to export excel: ${error.message || error}` },
      { status: 500 }
    );
  }
}
export const maxDuration = 10;
