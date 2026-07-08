import React from "react";
import SectionHeader from "./SectionHeader";
import BloombergTable from "./BloombergTable";

interface BorrowerSnapshotProps {
  overview: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    statementPeriod: string;
    openingBalance: number;
    closingBalance: number;
    averageBalance: number;
    totalCredits: number;
    totalDebits: number;
    durationMonths: number;
  };
  transactionsCount: number;
  integrity: {
    ledgerMathValid: boolean;
    openingBalanceMatched: boolean;
    closingBalanceMatched: boolean;
    statementReconciled: boolean;
    overallScore: number;
  };
}

const fmt = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

export default function BorrowerSnapshot({
  overview,
  transactionsCount,
  integrity
}: BorrowerSnapshotProps) {
  const accountMetrics = [
    ["Account Holder Name", overview.accountHolder],
    ["Verified Account Number", overview.accountNumber],
    ["Lending Bank Entity", overview.bankName],
    ["Statement Duration", `${overview.durationMonths} Months`],
    ["Statement Range", overview.statementPeriod],
    ["Total Transactions Evaluated", String(transactionsCount)]
  ];

  const balanceMetrics = [
    ["Opening Ledger Balance", fmt(overview.openingBalance)],
    ["Closing Ledger Balance", fmt(overview.closingBalance)],
    ["Average Daily Balance (ADB)", fmt(overview.averageBalance)],
    ["Total Cash Inflows (Credits)", fmt(overview.totalCredits)],
    ["Total Cash Outflows (Debits)", fmt(overview.totalDebits)],
    ["Net Ledger Flow", fmt(overview.totalCredits - overview.totalDebits)]
  ];

  const integrityChecklist = [
    { label: "Ledger Balance Continuity Verification", status: integrity.ledgerMathValid },
    { label: "Opening Statement Boundary Verification", status: integrity.openingBalanceMatched },
    { label: "Closing Statement Boundary Verification", status: integrity.closingBalanceMatched },
    { label: "Multi-Account Chronology Alignment", status: integrity.statementReconciled }
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        sectionNumber="2.0"
        title="Borrower Snapshot & Verification"
        bankName={overview.bankName}
        accountNumber={overview.accountNumber}
        statementPeriod={overview.statementPeriod}
        pageNumber={2}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">APPLICANT IDENTIFICATION</span>
          <BloombergTable
            headers={["Metadata Parameter", "Assessed Value"]}
            rows={accountMetrics.map(r => [r[0], <span className="font-semibold text-slate-200">{r[1]}</span>])}
          />
        </div>

        <div className="space-y-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">LEDGER BALANCE SUMMARY</span>
          <BloombergTable
            headers={["Balance Category", "Amount (INR)"]}
            rows={balanceMetrics.map(r => [r[0], <span className="font-semibold text-slate-200">{r[1]}</span>])}
          />
        </div>
      </div>

      <div className="border border-slate-900 bg-slate-950/20 rounded-xl p-4 mt-4">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-3">STATEMENT INTEGRITY AUDIT CHECKLIST</span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrityChecklist.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-900/30 border border-slate-900 rounded-lg">
              <span className="text-xs text-slate-300">{item.label}</span>
              <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${
                item.status 
                  ? "bg-emerald-950/25 border-emerald-900/60 text-emerald-400" 
                  : "bg-amber-950/25 border-amber-900/60 text-amber-400"
              }`}>
                {item.status ? "VERIFIED" : "WARNING"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
