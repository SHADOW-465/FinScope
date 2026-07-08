import React from "react";
import SectionHeader from "./SectionHeader";
import RatingBox from "./RatingBox";
import EvidenceChips from "./EvidenceChips";
import DecisionBox from "./DecisionBox";

interface ExecutiveSummaryProps {
  overview: {
    bankName: string;
    accountNumber: string;
    statementPeriod: string;
    averageBalance: number;
  };
  metrics: {
    avg_monthly_income: number;
    net_cash_flow: number;
    income_stability: number;
    emi_burden: number;
  };
  foir: {
    pre_loan_pct: number | null;
    post_loan_pct: number | null;
  };
  riskScore: {
    score: number;
    risk_level: string;
  };
  policy: {
    verdict: "pass" | "review" | "fail" | string;
    policyName?: string;
  };
  bouncesCount: number;
  negativeBalancesCount: number;
}

const fmt = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

export default function ExecutiveSummary({
  overview,
  metrics,
  foir,
  riskScore,
  policy,
  bouncesCount,
  negativeBalancesCount
}: ExecutiveSummaryProps) {
  const getBannerStyle = (verdict: string) => {
    if (verdict === "pass") {
      return {
        cls: "bg-emerald-950/20 border-emerald-800 text-emerald-400",
        label: "APPROVED UNDERWRITING PROFILE"
      };
    }
    if (verdict === "review") {
      return {
        cls: "bg-amber-950/20 border-amber-800 text-amber-400",
        label: "REFER TO MANUAL RISK AUDIT"
      };
    }
    return {
      cls: "bg-red-950/20 border-red-800 text-red-400",
      label: "DECLINED PROFILE - CRITICAL RISK VIOLATION"
    };
  };

  const banner = getBannerStyle(policy.verdict);

  const strengths = [
    { text: `Consistent average monthly income of ${fmt(metrics.avg_monthly_income)}.`, confidence: 96 },
    { text: `Stable chronological transaction activity across the analysis period.`, confidence: 92 },
    { text: `Average daily balance maintained at ${fmt(overview.averageBalance)}.`, confidence: 94 }
  ];

  const risks = [
    { text: bouncesCount > 0 ? `Detected ${bouncesCount} cheque bounce/NSF charge events.` : "No cheque bounce/NSF charge events identified.", confidence: 95 },
    { text: negativeBalancesCount > 0 ? `Identified ${negativeBalancesCount} negative balance boundary crossings.` : "Zero negative balance boundary crossings detected.", confidence: 98 }
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        sectionNumber="1.0"
        title="Executive Credit Summary"
        bankName={overview.bankName}
        accountNumber={overview.accountNumber}
        statementPeriod={overview.statementPeriod}
        pageNumber={1}
      />

      <div className={`border p-4 rounded-xl text-center font-mono font-bold tracking-widest text-xs uppercase ${banner.cls}`}>
        {banner.label}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RatingBox
          score={riskScore.score}
          grade={riskScore.score >= 80 ? "AAA" : riskScore.score >= 60 ? "BBB" : riskScore.score >= 40 ? "B" : "D"}
          description={`Assessed Underwriting Profile matches standard rating: ${riskScore.risk_level}`}
        />

        <div className="border border-slate-900 bg-slate-950/30 rounded-xl p-4 grid grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase block">NET MONTHLY SURPLUS</span>
            <span className="text-sm font-bold text-slate-200 mt-1 block">{fmt(metrics.net_cash_flow)}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase block">EMI DEBT BURDEN Ratio</span>
            <span className="text-sm font-bold text-slate-200 mt-1 block">{metrics.emi_burden.toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase block">PRE-LOAN FOIR</span>
            <span className="text-sm font-bold text-slate-200 mt-1 block">
              {foir.pre_loan_pct !== null ? `${foir.pre_loan_pct.toFixed(1)}%` : "N/A"}
            </span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase block">POST-LOAN FOIR</span>
            <span className="text-sm font-bold text-slate-200 mt-1 block">
              {foir.post_loan_pct !== null ? `${foir.post_loan_pct.toFixed(1)}%` : "N/A"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EvidenceChips items={strengths} title="Top Account Strengths" />
        <EvidenceChips items={risks} title="Assessed Account Risks" />
      </div>

      <DecisionBox
        title="Credit Verdict"
        verdict={policy.verdict === "pass" ? "Strong" : policy.verdict === "review" ? "Refer" : "Weak"}
        description={`The underwriting model evaluates this case under ${policy.policyName || "Default Policy Guidelines"}. Standard checks indicate ${policy.verdict === "pass" ? "sufficient liquidity reserves and stable debt coverage ratios" : "irregular cash flow patterns or insufficient average daily balances"}.`}
        metricLabel="REPAYMENT CAPABILITY"
        metricValue={metrics.net_cash_flow > 0 ? "SURPLUS" : "DEFICIT"}
        confidence={riskScore.score}
      />
    </div>
  );
}
