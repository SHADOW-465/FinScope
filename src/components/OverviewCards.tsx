"use client";

import React from "react";
import { User, CreditCard, Landmark, Calendar, ArrowUpRight, ArrowDownRight, BarChart2, AlertTriangle } from "lucide-react";

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
  bouncesCount: number;
  totalMonthlyEMIs: number;
}

export default function OverviewCards({
  overview,
  metrics,
  bouncesCount,
  totalMonthlyEMIs,
}: OverviewCardsProps) {
  // Indian Rupee formatting
  const fmt = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const avgMonthlyIncome = overview.totalCredits / Math.max(1, overview.durationMonths);

  const statItems = [
    {
      title: "Total Deposits",
      value: fmt(overview.totalCredits),
      desc: `Total credits over ${overview.durationMonths} month(s)`,
      icon: <ArrowUpRight className="w-5 h-5 text-emerald-400" />,
      color: "text-emerald-400",
      bgClass: "bg-emerald-500/5 border-emerald-500/10",
      iconBg: "bg-emerald-500/10",
    },
    {
      title: "Avg Monthly Income",
      value: fmt(avgMonthlyIncome),
      desc: "Calculated average credits per month",
      icon: <BarChart2 className="w-5 h-5 text-indigo-400" />,
      color: "text-indigo-400",
      bgClass: "bg-indigo-500/5 border-indigo-500/10",
      iconBg: "bg-indigo-500/10",
    },
    {
      title: "Cheque Bounces",
      value: `${bouncesCount} Bounce${bouncesCount !== 1 ? "s" : ""}`,
      desc: bouncesCount > 0 ? "Fails and penalty events detected" : "No cheque return entries",
      icon: <AlertTriangle className="w-5 h-5 text-rose-400" />,
      color: bouncesCount > 0 ? "text-rose-400 font-bold animate-pulse" : "text-slate-400",
      bgClass: bouncesCount > 0 ? "bg-rose-500/10 border-rose-500/25 animate-pulse" : "bg-slate-900/40 border-slate-800/80",
      iconBg: bouncesCount > 0 ? "bg-rose-500/20" : "bg-slate-900",
    },
    {
      title: "Loans",
      value: `${fmt(totalMonthlyEMIs)}/mo`,
      desc: totalMonthlyEMIs > 0 ? "Active monthly debt commitments" : "No active loan EMI patterns",
      icon: <CreditCard className="w-5 h-5 text-amber-400" />,
      color: totalMonthlyEMIs > 0 ? "text-amber-400" : "text-slate-400",
      bgClass: totalMonthlyEMIs > 0 ? "bg-amber-500/5 border-amber-500/15" : "bg-slate-900/40 border-slate-800/80",
      iconBg: totalMonthlyEMIs > 0 ? "bg-amber-500/10" : "bg-slate-900",
    },
    {
      title: "Net Cash Flow",
      value: fmt(metrics.net_cash_flow),
      desc: "Inflows minus outflows over period",
      icon: metrics.net_cash_flow >= 0 ? (
        <ArrowUpRight className="w-5 h-5 text-emerald-400" />
      ) : (
        <ArrowDownRight className="w-5 h-5 text-rose-400" />
      ),
      color: metrics.net_cash_flow >= 0 ? "text-emerald-400" : "text-rose-400",
      bgClass: metrics.net_cash_flow >= 0 ? "bg-emerald-500/5 border-emerald-500/10" : "bg-rose-500/5 border-rose-500/10",
      iconBg: metrics.net_cash_flow >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10",
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statItems.map((stat, idx) => (
          <div
            key={idx}
            className={`glass-panel rounded-2xl p-5 flex flex-col justify-between min-h-[120px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${stat.bgClass} ${
              idx === 4 ? "col-span-2 md:col-span-1" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase truncate">
                {stat.title}
              </span>
              <div className={`p-2 rounded-lg flex-shrink-0 ${stat.iconBg}`}>
                {stat.icon}
              </div>
            </div>
            <div className="mt-4">
              <h3 className={`text-xl sm:text-2xl font-black tracking-tight leading-none ${stat.color}`}>
                {stat.value}
              </h3>
              <p className="text-[9px] text-slate-400 mt-2 font-medium leading-tight">
                {stat.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
