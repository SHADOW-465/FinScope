"use client";

import React, { useState, useCallback } from "react";
import { Landmark, Loader2, CheckCircle2, XCircle, AlertCircle, Printer } from "lucide-react";
import UploadZone from "@/components/UploadZone";
import RiskCard from "@/components/RiskCard";
import OverviewCards from "@/components/OverviewCards";
import Charts from "@/components/Charts";
import Panels from "@/components/Panels";
import TransactionTable from "@/components/TransactionTable";
import ChatAssistant from "@/components/ChatAssistant";
import UnderwritingPanel from "@/components/UnderwritingPanel";
import AISummaryCard from "@/components/AISummaryCard";
import VerdictBar from "@/components/VerdictBar";
import type { CaseStatus, ProductType } from "@/types/domain";

interface CaseInfo {
  id: string;
  applicantName: string;
  productType: ProductType;
  productLabel: string;
  requestedAmount: number;
  tenureMonths: number;
  status: CaseStatus;
}

interface AnalysisData {
  accounts: Array<{
    id: string;
    accountNumber: string;
    accountHolder: string;
    bankName: string;
    statementPeriod: string;
    transactionsCount: number;
  }>;
  reports: Record<string, any>;
}

interface CaseWorkspaceProps {
  caseInfo: CaseInfo;
  initialData: AnalysisData | null;
}

const fmt = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

