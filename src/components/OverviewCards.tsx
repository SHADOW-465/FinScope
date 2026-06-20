"use client";

import React from "react";
import { User, CreditCard, Landmark, Calendar, DollarSign, ArrowUpRight, ArrowDownRight, Percent, Award } from "lucide-react";

interface OverviewCardsProps {
  overview: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    statementPeriod: string;
    openingBalance: number;
    closingBalance: number;
    totalCredits: number;
    totalDebits: number;
    averageBalance: number;
    durationMonths: number;
  };
  metrics: {
    avg_monthly_banking: number;
    net_cash_flow: number;
    income_stability: number;
    expense_ratio: number;
    emi_burden: number;
    debt_ratio: number;
    cash_retention: number;
  };
}

export default function OverviewCards({ overview, metrics }: OverviewCardsProps) {
  // Indian Rupee formatting
  const fmt = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const statItems = [
    {
      title: "Average Banking Balance",
      value: fmt(overview.averageBalance),
      desc: "Daily average balance across period",
      icon: <Landmark className="w-5 h-5 text-indigo-400" />,
      color: "text-indigo-400",
    },
    {
      title: "Net Cash Flow",
      value: fmt(metrics.net_cash_flow),
      desc: "Total Credits minus Total Debits",
      icon: metrics.net_cash_flow >= 0 ? (
        <ArrowUpRight className="w-5 h-5 text-emerald-400" />
      ) : (
        <ArrowDownRight className="w-5 h-5 text-rose-400" />
      ),
      color: metrics.net_cash_flow >= 0 ? "text-emerald-400" : "text-rose-400",
    },
    {
      title: "Total Deposits (Credits)",
      value: fmt(overview.totalCredits),
      desc: `Over ${overview.durationMonths} statement month(s)`,
      icon: <ArrowUpRight className="w-5 h-5 text-emerald-400" />,
      color: "text-emerald-400",
    },
    {
      title: "Total Spend (Debits)",
      value: fmt(overview.totalDebits),
      desc: "All debits and cash transfers out",
      icon: <ArrowDownRight className="w-5 h-5 text-rose-400" />,
      color: "text-rose-400",
    },
    {
      title: "EMI Burden Ratio",
      value: `${metrics.emi_burden.toFixed(1)}%`,
      desc: "Share of income committed to loans",
      icon: <Percent className="w-5 h-5 text-amber-400" />,
      color: metrics.emi_burden > 40 ? "text-red-400 font-bold animate-pulse" : "text-amber-400",
    },
    {
      title: "Cash Retention Ratio",
      value: `${metrics.cash_retention.toFixed(1)}%`,
      desc: "Percentage of income saved monthly",
      icon: <Award className="w-5 h-5 text-purple-400" />,
      color: "text-purple-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Account Info Bar */}
      <div className="glass-panel rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl">
            <User className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              Account Holder
            </p>
            <p className="text-sm font-semibold text-slate-200 truncate max-w-[200px]">
              {overview.accountHolder}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl">
            <Landmark className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              Bank Provider
            </p>
            <p className="text-sm font-semibold text-slate-200">
              {overview.bankName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl">
            <CreditCard className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              Account Number
            </p>
            <p className="text-sm font-semibold text-slate-200">
              {overview.accountNumber}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl">
            <Calendar className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              Statement Period
            </p>
            <p className="text-sm font-semibold text-slate-200 truncate max-w-[220px]">
              {overview.statementPeriod}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statItems.map((stat, idx) => (
          <div key={idx} className="glass-panel rounded-2xl p-5 flex flex-col justify-between min-h-[120px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
                {stat.title}
              </span>
              <div className="p-2 bg-slate-900 rounded-lg">
                {stat.icon}
              </div>
            </div>
            <div className="mt-4">
              <h3 className={`text-2xl font-bold tracking-tight ${stat.color}`}>
                {stat.value}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">
                {stat.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
