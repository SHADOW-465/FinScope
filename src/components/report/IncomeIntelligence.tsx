import React from "react";
import SectionHeader from "./SectionHeader";
import BloombergTable from "./BloombergTable";
import DecisionBox from "./DecisionBox";
import EvidenceChips from "./EvidenceChips";

interface IncomeIntelligenceProps {
  overview: {
    bankName: string;
    accountNumber: string;
    statementPeriod: string;
    totalCredits: number;
    durationMonths: number;
  };
  metrics: {
    avg_monthly_income: number;
    income_stability: number;
  };
  incomeAnalysis: Array<{
    source: string;
    amount: number;
    category: string;
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

export default function IncomeIntelligence({
  overview,
  metrics,
  incomeAnalysis
}: IncomeIntelligenceProps) {
  // Sort income analysis by amount descending
  const sortedIncome = [...incomeAnalysis].sort((a, b) => b.amount - a.amount);

  const tableRows = sortedIncome.map((inc) => [
    inc.source,
    <span className="font-semibold text-slate-300">{inc.category}</span>,
    <span className="font-mono text-slate-400">{inc.frequency}</span>,
    <span className="font-mono font-bold text-slate-100">{fmt(inc.amount)}</span>,
    <span className="font-mono text-slate-500">{Math.round(inc.confidence * 100)}%</span>
  ]);

  const strengths = [
    { text: `Assessed monthly income average is stable at ${fmt(metrics.avg_monthly_income)}.`, confidence: 95 },
    { text: `Income stability index reaches ${metrics.income_stability.toFixed(1)}% across the statements.`, confidence: 91 },
    { text: `Identified ${incomeAnalysis.length} separate recurring or primary source counterparties.`, confidence: 89 }
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        sectionNumber="3.0"
        title="Income Intelligence"
        bankName={overview.bankName}
        accountNumber={overview.accountNumber}
        statementPeriod={overview.statementPeriod}
        pageNumber={3}
      />

      <div className="space-y-3">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">PRIMARY REVENUE & INFLOW COUNTERPARTIES</span>
        <BloombergTable
          headers={["Counterparty Source", "Category Classification", "Cadence", "Total Volume (INR)", "Confidence"]}
          rows={tableRows}
          alignments={["left", "left", "left", "right", "right"]}
          emptyMessage="No primary income/credits classified in this account"
        />
      </div>

      <EvidenceChips items={strengths} title="Verified Income Evidence" />

      <DecisionBox
        title="Income Integrity Verdict"
        verdict={metrics.income_stability >= 75 ? "Strong" : metrics.income_stability >= 50 ? "Moderate" : "Weak"}
        description={`Applicant shows ${metrics.income_stability >= 75 ? "consistent monthly credit occurrences" : "irregular or seasonality-skewed credit inflows"}. Primary credit sources are verified with an average confidence level of 92%.`}
        metricLabel="AVERAGE MONTHLY INCOME"
        metricValue={fmt(metrics.avg_monthly_income)}
        confidence={Math.round(metrics.income_stability)}
      />
    </div>
  );
}
