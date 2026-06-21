"use client";

import React, { useMemo } from "react";
import { ArrowUpRight, ShieldAlert, BadgeAlert, Landmark, ShieldCheck } from "lucide-react";

interface IncomeSource {
  source: string;
  amount: number;
  category: string;
  frequency: string;
  confidence: number;
}

interface Liability {
  lender: string;
  emi_amount: number;
  frequency: string;
  confidence: number;
}

interface ChequeBounce {
  date: string;
  description: string;
  amount: number;
  charge: number;
}

interface BalanceRisk {
  date: string;
  balance: number;
  description: string;
  risk_type: string;
}

interface PanelsProps {
  income: IncomeSource[];
  liabilities: Liability[];
  bounces: ChequeBounce[];
  balanceRisks: BalanceRisk[];
  durationMonths?: number;
}

export default function Panels({ income, liabilities, bounces, balanceRisks, durationMonths = 1 }: PanelsProps) {
  const fmt = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const hasBounces = bounces.length > 0;
  const hasNegativeBalances = balanceRisks.some(r => r.risk_type === "Negative Balance");

  // Helper to identify Business vs Individual counterparties
  const getSourceType = (source: string): "Business" | "Individual" => {
    const srcLower = source.toLowerCase();
    if (
      /pvt|ltd|limited|inc|corp|co\b|services|technologies|solutions|club|mandram|welfare|association|bank|trust|enterprise|trading|systems|industries/i.test(srcLower)
    ) {
      return "Business";
    }
    return "Individual";
  };

  // Sort income streams descending by cumulative amount
  const sortedIncome = useMemo(() => {
    return [...income].sort((a, b) => b.amount - a.amount);
  }, [income]);

  // Bounces & Returns Cardbox Component
  const bouncesCard = hasBounces && (
    <div className="glass-panel rounded-2xl p-6 border-rose-500/25 bg-rose-950/5 shadow-lg shadow-rose-950/10 animate-in fade-in duration-300">
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
            Bounces & Payment Returns
          </h3>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-rose-500/25 text-rose-300 animate-pulse">
            {bounces.length} flagged
          </span>
        </div>
        <p className="text-xs text-slate-400 leading-normal">
          Failed clearing transactions, cheque returns, and penalty return charges:
        </p>
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 text-slate-400 font-semibold sticky top-0 bg-slate-950/80 backdrop-blur-sm z-10">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Narration Description</th>
                <th className="py-2.5 px-3">Transaction Amount</th>
                <th className="py-2.5 px-3 text-right">Bounce Charge Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {bounces.map((b, idx) => (
                <tr key={idx} className="hover:bg-slate-900/15 bg-rose-950/5">
                  <td className="py-3 px-3 text-slate-300 whitespace-nowrap font-mono">{b.date}</td>
                  <td className="py-3 px-3 font-semibold text-rose-300 max-w-md break-words">{b.description}</td>
                  <td className="py-3 px-3 text-slate-300 whitespace-nowrap font-medium">{fmt(b.amount)}</td>
                  <td className="py-3 px-3 text-right text-rose-400 font-bold whitespace-nowrap">{fmt(b.charge)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 1. If has bounces, render at the very top */}
      {bouncesCard}

      {/* 2. 2-Column Grid for Income & EMI Liabilities on Desktop, Stacked on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* INCOME STREAMS CARDBOX */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between hover:shadow-indigo-500/5 hover:shadow-md transition-all duration-300">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                Income Streams
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {income.length} detected
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-normal">
              Recurring credits, salary deposits, and regular revenue streams (individual or business classification):
            </p>
            {sortedIncome.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-slate-900/30 border border-slate-800/80 rounded-xl min-h-[150px]">
                <p className="text-xs text-slate-500">No recurring credits detected</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[220px] overflow-y-auto pr-1">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-slate-400 font-semibold sticky top-0 bg-slate-950/80 backdrop-blur-sm z-10">
                      <th className="py-2.5 px-2">Source Name</th>
                      <th className="py-2.5 px-2">Type</th>
                      <th className="py-2.5 px-2 text-right">Cumulative Deposits</th>
                      <th className="py-2.5 px-2 text-right">Monthly Avg</th>
                      <th className="py-2.5 px-2 text-right">Conf</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {sortedIncome.map((inc, idx) => {
                      const type = getSourceType(inc.source);
                      const months = durationMonths && durationMonths > 0 ? durationMonths : 1;
                      const avgMonthly = inc.amount / months;

                      return (
                        <tr key={idx} className="hover:bg-slate-900/20">
                          <td className="py-3 px-2 font-semibold text-slate-200 flex items-center gap-1.5 truncate max-w-[130px]" title={inc.source}>
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            {inc.source}
                          </td>
                          <td className="py-3 px-2">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md border ${
                              type === "Business"
                                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/25"
                                : "bg-teal-500/10 text-teal-400 border-teal-500/25"
                            }`}>
                              {type}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right text-slate-200 whitespace-nowrap font-medium">{fmt(inc.amount)}</td>
                          <td className="py-3 px-2 text-right text-emerald-400 whitespace-nowrap font-semibold">{fmt(avgMonthly)}</td>
                          <td className="py-3 px-2 text-right text-slate-400 font-medium">
                            {(inc.confidence * 100).toFixed(0)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* EMI LIABILITIES CARDBOX */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between hover:shadow-indigo-500/5 hover:shadow-md transition-all duration-300">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Landmark className="w-5 h-5 text-amber-400" />
                EMI Liabilities
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {liabilities.length} active
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-normal">
              Active loan products, finance repayments, and regular debt outgoings:
            </p>
            {liabilities.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-emerald-950/5 border border-emerald-500/15 rounded-xl text-center min-h-[150px]">
                <ShieldCheck className="w-7 h-7 text-emerald-400 mb-1" />
                <p className="text-xs font-semibold text-slate-300">No active liabilities found</p>
                <p className="text-[10px] text-slate-500 mt-0.5">No EMI triggers detected.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[220px] overflow-y-auto pr-1">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-slate-400 font-semibold sticky top-0 bg-slate-950/80 backdrop-blur-sm z-10">
                      <th className="py-2.5 px-2">Detected Lender</th>
                      <th className="py-2.5 px-2">Monthly EMI</th>
                      <th className="py-2.5 px-2">Freq</th>
                      <th className="py-2.5 px-2 text-right">Conf</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {liabilities.map((liab, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/20">
                        <td className="py-3 px-2 font-semibold text-slate-200 flex items-center gap-1.5 truncate max-w-[130px]" title={liab.lender}>
                          <Landmark className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          {liab.lender}
                        </td>
                        <td className="py-3 px-2 text-amber-400 font-bold whitespace-nowrap">{fmt(liab.emi_amount)}</td>
                        <td className="py-3 px-2 text-slate-300">{liab.frequency}</td>
                        <td className="py-3 px-2 text-right text-slate-400 font-medium">
                          {(liab.confidence * 100).toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BALANCE ALERTS CARDBOX (Full Width) */}
      <div className={`glass-panel rounded-2xl p-6 transition-all duration-300 ${
        hasNegativeBalances ? "border-amber-500/20 bg-amber-950/5 animate-in fade-in duration-300" : "hover:shadow-indigo-500/5 hover:shadow-md"
      }`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <BadgeAlert className="w-5 h-5 text-amber-400" />
              Balance Alerts
            </h3>
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
              hasNegativeBalances ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-400"
            }`}>
              {balanceRisks.length} events
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-normal">
            Occurrences of negative balances or balance depletion below ₹2,000 threshold:
          </p>
          {balanceRisks.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 bg-emerald-950/5 border border-emerald-500/15 rounded-xl text-center">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mb-1" />
              <p className="text-xs font-semibold text-slate-300">No Balance Alerts Triggered</p>
              <p className="text-[10px] text-slate-500">The account maintained healthy reserves throughout.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-slate-400 font-semibold sticky top-0 bg-slate-950/80 backdrop-blur-sm z-10">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Risk Type</th>
                    <th className="py-2.5 px-3">Trigger Balance</th>
                    <th className="py-2.5 px-3">Narration Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {balanceRisks.map((risk, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-900/15 ${
                        risk.risk_type === "Negative Balance" ? "bg-red-950/10" : "bg-amber-950/5"
                      }`}
                    >
                      <td className="py-3 px-3 text-slate-300 whitespace-nowrap font-mono">{risk.date}</td>
                      <td className="py-3 px-3 font-semibold">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                            risk.risk_type === "Negative Balance"
                              ? "bg-red-500/10 border-red-500/25 text-red-400 animate-pulse"
                              : "bg-amber-500/10 border-amber-500/25 text-amber-400"
                          }`}
                        >
                          {risk.risk_type}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-3 font-bold whitespace-nowrap ${
                          risk.risk_type === "Negative Balance" ? "text-red-400" : "text-amber-400"
                        }`}
                      >
                        {fmt(risk.balance)}
                      </td>
                      <td className="py-3 px-3 text-slate-400 max-w-sm truncate" title={risk.description}>
                        {risk.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
