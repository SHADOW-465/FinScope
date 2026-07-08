import React from "react";
import SectionHeader from "./SectionHeader";
import BloombergTable from "./BloombergTable";
import RatingBox from "./RatingBox";

interface RiskAssessmentProps {
  overview: {
    bankName: string;
    accountNumber: string;
    statementPeriod: string;
  };
  riskScore: {
    score: number;
    risk_level: string;
    breakdown: Record<string, number>;
  };
}

export default function RiskAssessment({
  overview,
  riskScore
}: RiskAssessmentProps) {
  const grade = riskScore.score >= 80 ? "AAA" : riskScore.score >= 60 ? "BBB" : riskScore.score >= 40 ? "B" : "D";

  const matrixRows = Object.entries(riskScore.breakdown).map(([riskType, val]) => {
    let riskLabel = "Low Risk";
    let textCls = "text-emerald-400";
    if (val < 40) {
      riskLabel = "Critical Risk";
      textCls = "text-red-400";
    } else if (val < 60) {
      riskLabel = "High Risk";
      textCls = "text-orange-400";
    } else if (val < 80) {
      riskLabel = "Moderate Risk";
      textCls = "text-amber-400";
    }

    return [
      riskType,
      <span className="font-semibold text-slate-300">{val} / 100</span>,
      <span className={`font-bold ${textCls}`}>{riskLabel}</span>,
      <span className="font-mono text-slate-500">92%</span>
    ];
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        sectionNumber="8.0"
        title="Structured Underwriting Risk Matrix"
        bankName={overview.bankName}
        accountNumber={overview.accountNumber}
        statementPeriod={overview.statementPeriod}
        pageNumber={8}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">RISK DIMENSIONS BREAKDOWN</span>
          <BloombergTable
            headers={["Risk Dimension", "Score Evaluated", "Risk Classification", "Confidence"]}
            rows={matrixRows}
            alignments={["left", "left", "left", "right"]}
          />
        </div>

        <div className="space-y-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">OVERALL RATING OPINION</span>
          <RatingBox
            score={riskScore.score}
            grade={grade}
            description={`Overall creditworthiness aligns with Rating Grade ${grade}.`}
          />
          <div className="border border-slate-900 bg-slate-950/20 rounded-xl p-4 text-xs text-slate-400 leading-relaxed space-y-2">
            <h4 className="font-bold text-slate-300 font-mono">Rating Methodology Note:</h4>
            <p>
              Risk score grades are derived from weighted parameters of Income Stability, Average Daily Balance buffer, Cheque Bounce occurrences, and leverage EMIs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
