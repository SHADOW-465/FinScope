"use client";

import React, { useState, useCallback } from "react";
import { Landmark, Loader2, CheckCircle2, XCircle, AlertCircle, Printer, FileText } from "lucide-react";
import UploadZone from "@/components/UploadZone";
import ChatAssistant from "@/components/ChatAssistant";
import type { CaseStatus, ProductType } from "@/types/domain";

// Import new Credit Memorandum components
import ReportCover from "@/components/report/ReportCover";
import ExecutiveSummary from "@/components/report/ExecutiveSummary";
import BorrowerSnapshot from "@/components/report/BorrowerSnapshot";
import IncomeIntelligence from "@/components/report/IncomeIntelligence";
import CashFlowIntelligence from "@/components/report/CashFlowIntelligence";
import ExpenseIntelligence from "@/components/report/ExpenseIntelligence";
import DebtObligationAnalysis from "@/components/report/DebtObligationAnalysis";
import FinancialBehaviourAnalysis from "@/components/report/FinancialBehaviourAnalysis";
import RiskAssessment from "@/components/report/RiskAssessment";
import AICreditOpinion from "@/components/report/AICreditOpinion";
import SupportingEvidence from "@/components/report/SupportingEvidence";
import AnomaliesPage from "@/components/report/AnomaliesPage";
import AppendixPage from "@/components/report/AppendixPage";

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

  // Active page tab for screen navigation
  const [activeTab, setActiveTab] = useState<number>(0);

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

  const tabs = [
    { id: 0, label: "0.0 Cover Page" },
    { id: 1, label: "1.0 Executive Summary" },
    { id: 2, label: "2.0 Borrower Snapshot" },
    { id: 3, label: "3.0 Income Intelligence" },
    { id: 4, label: "4.0 Cash Flow" },
    { id: 5, label: "5.0 Expense Profile" },
    { id: 6, label: "6.0 Debt & Obligation" },
    { id: 7, label: "7.0 Behaviour Analysis" },
    { id: 8, label: "8.0 Risk Assessment" },
    { id: 9, label: "9.0 AI Credit Opinion" },
    { id: 10, label: "10.0 Supporting Evidence" },
    { id: 11, label: "11.0 Anomalies & Audits" },
    { id: 12, label: "12.0 Technical Appendix" }
  ];

  return (
    <div className="space-y-6">
      {/* Case header */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">{caseInfo.applicantName}</h2>
          <p className="text-xs text-slate-400 mt-1">
            {loanAskLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
                Print Memorandum
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

      {isProcessing && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] py-16 animate-in fade-in duration-300 no-print">
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
      )}

      {!data || !activeReport ? (
        /* No analysis yet: upload statements into this case */
        <div className={`space-y-8 py-6 no-print ${isProcessing ? "hidden" : ""}`}>
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
      ) : !isProcessing ? (
        /* Underwriting Report Memorandum Container */
        <div>
          {/* Multi-Account Switcher (Screen Only) */}
          {data.accounts.length > 1 && (
            <div className="glass-panel rounded-2xl p-4 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-indigo-500/20 no-print">
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
                      onClick={() => {
                        setActiveAccountId(acc.id);
                        setActiveTab(0); // Reset to cover page on switcher change
                      }}
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

          {/* Grid Layout (Screen Only) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start no-print">
            {/* Table of Contents Navigation Sidebar */}
            <div className="lg:col-span-3 glass-panel rounded-2xl p-4 space-y-1.5 lg:sticky lg:top-6">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-2">
                Memorandum Index
              </span>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                      isActive
                        ? "bg-indigo-600/15 text-indigo-300 font-bold border-l-2 border-indigo-500 pl-2.5"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Main Interactive Screen Content */}
            <div className="lg:col-span-9 glass-panel rounded-2xl p-8 min-h-[70vh]">
              {activeTab === 0 && (
                <ReportCover caseInfo={caseInfo} overview={activeReport.overview} />
              )}
              {activeTab === 1 && (
                <ExecutiveSummary
                  overview={activeReport.overview}
                  metrics={activeReport.metrics}
                  foir={activeReport.foir}
                  riskScore={activeReport.risk_score}
                  policy={activeReport.policy}
                  bouncesCount={activeReport.bounce_analysis.length}
                  negativeBalancesCount={activeReport.balance_risks.filter(
                    (r: any) => r.risk_type === "Negative Balance"
                  ).length}
                />
              )}
              {activeTab === 2 && (
                <BorrowerSnapshot
                  overview={activeReport.overview}
                  transactionsCount={activeReport.transactions.length}
                  integrity={activeReport.integrity}
                />
              )}
              {activeTab === 3 && (
                <IncomeIntelligence
                  overview={activeReport.overview}
                  metrics={activeReport.metrics}
                  incomeAnalysis={activeReport.income_analysis}
                />
              )}
              {activeTab === 4 && (
                <CashFlowIntelligence
                  overview={activeReport.overview}
                  metrics={activeReport.metrics}
                  monthlyAnalysis={activeReport.monthly_analysis}
                />
              )}
              {activeTab === 5 && (
                <ExpenseIntelligence
                  overview={activeReport.overview}
                  transactions={activeReport.transactions}
                />
              )}
              {activeTab === 6 && (
                <DebtObligationAnalysis
                  overview={activeReport.overview}
                  metrics={activeReport.metrics}
                  foir={activeReport.foir}
                  liabilityAnalysis={activeReport.liability_analysis}
                />
              )}
              {activeTab === 7 && (
                <FinancialBehaviourAnalysis
                  overview={activeReport.overview}
                  transactions={activeReport.transactions}
                  bouncesCount={activeReport.bounce_analysis.length}
                  negativeBalancesCount={activeReport.balance_risks.filter(
                    (r: any) => r.risk_type === "Negative Balance"
                  ).length}
                />
              )}
              {activeTab === 8 && (
                <RiskAssessment
                  overview={activeReport.overview}
                  riskScore={activeReport.risk_score}
                />
              )}
              {activeTab === 9 && (
                <AICreditOpinion
                  overview={activeReport.overview}
                  metrics={activeReport.metrics}
                  riskScore={activeReport.risk_score}
                  caseId={caseInfo.id}
                  bouncesCount={activeReport.bounce_analysis.length}
                />
              )}
              {activeTab === 10 && (
                <SupportingEvidence
                  overview={activeReport.overview}
                  transactions={activeReport.transactions}
                />
              )}
              {activeTab === 11 && (
                <AnomaliesPage
                  overview={activeReport.overview}
                  bounceAnalysis={activeReport.bounce_analysis}
                  balanceRisks={activeReport.balance_risks}
                  transactions={activeReport.transactions}
                />
              )}
              {activeTab === 12 && (
                <AppendixPage
                  overview={activeReport.overview}
                  integrity={activeReport.integrity}
                  transactions={activeReport.transactions}
                />
              )}
            </div>
          </div>

          {/* Sequential Printable Version (Print Only) */}
          <div className="hidden print:block space-y-12">
            <div className="print-page">
              <ReportCover caseInfo={caseInfo} overview={activeReport.overview} />
            </div>
            <div className="print-page">
              <ExecutiveSummary
                overview={activeReport.overview}
                metrics={activeReport.metrics}
                foir={activeReport.foir}
                riskScore={activeReport.risk_score}
                policy={activeReport.policy}
                bouncesCount={activeReport.bounce_analysis.length}
                negativeBalancesCount={activeReport.balance_risks.filter(
                  (r: any) => r.risk_type === "Negative Balance"
                ).length}
              />
            </div>
            <div className="print-page">
              <BorrowerSnapshot
                overview={activeReport.overview}
                transactionsCount={activeReport.transactions.length}
                integrity={activeReport.integrity}
              />
            </div>
            <div className="print-page">
              <IncomeIntelligence
                overview={activeReport.overview}
                metrics={activeReport.metrics}
                incomeAnalysis={activeReport.income_analysis}
              />
            </div>
            <div className="print-page">
              <CashFlowIntelligence
                overview={activeReport.overview}
                metrics={activeReport.metrics}
                monthlyAnalysis={activeReport.monthly_analysis}
              />
            </div>
            <div className="print-page">
              <ExpenseIntelligence
                overview={activeReport.overview}
                transactions={activeReport.transactions}
              />
            </div>
            <div className="print-page">
              <DebtObligationAnalysis
                overview={activeReport.overview}
                metrics={activeReport.metrics}
                foir={activeReport.foir}
                liabilityAnalysis={activeReport.liability_analysis}
              />
            </div>
            <div className="print-page">
              <FinancialBehaviourAnalysis
                overview={activeReport.overview}
                transactions={activeReport.transactions}
                bouncesCount={activeReport.bounce_analysis.length}
                negativeBalancesCount={activeReport.balance_risks.filter(
                  (r: any) => r.risk_type === "Negative Balance"
                ).length}
              />
            </div>
            <div className="print-page">
              <RiskAssessment
                overview={activeReport.overview}
                riskScore={activeReport.risk_score}
              />
            </div>
            <div className="print-page">
              <AICreditOpinion
                overview={activeReport.overview}
                metrics={activeReport.metrics}
                riskScore={activeReport.risk_score}
                caseId={caseInfo.id}
                bouncesCount={activeReport.bounce_analysis.length}
              />
            </div>
            <div className="print-page">
              <SupportingEvidence
                overview={activeReport.overview}
                transactions={activeReport.transactions}
              />
            </div>
            <div className="print-page">
              <AnomaliesPage
                overview={activeReport.overview}
                bounceAnalysis={activeReport.bounce_analysis}
                balanceRisks={activeReport.balance_risks}
                transactions={activeReport.transactions}
              />
            </div>
            <div className="print-page">
              <AppendixPage
                overview={activeReport.overview}
                integrity={activeReport.integrity}
                transactions={activeReport.transactions}
              />
            </div>
          </div>

          {/* Floating AI Chat Assistant (Screen Only) */}
          <ChatAssistant analysisData={activeReport} />
        </div>
      ) : null}
    </div>
  );
}
