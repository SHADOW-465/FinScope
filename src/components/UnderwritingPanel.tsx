"use client";

import React from "react";
import {
  Scale,
  ShieldAlert,
  ShieldCheck,
  BadgeCheck,
  BadgeX,
  BadgeAlert,
  FileWarning,
  FileCheck2,
} from "lucide-react";

interface FOIRBlock {
  existing_obligations: number;
  avg_monthly_income: number;
  pre_loan_pct: number | null;
  indicative_new_emi: number;
  post_loan_pct: number | null;
}

interface PolicyRuleResult {
  id: string;
  label: string;
  passed: boolean;
  severity: "hard" | "soft";
  actual: number | null;
}

interface PolicyBlock {
  policyName: string;
  verdict: "pass" | "review" | "fail";
  allRules: PolicyRuleResult[];
}

interface IntegrityBlock {
  status: "ok" | "warning" | "fail";
  transactionsChecked: number;
  balanceBreaks: Array<{ index: number; date: string; delta: number }>;
}

interface UnderwritingPanelProps {
  foir?: FOIRBlock | null;
  policy?: PolicyBlock | null;
  integrity?: IntegrityBlock | null;
  loanAskLabel?: string | null;
}

const fmt = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

const pct = (val: number | null) => (val === null ? "—" : `${val.toFixed(1)}%`);

export default function UnderwritingPanel({ foir, policy, integrity, loanAskLabel }: UnderwritingPanelProps) {
  if (!foir && !policy && !integrity) return null;

  const verdictStyles: Record<string, string> = {
    pass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40",
    review: "bg-amber-500/10 text-amber-300 border-amber-500/40",
    fail: "bg-red-500/10 text-red-300 border-red-500/40",
  };
  const verdictLabel: Record<string, string> = {
    pass: "Meets Policy",
    review: "Manual Review",
    fail: "Fails Policy",
  };

  return (
    <div className="space-y-4">
      {/* Statement Integrity — deliberately separate from the risk score */}
      {integrity && integrity.status !== "ok" && (
        <div
          className={`glass-panel rounded-2xl p-4 border flex items-start gap-3 no-print ${
            integrity.status === "fail"
              ? "border-red-500/40 bg-red-950/20"
              : "border-amber-500/40 bg-amber-950/10"
          }`}
        >
          <FileWarning
            className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
              integrity.status === "fail" ? "text-red-400" : "text-amber-400"
            }`}
          />
          <div>
            <h4 className="text-sm font-bold text-white">Statement Integrity {integrity.status === "fail" ? "Failure" : "Warning"}</h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {integrity.balanceBreaks.length} of {integrity.transactionsChecked} transactions did not
              reconcile against the running balance. This can indicate a tampered statement or a parsing
              fault — verify the original document before relying on this analysis.
            </p>
          </div>
        </div>
      )}
      {integrity && integrity.status === "ok" && (
        <div className="glass-panel rounded-2xl p-4 border border-emerald-500/20 bg-emerald-950/5 flex items-center gap-3 no-print">
          <FileCheck2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-xs text-slate-300">
            <span className="font-bold text-emerald-300">Statement integrity verified.</span>{" "}
            All {integrity.transactionsChecked} reconcilable rows passed the running-balance check.
          </p>
        </div>
      )}

      {/* FOIR / Eligibility */}
      {foir && (
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-400" />
              FOIR &amp; Eligibility
            </h3>
            {loanAskLabel && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{loanAskLabel}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/80">
              <p className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">Avg Monthly Income</p>
              <p className="text-slate-200 font-bold text-sm mt-1">{fmt(foir.avg_monthly_income)}</p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/80">
              <p className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">Existing EMIs</p>
              <p className="text-slate-200 font-bold text-sm mt-1">{fmt(foir.existing_obligations)}/mo</p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/80">
              <p className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">Indicative New EMI</p>
              <p className="text-indigo-300 font-bold text-sm mt-1">
                {foir.indicative_new_emi > 0 ? `${fmt(foir.indicative_new_emi)}/mo` : "—"}
              </p>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/80">
              <p className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">FOIR pre → post</p>
              <p className="font-bold text-sm mt-1">
                <span className="text-slate-200">{pct(foir.pre_loan_pct)}</span>
                <span className="text-slate-500 mx-1">→</span>
                <span
                  className={
                    foir.post_loan_pct !== null && foir.post_loan_pct > 50
                      ? "text-red-400"
                      : foir.post_loan_pct !== null && foir.post_loan_pct > 40
                        ? "text-amber-400"
                        : "text-emerald-400"
                  }
                >
                  {pct(foir.post_loan_pct)}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lender Policy verdict */}
      {policy && (
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              {policy.verdict === "pass" ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              ) : (
                <ShieldAlert className={`w-5 h-5 ${policy.verdict === "fail" ? "text-red-400" : "text-amber-400"}`} />
              )}
              Lender Policy
            </h3>
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${verdictStyles[policy.verdict]}`}>
              {verdictLabel[policy.verdict]}
            </span>
          </div>

          <p className="text-[10px] text-slate-500 -mt-2">{policy.policyName}</p>

          <div className="space-y-1.5">
            {policy.allRules.map((rule) => (
              <div
                key={rule.id}
                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs ${
                  rule.passed
                    ? "bg-emerald-950/10 border-emerald-500/15 text-slate-300"
                    : rule.severity === "hard"
                      ? "bg-red-950/20 border-red-500/25 text-red-300"
                      : "bg-amber-950/10 border-amber-500/25 text-amber-300"
                }`}
              >
                <span className="flex items-center gap-2">
                  {rule.passed ? (
                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  ) : rule.severity === "hard" ? (
                    <BadgeX className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  ) : (
                    <BadgeAlert className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  )}
                  {rule.label}
                </span>
                {!rule.passed && (
                  <span className="text-[9px] font-bold uppercase tracking-wider opacity-75">
                    {rule.severity === "hard" ? "blocking" : "advisory"}
                  </span>
                )}
              </div>
            ))}
          </div>

          <p className="text-[10px] text-slate-500 leading-relaxed border-t border-slate-800/80 pt-3">
            FinScope produces an evidence-backed recommendation — the lending decision itself is always
            made by a qualified human underwriter.
          </p>
        </div>
      )}
    </div>
  );
}
