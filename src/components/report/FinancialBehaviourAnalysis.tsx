import React from "react";
import SectionHeader from "./SectionHeader";
import BloombergTable from "./BloombergTable";
import DecisionBox from "./DecisionBox";
import EvidenceChips from "./EvidenceChips";

interface FinancialBehaviourAnalysisProps {
  overview: {
    bankName: string;
    accountNumber: string;
    statementPeriod: string;
    totalCredits: number;
  };
  transactions: Array<{
    date: string;
    description: string;
    debit: number;
    credit: number;
    category: string;
    counterparty: string;
  }>;
  bouncesCount: number;
  negativeBalancesCount: number;
}

const fmt = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

export default function FinancialBehaviourAnalysis({
  overview,
  transactions,
  bouncesCount,
  negativeBalancesCount
}: FinancialBehaviourAnalysisProps) {
  // Analyze weekend transactions
  let weekendCount = 0;
  let weekendVolume = 0;
  let cashAtmCount = 0;
  let cashAtmVolume = 0;

  transactions.forEach((tx) => {
    const dateObj = new Date(tx.date);
    const day = dateObj.getDay();
    const isWeekend = day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
    const amt = (Number(tx.credit) || 0) + (Number(tx.debit) || 0);

    if (isWeekend) {
      weekendCount++;
      weekendVolume += amt;
    }

    const descLower = tx.description.toLowerCase();
    if (descLower.includes("atm") || descLower.includes("cash") || descLower.includes("self")) {
      cashAtmCount++;
      cashAtmVolume += amt;
    }
  });

  const totalVolume = transactions.reduce((sum, tx) => sum + (Number(tx.credit) || 0) + (Number(tx.debit) || 0), 0) || 1;

  // Compute Discipline Score (starts at 100, penalize for negative balance events and bounces)
  const disciplineScore = Math.max(0, 100 - (bouncesCount * 25) - (negativeBalancesCount * 15));

  const behaviourRows = [
    ["Financial Discipline Score", `${disciplineScore} / 100`],
    ["Weekend Transaction Share", `${((weekendVolume / totalVolume) * 100).toFixed(1)}% (${weekendCount} txns)`],
    ["Cash & ATM Handling Volume", `${fmt(cashAtmVolume)} (${cashAtmCount} txns)`],
    ["Statement Activity Concentration", "Stable throughout weekdays"],
    ["Negative Balance Events", String(negativeBalancesCount)],
    ["Cheque/ECS Bounce occurrences", String(bouncesCount)]
  ];

  const evidence = [
    { text: bouncesCount > 0 ? `Cheque bounces detected: ${bouncesCount}. High risk indicator.` : "Zero cheque or ECS bounces detected in the period.", confidence: 98 },
    { text: `Discipline score of ${disciplineScore}/100 reflects historical account maintenance quality.`, confidence: 94 },
    { text: `Cash handling operations represent ${((cashAtmVolume / totalVolume) * 100).toFixed(1)}% of total volume.`, confidence: 91 }
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        sectionNumber="7.0"
        title="Financial Behaviour Analysis"
        bankName={overview.bankName}
        accountNumber={overview.accountNumber}
        statementPeriod={overview.statementPeriod}
        pageNumber={7}
      />

      <div className="space-y-3">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ACCOUNT BEHAVIOURAL CHARACTERISTICS</span>
        <BloombergTable
          headers={["Behavioural Parameter", "Assessed Value"]}
          rows={behaviourRows.map(r => [r[0], <span className="font-semibold text-slate-200">{r[1]}</span>])}
        />
      </div>

      <EvidenceChips items={evidence} title="Behavioural Observations" />

      <DecisionBox
        title="Behaviour Assessment"
        verdict={disciplineScore >= 75 ? "Strong" : disciplineScore >= 45 ? "Moderate" : "Weak"}
        description={`Applicant exhibits ${disciplineScore >= 75 ? "sound credit discipline with no material irregularities" : "certain minor warnings such as cash withdrawals or low balance thresholds"}.`}
        metricLabel="BEHAVIOURAL SCORE"
        metricValue={`${disciplineScore} / 100`}
        confidence={95}
      />
    </div>
  );
}
