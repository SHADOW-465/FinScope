"use client";

import React, { useState, useCallback, useRef } from "react";
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
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import UploadZone from "@/components/UploadZone";
import RiskCard from "@/components/RiskCard";
import OverviewCards from "@/components/OverviewCards";
import Charts from "@/components/Charts";
import Panels from "@/components/Panels";
import TransactionTable from "@/components/TransactionTable";
import ChatAssistant from "@/components/ChatAssistant";
import type { LocalClassifierProgress } from "@/lib/engine/local-classifier";

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

// ─── AI Enhancement Status Badge ─────────────────────────────────────────

function AIEnhancementBadge({ progress }: { progress: LocalClassifierProgress | null }) {
  if (!progress || progress.status === "idle") return null;

  if (progress.status === "loading") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-medium">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading AI model…
      </div>
    );
  }

  if (progress.status === "running") {
    const pct = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-medium">
        <BrainCircuit className="w-3.5 h-3.5 animate-pulse" />
        AI enhancing… {pct}% ({progress.processed}/{progress.total})
      </div>
    );
  }

  if (progress.status === "done" && progress.total > 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-medium">
        <CheckCircle2 className="w-3.5 h-3.5" />
        AI enhanced {progress.enhanced} transaction{progress.enhanced !== 1 ? "s" : ""}
      </div>
    );
  }

  if (progress.status === "error") {
    return (
      <div
        title={progress.error}
        className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-xs font-medium cursor-help"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        AI offline – keyword classifier active
      </div>
    );
  }

  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function Home() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [activeAccountId, setActiveAccountId] = useState<string>("");
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  /**
   * Enhanced reports: after the API returns, the local ONNX model runs in the
   * background and gradually replaces per-account transaction arrays.
   * We keep this separate from `analysisResult` so the initial results appear
   * instantly without waiting for the AI model to download or infer.
   */
  const [enhancedReports, setEnhancedReports] = useState<Record<string, any>>({});
  const [classifierProgress, setClassifierProgress] = useState<LocalClassifierProgress | null>(null);

  // We use a ref to abort enhancement if the user clicks Reset mid-flight
  const enhancementAbortRef = useRef(false);

  // ── Process Complete handler ──────────────────────────────────────────

  const handleProcessComplete = useCallback(async (data: AnalysisResult) => {
    setAnalysisResult(data);
    setEnhancedReports({});
    setClassifierProgress(null);
    enhancementAbortRef.current = false;

    if (data.accounts && data.accounts.length > 0) {
      setActiveAccountId(data.accounts[0].id);
    }

    // Run local AI enhancement in the background (non-blocking)
    // Dynamic import so the ONNX bundle is never part of the initial page load
    try {
      const { enhanceClassifications } = await import("@/lib/engine/local-classifier");

      for (const accountId of Object.keys(data.reports)) {
        if (enhancementAbortRef.current) break;

        const report = data.reports[accountId];
        const enhanced = await enhanceClassifications(
          report.transactions,
          (progress) => {
            if (!enhancementAbortRef.current) {
              setClassifierProgress(progress);
            }
          }
        );

        if (!enhancementAbortRef.current) {
          setEnhancedReports((prev) => ({
            ...prev,
            [accountId]: { ...report, transactions: enhanced },
          }));
        }
      }
    } catch (err) {
      console.warn("[FinScope] Local AI classifier unavailable:", err);
      setClassifierProgress({
        status: "error",
        processed: 0,
        total: 0,
        enhanced: 0,
        error: String(err),
      });
    }
  }, []);

  // ── Reset handler ─────────────────────────────────────────────────────

  const handleReset = () => {
    enhancementAbortRef.current = true; // abort any in-flight enhancement
    setAnalysisResult(null);
    setActiveAccountId("");
    setEnhancedReports({});
    setClassifierProgress(null);
  };

  // ── Derive active report (enhanced if available, else raw API result) ──

  const activeReport =
    analysisResult && activeAccountId
      ? enhancedReports[activeAccountId] ?? analysisResult.reports[activeAccountId]
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
      <header className="glass-panel sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b border-slate-800/80 backdrop-blur-md no-print">
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
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* AI enhancement status */}
            <AIEnhancementBadge progress={classifierProgress} />

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
        {!analysisResult || !activeReport ? (
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
            <UploadZone onProcessComplete={handleProcessComplete} />

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
                  <BrainCircuit className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">On-Device AI Classifier</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    DistilBERT ONNX model runs locally in your browser to reclassify ambiguous transactions.
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

            {/* Dashboard Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Primary Left Columns */}
              <div className="lg:col-span-8 space-y-6">
                <OverviewCards overview={activeReport.overview} metrics={activeReport.metrics} />

                <Charts monthlyAnalysis={activeReport.monthly_analysis} transactions={activeReport.transactions} />

                <div className="print-page-break" />

                <TransactionTable
                  transactions={activeReport.transactions}
                  aiEnhancing={classifierProgress?.status === "loading" || classifierProgress?.status === "running"}
                />

                <div className="print-page-break" />

                <Panels
                  income={activeReport.income_analysis}
                  liabilities={activeReport.liability_analysis}
                  bounces={activeReport.bounce_analysis}
                  balanceRisks={activeReport.balance_risks}
                />
              </div>

              {/* Sidebar Right Column */}
              <div className="lg:col-span-4 lg:sticky lg:top-24">
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
          In-Memory OCR &amp; PDF Extraction + On-Device DistilBERT AI.
        </p>
      </footer>
    </div>
  );
}
