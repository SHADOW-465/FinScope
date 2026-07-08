import React from "react";
import SectionHeader from "./SectionHeader";
import BloombergTable from "./BloombergTable";

interface AnomaliesPageProps {
  overview: {
    bankName: string;
    accountNumber: string;
    statementPeriod: string;
  };
  bounceAnalysis: Array<{
    date: string;
    description: string;
    amount: number;
  }>;
  balanceRisks: Array<{
    date: string;
    balance: number;
    description: string;
    risk_type: string;
  }>;
  transactions: Array<{
    date: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
}

const fmt = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

export default function AnomaliesPage({
  overview,
  bounceAnalysis,
  balanceRisks,
  transactions
}: AnomaliesPageProps) {
  const anomalies: Array<{
    date: string;
    type: string;
    description: string;
    impact: string;
    riskLevel: "High" | "Medium" | "Low";
  }> = [];

  // 1. Cheque/ECS Bounces
  bounceAnalysis.forEach((b) => {
    anomalies.push({
      date: b.date,
      type: "Cheque / ECS Bounce Event",
      description: b.description,
      impact: `Outward charge of ${fmt(b.amount)}`,
      riskLevel: "High"
    });
  });

  // 2. Negative Balances
  balanceRisks.filter(r => r.risk_type === "Negative Balance").forEach((b) => {
    anomalies.push({
      date: b.date,
      type: "Negative Balance Event",
      description: b.description,
      impact: `Account balance fell to ${fmt(b.balance)}`,
      riskLevel: "High"
    });
  });

  // 3. Repeated Round Figures (> 50,000 INR ending in 000)
  transactions.forEach((tx) => {
    const cred = Number(tx.credit) || 0;
    const deb = Number(tx.debit) || 0;
    const amt = Math.max(cred, deb);

    if (amt >= 50000 && amt % 10000 === 0) {
      anomalies.push({
        date: tx.date,
        type: "Large Round Figure Transaction",
        description: tx.description,
        impact: `${cred > 0 ? "Credit Inflow" : "Debit Outflow"} of ${fmt(amt)}`,
        riskLevel: "Medium"
      });
    }
  });

  // Sort anomalies by date descending
  const sortedAnomalies = anomalies
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 15);

  const tableRows = sortedAnomalies.map((an) => [
    an.date,
    an.type,
    <div className="max-w-[200px] truncate" title={an.description}>{an.description}</div>,
    an.impact,
    <span className={`font-bold ${
      an.riskLevel === "High" ? "text-red-400" : an.riskLevel === "Medium" ? "text-orange-400" : "text-amber-400"
    }`}>
      {an.riskLevel}
    </span>
  ]);

  return (
    <div className="space-y-6">
      <SectionHeader
        sectionNumber="11.0"
        title="Account Anomalies & Audits"
        bankName={overview.bankName}
        accountNumber={overview.accountNumber}
        statementPeriod={overview.statementPeriod}
        pageNumber={11}
      />

      <div className="space-y-3">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
          IDENTIFIED ACCOUNT ANOMALIES & SIGNATURE TRIGGERS
        </span>
        <BloombergTable
          headers={["Event Date", "Anomaly Trigger Classification", "Narration Context", "Assessed Financial Impact", "Risk Rating"]}
          rows={tableRows}
          alignments={["left", "left", "left", "left", "center"]}
          emptyMessage="No anomalies or signature triggers identified in statement ledger"
        />
      </div>
    </div>
  );
}
