"use client";

import React, { useState, useCallback } from "react";
import {
  Landmark,
  FileText,
  Download,
  Printer,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Loader2,
} from "lucide-react";
import UploadZone from "@/components/UploadZone";
import ChatAssistant from "@/components/ChatAssistant";

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

// ─── Types ────────────────────────────────────────────────────────────────

interface AccountMeta {
  id: string;
  accountHolder: string;
  bankName: string;
  accountNumber: string;
}

interface AnalysisResult {
  accounts: AccountMeta[];
  reports: Record<string, any>;
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function Home() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [activeAccountId, setActiveAccountId] = useState<string>("");
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  // Active page tab for screen navigation
  const [activeTab, setActiveTab] = useState<number>(0);

  // ── Process Complete handler ──────────────────────────────────────────

  const handleProcessComplete = useCallback((data: AnalysisResult) => {
    setAnalysisResult(data);
    setActiveAccountId(data.accounts[0]?.id || "");
    setIsGlobalLoading(false);
  }, []);

  // ── Reset handler ─────────────────────────────────────────────────────

  const handleReset = () => {
    setAnalysisResult(null);
    setActiveAccountId("");
    setActiveTab(0);
  };

  // ── Derive active report ──

  const activeReport =
    analysisResult && activeAccountId
      ? analysisResult.reports[activeAccountId]
      : null;

  // ── Excel Export ──────────────────────────────────────────────────────

  const handleExportExcel = async () => {
    if (!activeReport) return;
    setIsExportingExcel(true);
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeReport),
      });
      if (!response.ok) throw new Error("Failed to export Excel report");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FinScope_Report_${activeReport.overview.accountNumber || "export"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to download Excel report.");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handlePrint = () => window.print();

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

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* HEADER */}
      <header className="glass-panel sticky top-0 z-40 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 backdrop-blur-md no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <Landmark className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
              FinScope
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
              AI Underwriting Intelligence
            </p>
          </div>
        </div>

        {analysisResult && (
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              {isExportingExcel ? "Exporting..." : "Excel Report"}
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/15"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Memorandum
            </button>
          </div>
        )}
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-grow max-w-[96%] xl:max-w-[98%] 2xl:max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-center">
        {isGlobalLoading && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] py-16 animate-in fade-in duration-300 no-print">
            <div className="glass-panel max-w-lg w-full rounded-2xl p-8 flex flex-col items-center gap-6 border border-indigo-500/25 bg-slate-950/40 backdrop-blur-md shadow-2xl shadow-indigo-950/20 text-center">
              <div className="p-4 bg-indigo-500/10 rounded-full animate-pulse">
                <Landmark className="w-10 h-10 text-indigo-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white tracking-tight">
                  Extracting Financial Ledger
                </h3>
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed mx-auto">
                  Parsing bank statements, validating IFSC headers, and aggregating transaction histories.
                </p>
              </div>
              {/* Indeterminate loader */}
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden relative">
                <div className="bg-indigo-500 h-full rounded-full w-2/3 absolute top-0 animate-shimmer" />
              </div>
            </div>
          </div>
        )}

        {!analysisResult || !activeReport ? (
          /* UPLOAD & PROMPT STATE */
          <div className={`space-y-12 py-10 animate-in fade-in duration-300 no-print ${isGlobalLoading ? "hidden" : ""}`}>
            {/* Tagline */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold uppercase tracking-widest inline-flex items-center gap-1.5 animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                Next-Gen Credit Decisions
              </span>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-none">
                Convert Bank Statements <br />
                Into{" "}
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Lending Intelligence
                </span>
              </h2>
              <p className="text-slate-400 text-base max-w-2xl mx-auto font-medium">
                Analyze deposits, evaluate recurring liabilities, flag payment returns,
                and calculate weighted risk scores. Built for modern underwriting.
              </p>
            </div>

            {/* Drag & Drop Area */}
            <UploadZone
              showLoanAsk
              onProcessStart={() => {
                setIsGlobalLoading(true);
              }}
              onProcessComplete={handleProcessComplete}
              onProcessError={() => setIsGlobalLoading(false)}
            />

            {/* Product Key Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-6">
              <div className="glass-panel p-5 rounded-2xl flex items-start gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">100% Client Privacy</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    Files are processed transiently in-memory and never cached on persistent databases.
                  </p>
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl flex items-start gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Obligation Mapping</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    Accurately map active EMIs, loan payments, and calculate Debt-Service ratios.
                  </p>
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl flex items-start gap-4">
                <div className="p-3 bg-purple-500/10 rounded-xl">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Groq Underwriting Assistant</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    Query customer repayment capacity, income stability, and risk metrics using Llama 3.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ACTIVE DASHBOARD STATE */
          <div className="space-y-6">
            {/* Account Switcher Bar (Only if multiple accounts are detected) */}
            {analysisResult.accounts && analysisResult.accounts.length > 1 && (
              <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-indigo-500/20 no-print animate-in slide-in-from-top-4 duration-300">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    Multiple Accounts Detected
                  </h3>
                  <p className="text-xs text-slate-400">
                    Select a bank account below to view its specific underwriting profile:
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  {analysisResult.accounts.map((acc) => {
                    const isActive = acc.id === activeAccountId;
                    return (
                      <button
                        key={acc.id}
                        onClick={() => {
                          setActiveAccountId(acc.id);
                          setActiveTab(0);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 ${
                          isActive
                            ? "bg-indigo-600/15 border-indigo-500/40 text-indigo-300 shadow-md shadow-indigo-600/5"
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
                  <ReportCover
                    caseInfo={{
                      id: "Direct-Upload-Case",
                      applicantName: activeReport.overview.accountHolder,
                      productLabel: "Direct Underwriting Analysis",
                      requestedAmount: activeReport.overview.totalCredits * 0.3,
                      tenureMonths: 12
                    }}
                    overview={activeReport.overview}
                  />
                )}
                {activeTab === 1 && (
                  <ExecutiveSummary
                    overview={activeReport.overview}
                    metrics={activeReport.metrics}
                    foir={activeReport.foir}
                    riskScore={activeReport.risk_score}
                    policy={activeReport.policy || { verdict: "pass", policyName: "General Credit Guidelines" }}
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
                    caseId="Direct-Upload-Case"
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
                <ReportCover
                  caseInfo={{
                    id: "Direct-Upload-Case",
                    applicantName: activeReport.overview.accountHolder,
                    productLabel: "Direct Underwriting Analysis",
                    requestedAmount: activeReport.overview.totalCredits * 0.3,
                    tenureMonths: 12
                  }}
                  overview={activeReport.overview}
                />
              </div>
              <div className="print-page">
                <ExecutiveSummary
                  overview={activeReport.overview}
                  metrics={activeReport.metrics}
                  foir={activeReport.foir}
                  riskScore={activeReport.risk_score}
                  policy={activeReport.policy || { verdict: "pass", policyName: "General Credit Guidelines" }}
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
                  caseId="Direct-Upload-Case"
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

            {/* Floating Chat Assistant */}
            <ChatAssistant analysisData={activeReport} />
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="py-6 border-t border-slate-900 mt-auto text-center text-xs text-slate-500 no-print">
        <p>
          © {new Date().getFullYear()} FinScope. Deployed on Vercel Free Tier. Powered by
          In-Memory OCR &amp; PDF Extraction + Groq Underwriting AI.
        </p>
      </footer>
    </div>
  );
}
