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
  BarChart2,
  Loader2,
} from "lucide-react";
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
              Print / PDF
            </button>
          </div>
        )}
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-grow max-w-[96%] xl:max-w-[98%] 2xl:max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-center">
        {isGlobalLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] py-16 animate-in fade-in duration-300">
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
        ) : !analysisResult || !activeReport ? (
          /* UPLOAD & PROMPT STATE */
          <div className="space-y-12 py-10 animate-in fade-in duration-300">
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
                  <h4 className="text-sm font-semibold text-slate-200">NVIDIA NIM AI Assistant</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    Query customer repayment capacity, income stability, and risk metrics using Llama 3.1.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ACTIVE DASHBOARD STATE */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Print Header (Visible ONLY on print media) */}
            <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold">FinScope Underwriting Report</h1>
                  <p className="text-sm text-slate-600">Generated: {new Date().toLocaleDateString("en-IN")}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">Risk Score: {activeReport.risk_score.score} / 100</p>
                  <p className="text-xs font-semibold uppercase">{activeReport.risk_score.risk_level}</p>
                </div>
              </div>
            </div>

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
                        onClick={() => setActiveAccountId(acc.id)}
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

            {/* Decision hero: the answer first, evidence below */}
            <VerdictBar report={activeReport} />

            {/* Dashboard Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Primary Left Columns */}
              <div className="lg:col-span-8 space-y-6 order-2 lg:order-1">
                <OverviewCards
                  overview={activeReport.overview}
                  metrics={activeReport.metrics}
                  bouncesCount={activeReport.bounce_analysis.length}
                  totalMonthlyEMIs={activeReport.liability_analysis.reduce((sum: number, l: any) => sum + l.emi_amount, 0)}
                />

                <Charts monthlyAnalysis={activeReport.monthly_analysis} transactions={activeReport.transactions} />

                <div className="print-page-break" />

                <TransactionTable
                  transactions={activeReport.transactions}
                />

                <div className="print-page-break" />

                <Panels
                  income={activeReport.income_analysis}
                  liabilities={activeReport.liability_analysis}
                  bounces={activeReport.bounce_analysis}
                  balanceRisks={activeReport.balance_risks}
                  durationMonths={activeReport.overview.durationMonths}
                />
              </div>

              {/* Sidebar Right Column */}
              <div className="lg:col-span-4 lg:sticky lg:top-24 order-1 lg:order-2 space-y-4">
                <UnderwritingPanel
                  foir={activeReport.foir}
                  policy={activeReport.policy}
                  integrity={activeReport.integrity}
                />
                <AISummaryCard report={activeReport} />
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

            {/* Floating Chat Assistant */}
            <ChatAssistant analysisData={activeReport} />
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="py-6 border-t border-slate-900 mt-auto text-center text-xs text-slate-500 no-print">
        <p>
          © {new Date().getFullYear()} FinScope. Deployed on Vercel Free Tier. Powered by
          In-Memory OCR &amp; PDF Extraction + NVIDIA NIM AI.
        </p>
      </footer>
    </div>
  );
}