export default function CaseWorkspace({ caseInfo, initialData }: CaseWorkspaceProps) {
  const [data, setData] = useState<AnalysisData | null>(initialData);
  const [activeAccountId, setActiveAccountId] = useState<string>(initialData?.accounts[0]?.id || "");
  const [status, setStatus] = useState<CaseStatus>(caseInfo.status);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const handleProcessComplete = useCallback((result: AnalysisData) => {
    setData(result);
    setActiveAccountId(result.accounts[0]?.id || "");
    setStatus("ready");
    setIsProcessing(false);
  }, []);

  const handleDecision = async (decision: Extract<CaseStatus, "approved" | "declined" | "manual_review">) => {
    setIsDeciding(true);
    setDecisionError(null);
    try {
      const response = await fetch(`/api/cases/${caseInfo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: decision }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Failed to record decision");
      setStatus(decision);
    } catch (err: any) {
      setDecisionError(err.message || "Failed to record decision");
    } finally {
      setIsDeciding(false);
    }
  };

  const activeReport = data && activeAccountId ? data.reports[activeAccountId] : null;
  const loanAskLabel = `${caseInfo.productLabel} · ${fmt(caseInfo.requestedAmount)} · ${caseInfo.tenureMonths}mo`;

  const decisionStyles: Partial<Record<CaseStatus, { badge: string; label: string }>> = {
    approved: { badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40", label: "Approved" },
    declined: { badge: "bg-red-500/10 text-red-300 border-red-500/40", label: "Declined" },
    manual_review: { badge: "bg-amber-500/10 text-amber-300 border-amber-500/40", label: "Manual Review" },
  };
  const decided = decisionStyles[status];

  return (
    <div className="space-y-6">
      {/* Case header */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">{caseInfo.applicantName}</h2>
          <p className="text-xs text-slate-400 mt-1">
            {loanAskLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap no-print">
          {decided && (
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${decided.badge}`}>
              {decided.label}
            </span>
          )}
          {activeReport && (
            <>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / PDF
              </button>
              <button
                onClick={() => handleDecision("approved")}
                disabled={isDeciding}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve
              </button>
              <button
                onClick={() => handleDecision("manual_review")}
                disabled={isDeciding}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-xl text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Review
              </button>
              <button
                onClick={() => handleDecision("declined")}
                disabled={isDeciding}
                className="px-4 py-2 bg-red-600/80 hover:bg-red-700 rounded-xl text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                Decline
              </button>
            </>
          )}
        </div>
      </div>

      {decisionError && (
        <div className="p-3 bg-red-950/30 border border-red-500/30 text-red-400 rounded-xl text-xs no-print">
          {decisionError}
        </div>
      )}

      {isProcessing ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] py-16">
          <div className="glass-panel max-w-lg w-full rounded-2xl p-8 flex flex-col items-center gap-6 border border-indigo-500/25 text-center">
            <div className="p-4 bg-indigo-500/10 rounded-full animate-pulse">
              <Landmark className="w-10 h-10 text-indigo-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white tracking-tight">Running Underwriting Engine</h3>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed mx-auto">
                Parsing statements, reconciling balances, detecting obligations, and evaluating lender policy.
              </p>
            </div>
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        </div>
      ) : !data || !activeReport ? (
        /* No analysis yet: upload statements into this case */
        <div className="space-y-8 py-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h3 className="text-2xl font-black text-white tracking-tight">Upload bank statements</h3>
            <p className="text-sm text-slate-400">
              Statements uploaded here are analyzed and saved to this case, so you can return to the
              report any time.
            </p>
          </div>
          <UploadZone
            caseId={caseInfo.id}
            onProcessStart={() => setIsProcessing(true)}
            onProcessComplete={handleProcessComplete}
            onProcessError={() => setIsProcessing(false)}
          />
        </div>
      ) : (
        /* Dashboard */
        <div className="space-y-6">
          {/* Print header */}
          <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">FinScope Underwriting Report</h1>
                <p className="text-sm text-slate-600">
                  {caseInfo.applicantName} — {loanAskLabel}
                </p>
                <p className="text-sm text-slate-600">Generated: {new Date().toLocaleDateString("en-IN")}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">Risk Score: {activeReport.risk_score.score} / 100</p>
                <p className="text-xs font-semibold uppercase">{activeReport.risk_score.risk_level}</p>
                {activeReport.policy && (
                  <p className="text-xs font-semibold uppercase mt-1">
                    Policy: {activeReport.policy.verdict === "pass" ? "Meets policy" : activeReport.policy.verdict === "review" ? "Manual review" : "Fails policy"}
                  </p>
                )}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-3">
              This report is an evidence-backed recommendation generated by FinScope. It does not
              constitute a credit decision; the lending decision rests with a qualified human underwriter.
            </p>
          </div>

          {/* Decision hero: the answer first, evidence below */}
          <VerdictBar report={activeReport} />

          {/* Account switcher */}
          {data.accounts.length > 1 && (
            <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-indigo-500/20 no-print">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Multiple Accounts Detected</h3>
                <p className="text-xs text-slate-400">Select an account to view its underwriting profile:</p>
              </div>
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                {data.accounts.map((acc) => {
                  const isActive = acc.id === activeAccountId;
                  return (
                    <button
                      key={acc.id}
                      onClick={() => setActiveAccountId(acc.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 ${
                        isActive
                          ? "bg-indigo-600/15 border-indigo-500/40 text-indigo-300"
                          : "bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      <Landmark className="w-3.5 h-3.5" />
                      <div className="text-left">
                        <p className="font-bold leading-none">{acc.accountHolder}</p>
                        <p className="text-[9px] opacity-75 mt-0.5 leading-none">
                          {acc.bankName} - {acc.accountNumber}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-6 order-2 lg:order-1">
              <OverviewCards
                overview={activeReport.overview}
                metrics={activeReport.metrics}
                bouncesCount={activeReport.bounce_analysis.length}
                totalMonthlyEMIs={activeReport.liability_analysis.reduce(
                  (sum: number, l: any) => sum + l.emi_amount,
                  0
                )}
              />

              <Charts monthlyAnalysis={activeReport.monthly_analysis} transactions={activeReport.transactions} />

              <div className="print-page-break" />

              <TransactionTable transactions={activeReport.transactions} />

              <div className="print-page-break" />

              <Panels
                income={activeReport.income_analysis}
                liabilities={activeReport.liability_analysis}
                bounces={activeReport.bounce_analysis}
                balanceRisks={activeReport.balance_risks}
                durationMonths={activeReport.overview.durationMonths}
              />
            </div>

            <div className="lg:col-span-4 lg:sticky lg:top-24 order-1 lg:order-2 space-y-4">
              <UnderwritingPanel
                foir={activeReport.foir}
                policy={activeReport.policy}
                integrity={activeReport.integrity}
                loanAskLabel={loanAskLabel}
              />
              <AISummaryCard report={activeReport} caseId={caseInfo.id} />
              <RiskCard
                score={activeReport.risk_score.score}
                level={activeReport.risk_score.risk_level}
                breakdown={activeReport.risk_score.breakdown}
                bouncesCount={activeReport.bounce_analysis.length}
                emiBurden={activeReport.metrics.emi_burden}
                negativeBalancesCount={activeReport.balance_risks.filter(
                  (r: any) => r.risk_type === "Negative Balance"
                ).length}
              />
            </div>
          </div>

          <ChatAssistant analysisData={activeReport} />
        </div>
      )}
    </div>
  );
}
