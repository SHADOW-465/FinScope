import React from "react";
import SectionHeader from "./SectionHeader";
import BloombergTable from "./BloombergTable";

interface AppendixPageProps {
  overview: {
    bankName: string;
    accountNumber: string;
    statementPeriod: string;
    totalCredits: number;
    totalDebits: number;
  };
  integrity: {
    overallScore: number;
    mismatchCount: number;
    mismatchAmount: number;
  };
  transactions: Array<{
    confidenceScore: number;
  }>;
}

const fmt = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

export default function AppendixPage({
  overview,
  integrity,
  transactions
}: AppendixPageProps) {
  const avgConf = transactions.length > 0
    ? transactions.reduce((sum, tx) => sum + (tx.confidenceScore || 0.7), 0) / transactions.length
    : 0.95;

  const logs = [
    ["Average OCR/Parser Character Confidence", `${(avgConf * 100).toFixed(1)}%`],
    ["Statement Verification Integrity Score", `${integrity.overallScore} / 100`],
    ["Ledger Sequence Reconciliation Mismatches", String(integrity.mismatchCount)],
    ["Reconciliation Deficit Volume", fmt(integrity.mismatchAmount)],
    ["Cumulative Inflow/Outflow Turnovers", fmt(overview.totalCredits + overview.totalDebits)],
    ["System Engine Version", "Credalyzer Engine v2.0.0-enterprise"]
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        sectionNumber="12.0"
        title="Technical Audit Appendix"
        bankName={overview.bankName}
        accountNumber={overview.accountNumber}
        statementPeriod={overview.statementPeriod}
        pageNumber={12}
      />

      <div className="space-y-3">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
          DOCUMENT RECONCILIATION & CONFIDENCE PARAMETERS
        </span>
        <BloombergTable
          headers={["Audit Parameter Metric", "Value Evaluated"]}
          rows={logs.map(r => [r[0], <span className="font-semibold text-slate-200">{r[1]}</span>])}
        />
      </div>

      <div className="border border-slate-900 bg-slate-950/20 rounded-xl p-4 text-[10px] text-slate-400 font-mono leading-relaxed mt-6">
        <p className="font-bold text-slate-300 mb-1">LEGAL DISCLAIMER & MEMORANDUM LIMITATION:</p>
        <p>
          This Credit Underwriting Memorandum and Risk Rating assessment is generated strictly from the provided financial document data buffers in-memory. The calculations do not constitute an offer, commitment, or binding credit decision by FinScope or its affiliates. Verification of applicant credentials, direct tax filings, and secondary borrower information remains the sole responsibility of the certified human underwriting committee.
        </p>
      </div>
    </div>
  );
}
