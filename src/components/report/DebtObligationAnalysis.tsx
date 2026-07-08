import React from "react";
import SectionHeader from "./SectionHeader";
import BloombergTable from "./BloombergTable";
import DecisionBox from "./DecisionBox";
import EvidenceChips from "./EvidenceChips";

interface DebtObligationAnalysisProps {
  overview: {
    bankName: string;
    accountNumber: string;
    statementPeriod: string;
  };
  metrics: {
    avg_monthly_income: number;
  };
  foir: {
    existing_obligations: number;
    avg_monthly_income: number;
    pre_loan_pct: number | null;
    indicative_new_emi: number;
    post_loan_pct: number | null;
  };
  liabilityAnalysis: Array<{
    lender: string;
    emi_amount: number;
    frequency: string;
    confidence: number;
  }>;
}

const fmt = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

export default function DebtObligationAnalysis({
  overview,
  metrics,
  foir,
  liabilityAnalysis
}: DebtObligationAnalysisProps) {
  const tableRows = liabilityAnalysis.map((l) => [
    l.lender,
    <span className="font-semibold text-slate-300">{fmt(l.emi_amount)}</span>,
    l.frequency,
    <span className="font-mono text-slate-500">{Math.round(l.confidence * 100)}%</span>
  ]);

  const foirRows = [
    ["Assessed Monthly Income Base", fmt(foir.avg_monthly_income || metrics.avg_monthly_income)],
    ["Total Existing Monthly EMIs", fmt(foir.existing_obligations)],
    ["Pre-Loan Fixed Obligation Ratio (FOIR)", foir.pre_loan_pct !== null ? `${foir.pre_loan_pct.toFixed(1)}%` : "0.0%"],
    ["Indicative Proposed New EMI", fmt(foir.indicative_new_emi)],
    ["Post-Loan Fixed Obligation Ratio (FOIR)", foir.post_loan_pct !== null ? `${foir.post_loan_pct.toFixed(1)}%` : "0.0%"]
  ];

  const evidence = [
    { text: `Identified existing monthly obligations amount to ${fmt(foir.existing_obligations)}.`, confidence: 95 },
    { text: `Pre-loan FOIR ratio is safe at ${foir.pre_loan_pct !== null ? foir.pre_loan_pct.toFixed(1) : "0.0"}%.`, confidence: 98 },
    { text: `Post-loan FOIR impact is estimated at ${foir.post_loan_pct !== null ? foir.post_loan_pct.toFixed(1) : "0.0"}%.`, confidence: 92 }
  ];

  const isEmiBurdenHigh = (foir.post_loan_pct || 0) > 55;

  return (
    <div className="space-y-6">
      <SectionHeader
        sectionNumber="6.0"
        title="Debt & Obligation Analysis"
        bankName={overview.bankName}
        accountNumber={overview.accountNumber}
        statementPeriod={overview.statementPeriod}
        pageNumber={6}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">IDENTIFIED MONTHLY LIABILITIES (EMIs)</span>
          <BloombergTable
            headers={["Lender Profile", "EMI Installment Amount", "Frequency", "Confidence"]}
            rows={tableRows}
            alignments={["left", "right", "left", "right"]}
            emptyMessage="No recurring liability obligations identified in statement history"
          />
        </div>

        <div className="space-y-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">FOIR COMPILATION & CAPACITY SUMMARY</span>
          <BloombergTable
            headers={["Underwriting Parameter", "Assessed Value"]}
            rows={foirRows.map(r => [r[0], <span className="font-semibold text-slate-200">{r[1]}</span>])}
          />
        </div>
      </div>

      <EvidenceChips items={evidence} title="Obligation & Leverage Evidence" />

      <DecisionBox
        title="Debt Capacity Verdict"
        verdict={isEmiBurdenHigh ? "Refer" : "Pass"}
        description={isEmiBurdenHigh 
          ? "Proposed loan installment pushes the Fixed Obligation to Income Ratio (FOIR) beyond standard limits. Manual review is recommended." 
          : "Applicant retains sufficient surplus capacity to cover the proposed monthly loan installment guidelines."
        }
        metricLabel="SAFE LENDING CAPACITY"
        metricValue={fmt(Math.max(0, (foir.avg_monthly_income * 0.5) - foir.existing_obligations))}
        confidence={95}
      />
    </div>
  );
}
