"use client";

import React, { useState } from "react";
import { Sparkles, Loader2, ThumbsUp, AlertTriangle } from "lucide-react";

interface Summary {
  strengths: string[];
  concerns: string[];
  recommendation: "approve" | "approve_with_conditions" | "manual_review" | "decline";
  evidence: string[];
}

const REC_LABELS: Record<Summary["recommendation"], { label: string; cls: string }> = {
  approve: { label: "Approve", cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40" },
  approve_with_conditions: { label: "Approve with Conditions", cls: "bg-teal-500/10 text-teal-300 border-teal-500/40" },
  manual_review: { label: "Manual Review", cls: "bg-amber-500/10 text-amber-300 border-amber-500/40" },
  decline: { label: "Decline", cls: "bg-red-500/10 text-red-300 border-red-500/40" },
};

export default function AISummaryCard({ report, caseId }: { report: any; caseId?: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report, caseId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to generate summary");
      setSummary(body.summary);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          AI Credit Opinion
        </h3>
        {summary && (
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${REC_LABELS[summary.recommendation].cls}`}>
            {REC_LABELS[summary.recommendation].label}
          </span>
        )}
      </div>

      {!summary ? (
        <>
          <p className="text-xs text-slate-400 leading-relaxed">
            Generate an evidence-constrained narrative opinion. Every statement is validated against the
            computed metrics — the model cannot invent numbers.
          </p>
          {error && (
            <p className="text-xs text-red-400 bg-red-950/30 border border-red-500/30 rounded-xl p-3">{error}</p>
          )}
          <button
            onClick={generate}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 no-print"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isLoading ? "Analyzing..." : "Generate Opinion"}
          </button>
        </>
      ) : (
        <div className="space-y-3 text-xs">
          {summary.strengths.length > 0 && (
            <div>
              <h4 className="font-bold text-emerald-300 flex items-center gap-1.5 mb-1.5">
                <ThumbsUp className="w-3.5 h-3.5" /> Strengths
              </h4>
              <ul className="space-y-1 text-slate-300 list-disc list-inside">
                {summary.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          {summary.concerns.length > 0 && (
            <div>
              <h4 className="font-bold text-amber-300 flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Concerns
              </h4>
              <ul className="space-y-1 text-slate-300 list-disc list-inside">
                {summary.concerns.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
          <p className="text-[10px] text-slate-500 border-t border-slate-800/80 pt-2">
            AI-generated from computed metrics only. The lending decision rests with a human underwriter.
          </p>
        </div>
      )}
    </div>
  );
}
