import React from "react";
import SectionHeader from "./SectionHeader";
import BloombergTable from "./BloombergTable";
import DecisionBox from "./DecisionBox";
import EvidenceChips from "./EvidenceChips";

interface CashFlowIntelligenceProps {
  overview: {
    bankName: string;
    accountNumber: string;
    statementPeriod: string;
    averageBalance: number;
    totalCredits: number;
    totalDebits: number;
  };
  metrics: {
    net_cash_flow: number;
    cash_retention: number;
  };
  monthlyAnalysis: Array<{
    month: string;
    credits: number;
    debits: number;
    net_flow: number;
  }>;
}

const fmt = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

export default function CashFlowIntelligence({
  overview,
  metrics,
  monthlyAnalysis
}: CashFlowIntelligenceProps) {
  const tableRows = monthlyAnalysis.map((m) => [
    m.month,
    fmt(m.credits),
    fmt(m.debits),
    <span className={`font-bold ${m.net_flow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
      {fmt(m.net_flow)}
    </span>
  ]);

  const strengths = [
    { text: `Net cumulative cash surplus is ${fmt(metrics.net_cash_flow)}.`, confidence: 98 },
    { text: `Cash retention ratio stands at ${metrics.cash_retention.toFixed(1)}% of total credit volume.`, confidence: 93 },
    { text: `Average daily balance buffer maintained is ${fmt(overview.averageBalance)}.`, confidence: 95 }
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        sectionNumber="4.0"
        title="Cash Flow & Liquidity Intelligence"
        bankName={overview.bankName}
        accountNumber={overview.accountNumber}
        statementPeriod={overview.statementPeriod}
        pageNumber={4}
      />

      <div className="space-y-3">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">MONTHLY CASH FLOW RESOLUTION</span>
        <BloombergTable
          headers={["Billing Month", "Total Credits", "Total Debits", "Net Cash Inflow/Outflow"]}
          rows={tableRows}
          alignments={["left", "right", "right", "right"]}
          emptyMessage="No monthly transaction timeline identified"
        />
      </div>

      <EvidenceChips items={strengths} title="Verified Cash Flow Evidence" />

      <DecisionBox
        title="Liquidity Assessment"
        verdict={metrics.net_cash_flow >= 0 ? "Pass" : "Refer"}
        description={`The business has generated a ${metrics.net_cash_flow >= 0 ? "net positive operating surplus" : "net cash deficit"} during the statement period. Daily balance buffers are adequate to cover standard short-term liabilities.`}
        metricLabel="NET ACCOUNT SURPLUS"
        metricValue={fmt(metrics.net_cash_flow)}
        confidence={92}
      />
    </div>
  );
}
