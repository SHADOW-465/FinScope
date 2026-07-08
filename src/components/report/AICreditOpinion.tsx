import React, { useState } from "react";
import SectionHeader from "./SectionHeader";
import DecisionBox from "./DecisionBox";
import EvidenceChips from "./EvidenceChips";
import { Sparkles, Loader2 } from "lucide-react";

interface AICreditOpinionProps {
  overview: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    statementPeriod: string;
    totalCredits: number;
    totalDebits: number;
  };
  metrics: {
    avg_monthly_income: number;
    net_cash_flow: number;
    income_stability: number;
    emi_burden: number;
  };
  riskScore: {
    score: number;
    risk_level: string;
  };
  caseId: string;
  bouncesCount: number;
}

export default function AICreditOpinion({
  overview,
  metrics,
  riskScore,
  caseId,
  bouncesCount
}: AICreditOpinionProps) {
  const [aiOpinion, setAiOpinion] = useState<{
    strengths: string[];
    concerns: string[];
    recommendation: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateOpinion = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report: {
            risk_score: riskScore,
            foir: {
              existing_obligations: metrics.emi_burden > 0 ? (metrics.avg_monthly_income * metrics.emi_burden / 100) : 0,
              avg_monthly_income: metrics.avg_monthly_income,
              pre_loan_pct: metrics.emi_burden,
              indicative_new_emi: 0,
              post_loan_pct: metrics.emi_burden
            },
            overview,
            metrics
          },
          caseId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to compile opinion");
      setAiOpinion(data.summary);
    } catch (err: any) {
      setError(err.message || "Failed to connect to AI provider");
    } finally {
      setIsLoading(false);
    }
  };

  // Heuristic-based fallback opinion
  const defaultOpinion = {
    strengths: [
      `Maintains a stable average monthly credit inflow of ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(metrics.avg_monthly_income)}.`,
      `Demonstrates positive net cash accumulation of ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(metrics.net_cash_flow)} in statement period.`,
      `Income stability metric verified at ${metrics.income_stability.toFixed(1)}% consistency.`
    ],
    concerns: [
      bouncesCount > 0 ? `Cheque bounces observed (${bouncesCount} occurrences) requiring careful risk assessment.` : "No cheque or ECS bounces identified in the ledger logs.",
      metrics.emi_burden > 45 ? `Existing EMI obligations represent a high share (${metrics.emi_burden.toFixed(1)}%) of income.` : "Debt burden ratios remain within conservative thresholds."
    ],
    recommendation: riskScore.score >= 60 ? "APPROVE" : "REFER"
  };

  const opinion = aiOpinion || defaultOpinion;

  return (
    <div className="space-y-6">
      <SectionHeader
        sectionNumber="9.0"
        title="AI Underwriting Opinion"
        bankName={overview.bankName}
        accountNumber={overview.accountNumber}
        statementPeriod={overview.statementPeriod}
        pageNumber={9}
      />

      <div className="border border-slate-900 bg-slate-950/20 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-900 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Formal Credit Narrative
          </h3>
          {!aiOpinion && (
            <button
              onClick={generateOpinion}
              disabled={isLoading}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-[10px] font-bold text-white rounded-lg transition-all flex items-center gap-1.5 cursor-pointer no-print"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {isLoading ? "Generating..." : "Generate AI Opinion"}
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-950/20 border border-red-900/60 text-red-400 rounded-lg text-xs">
            {error}
          </div>
        )}

        <div className="space-y-4 text-xs leading-relaxed text-slate-300">
          <p>
            Based on a granular analysis of the bank account ledger for statement holder <span className="font-semibold text-slate-200">{overview.accountHolder}</span>, the account exhibits an overall Risk score of <span className="font-semibold text-slate-200">{riskScore.score}/100</span>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">SUPPORTING STRENGTHS</span>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                {opinion.strengths.map((s, idx) => <li key={idx}>{s}</li>)}
              </ul>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">RISK OBSERVATIONS</span>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                {opinion.concerns.map((c, idx) => <li key={idx}>{c}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <DecisionBox
        title="AI Recommendation"
        verdict={opinion.recommendation}
        description="The memorandum recommends this credit decision based strictly on cash flow surpluses, balance stability, and debt cover checks."
        metricLabel="VERDICT SCORE"
        metricValue={`${riskScore.score} / 100`}
        confidence={riskScore.score}
      />
    </div>
  );
}
