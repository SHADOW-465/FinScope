"use client";

import React, { useState } from "react";
import { ArrowUpRight, ShieldAlert, BadgeAlert, Landmark, DollarSign, Wallet, ShieldCheck } from "lucide-react";

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
}

export default function Panels({ income, liabilities, bounces, balanceRisks }: PanelsProps) {
  const [activeTab, setActiveTab] = useState<"income" | "liabilities" | "bounces" | "alerts">("income");

  const fmt = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const tabs = [
    { id: "income", name: "Income Streams", count: income.length },
    { id: "liabilities", name: "EMI Liabilities", count: liabilities.length },
    { id: "bounces", name: "Bounces & Returns", count: bounces.length, warning: bounces.length > 0 },
    { id: "alerts", name: "Balance Alerts", count: balanceRisks.length, warning: balanceRisks.some(r => r.risk_type === "Negative Balance") },
  ];

  return (
    <div className="glass-panel rounded-2xl p-6">
      {/* Tabs Header */}
      <div className="flex border-b border-slate-800/80 overflow-x-auto pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.name}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                tab.warning
                  ? "bg-red-500/20 text-red-400"
                  : tab.count > 0
                  ? "bg-slate-800 text-slate-300"
                  : "bg-slate-900/60 text-slate-500"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="mt-6 min-h-[220px]">
        {/* INCOME TAB */}
        {activeTab === "income" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <p className="text-xs text-slate-400">
              Identified monthly recurring credits, direct deposits, and salary streams:
            </p>
            {income.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-slate-900/30 border border-slate-800/80 rounded-xl">
                <p className="text-sm text-slate-500">No recurring credits detected</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-slate-400 font-semibold">
                      <th className="py-2.5 px-3">Est. Source Name</th>
                      <th className="py-2.5 px-3">Cumulative Amount</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Frequency</th>
                      <th className="py-2.5 px-3 text-right">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {income.map((inc, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/20">
                        <td className="py-3 px-3 font-semibold text-slate-200 flex items-center gap-2">
                          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                          {inc.source}
                        </td>
                        <td className="py-3 px-3 text-slate-200">{fmt(inc.amount)}</td>
                        <td className="py-3 px-3">
                          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20">
                            {inc.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">{inc.frequency}</td>
                        <td className="py-3 px-3 text-right text-slate-400 font-medium">
                          {(inc.confidence * 100).toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* LIABILITIES TAB */}
        {activeTab === "liabilities" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <p className="text-xs text-slate-400">
              Identified loan products, financial institution debits, and regular EMI commitments:
            </p>
            {liabilities.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-emerald-950/10 border border-emerald-500/20 rounded-xl text-center">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mb-2" />
                <p className="text-sm font-semibold text-slate-200">No active liabilities found</p>
                <p className="text-xs text-slate-400">No EMI triggers or finance repayments detected.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-slate-400 font-semibold">
                      <th className="py-2.5 px-3">Detected Lender</th>
                      <th className="py-2.5 px-3">Monthly EMI Payment</th>
                      <th className="py-2.5 px-3">Frequency</th>
                      <th className="py-2.5 px-3 text-right">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {liabilities.map((liab, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/20">
                        <td className="py-3 px-3 font-semibold text-slate-200 flex items-center gap-2">
                          <Landmark className="w-4 h-4 text-amber-400" />
                          {liab.lender}
                        </td>
                        <td className="py-3 px-3 text-amber-400 font-bold">{fmt(liab.emi_amount)}</td>
                        <td className="py-3 px-3 text-slate-300">{liab.frequency}</td>
                        <td className="py-3 px-3 text-right text-slate-400 font-medium">
                          {(liab.confidence * 100).toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* BOUNCES TAB */}
        {activeTab === "bounces" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <p className="text-xs text-slate-400">
              Cheque returns, failed clearing instructions, and non-sufficient funds (NSF) return charges:
            </p>
            {bounces.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-emerald-950/10 border border-emerald-500/20 rounded-xl text-center">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mb-2" />
                <p className="text-sm font-semibold text-slate-200">Zero Payment Returns Flagged</p>
                <p className="text-xs text-slate-400">No cheque bounces or return penalty fees found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-slate-400 font-semibold">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Narration Description</th>
                      <th className="py-2.5 px-3">Transaction Amount</th>
                      <th className="py-2.5 px-3 text-right">Bounce Charge Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {bounces.map((b, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/20 bg-red-950/5">
                        <td className="py-3 px-3 text-slate-300 whitespace-nowrap">{b.date}</td>
                        <td className="py-3 px-3 font-medium text-red-300 break-words max-w-xs">{b.description}</td>
                        <td className="py-3 px-3 text-slate-300">{fmt(b.amount)}</td>
                        <td className="py-3 px-3 text-right text-red-400 font-bold">{fmt(b.charge)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ALERTS TAB */}
        {activeTab === "alerts" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <p className="text-xs text-slate-400">
              Occurrences of negative balances or balance depletion below ₹2,000 threshold:
            </p>
            {balanceRisks.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-emerald-950/10 border border-emerald-500/20 rounded-xl text-center">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mb-2" />
                <p className="text-sm font-semibold text-slate-200">No Balance Alerts Triggered</p>
                <p className="text-xs text-slate-400">The account maintained healthy reserves throughout.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-56 overflow-y-auto pr-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-slate-400 font-semibold">
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
                        className={`hover:bg-slate-900/20 ${
                          risk.risk_type === "Negative Balance" ? "bg-red-950/10" : "bg-amber-950/5"
                        }`}
                      >
                        <td className="py-3 px-3 text-slate-300 whitespace-nowrap">{risk.date}</td>
                        <td className="py-3 px-3 font-semibold">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] border ${
                              risk.risk_type === "Negative Balance"
                                ? "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse"
                                : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            }`}
                          >
                            {risk.risk_type}
                          </span>
                        </td>
                        <td
                          className={`py-3 px-3 font-bold ${
                            risk.risk_type === "Negative Balance" ? "text-red-400" : "text-amber-400"
                          }`}
                        >
                          {fmt(risk.balance)}
                        </td>
                        <td className="py-3 px-3 text-slate-400 truncate max-w-xs">{risk.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
