"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Wallet, Flag, ShieldCheck } from "lucide-react";
import { maxLoanForEMI } from "@/lib/engine/foir";

// ponytail: headroom quoted at fixed 14% / 36mo indicative terms; wire the
// actual ask's rate/tenure through the report when a financier asks for it.
const HEADROOM_RATE = 14;
const HEADROOM_MONTHS = 36;

const fmt = (val: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

export default function VerdictBar({ report }: { report: any }) {
  const score: number = report.risk_score.score;
  const policy = report.policy;
  const foir = report.foir;
  const integrity = report.integrity;

  // Verdict: policy owns it when a loan ask exists; else score bands.
  const verdict: "approve" | "review" | "decline" = policy
    ? policy.verdict === "pass" ? "approve" : policy.verdict === "review" ? "review" : "decline"
    : score >= 80 ? "approve" : score >= 60 ? "review" : "decline";

  const V = {
    approve: { label: "Recommend: Approve", icon: CheckCircle2, cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
    review: { label: "Refer: Manual Review", icon: AlertTriangle, cls: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
    decline: { label: "Recommend: Decline", icon: XCircle, cls: "border-red-500/40 bg-red-500/10 text-red-300" },
  }[verdict];
  const VIcon = V.icon;

  // Lending headroom: EMI room under the product's max FOIR, inverted to principal.
  const maxFoirPct: number =
    policy?.allRules?.find((r: any) => r.id === "max_foir")?.threshold ?? 50;
  const income: number = foir?.avg_monthly_income ?? 0;
  const emiHeadroom = Math.max(0, (income * maxFoirPct) / 100 - (foir?.existing_obligations ?? 0));
  const loanHeadroom = maxLoanForEMI(emiHeadroom, HEADROOM_RATE, HEADROOM_MONTHS);

  // Red flags, worst first. Empty list = clean file.
  const flags: string[] = [];
  if (integrity && integrity.status !== "ok")
    flags.push(`${integrity.balanceBreaks.length} balance mismatch(es) — possible tampering or parsing error`);
  if (policy)
    policy.triggeredRules
      .filter((r: any) => r.severity === "hard")
      .forEach((r: any) => flags.push(`Policy: ${r.label} failed`));
  if (report.bounce_analysis.length > 0)
    flags.push(`${report.bounce_analysis.length} cheque/NACH bounce(s)`);
  const negDays = report.balance_risks.filter((r: any) => r.risk_type === "Negative Balance").length;
  if (negDays > 0) flags.push(`${negDays} negative-balance event(s)`);
  if (foir?.post_loan_pct !== null && foir?.post_loan_pct > maxFoirPct)
    flags.push(`Post-loan FOIR ${foir.post_loan_pct.toFixed(1)}% exceeds ${maxFoirPct}% limit`);

  const printFlags = flags.filter(f => !f.includes("balance mismatch"));

  return (
    <div className="glass-panel rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-5 border-slate-700/60">
      {/* Verdict */}
      <div className={`rounded-xl border p-4 flex items-center gap-3 ${V.cls}`}>
        <VIcon className="w-8 h-8 flex-shrink-0" />
        <div>
          <p className="text-base font-black tracking-tight">{V.label}</p>
          <p className="text-[11px] opacity-80 mt-0.5">
            Score {score}/100 · {report.risk_score.risk_level}
            {policy ? ` · ${policy.policyName}` : ""}
          </p>
        </div>
      </div>

      {/* Lending headroom */}
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 flex items-center gap-3">
        <Wallet className="w-8 h-8 text-indigo-400 flex-shrink-0" />
        <div>
          <p className="text-base font-black tracking-tight text-indigo-200">
            {loanHeadroom > 0 ? `Up to ${fmt(loanHeadroom)}` : "No lending headroom"}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {loanHeadroom > 0
              ? `EMI room ${fmt(emiHeadroom)}/mo at ≤${maxFoirPct}% FOIR (indicative, ${HEADROOM_RATE}% · ${HEADROOM_MONTHS}mo)`
              : `Existing obligations consume the ${maxFoirPct}% FOIR limit`}
          </p>
        </div>
      </div>

      {/* Red flags (Screen) */}
      <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 flex items-start gap-3 print:hidden">
        {flags.length === 0 ? (
          <>
            <ShieldCheck className="w-8 h-8 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-base font-black tracking-tight text-emerald-300">Clean file</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No bounces, tampering, or policy breaches detected</p>
            </div>
          </>
        ) : (
          <>
            <Flag className="w-8 h-8 text-rose-400 flex-shrink-0" />
            <ul className="text-[11px] text-rose-200 space-y-1">
              {flags.slice(0, 4).map((f, i) => (
                <li key={i} className="font-semibold">• {f}</li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Red flags (Print) */}
      <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 hidden print:flex items-start gap-3">
        {printFlags.length === 0 ? (
          <>
            <ShieldCheck className="w-8 h-8 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-base font-black tracking-tight text-emerald-300">Clean file</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No bounces or policy breaches detected</p>
            </div>
          </>
        ) : (
          <>
            <Flag className="w-8 h-8 text-rose-400 flex-shrink-0" />
            <ul className="text-[11px] text-rose-200 space-y-1">
              {printFlags.slice(0, 4).map((f, i) => (
                <li key={i} className="font-semibold">• {f}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
