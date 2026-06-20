"use client";

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MonthlyData {
  month: string;
  credits: number;
  debits: number;
  net_flow: number;
}

interface Transaction {
  date: string;
  balance: number;
}

interface ChartsProps {
  monthlyAnalysis: MonthlyData[];
  transactions: Transaction[];
}

export default function Charts({ monthlyAnalysis, transactions }: ChartsProps) {
  // Format Currency for Y-Axis and Tooltips
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Sample transactions for the Area Chart to avoid performance lags on huge lists (max 120 points)
  const sampledBalanceData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    
    // Sort transactions by date
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    
    // Group transactions by date to take the last balance of each day
    const dailyBalances: Record<string, number> = {};
    sorted.forEach((t) => {
      dailyBalances[t.date] = t.balance;
    });

    const dailyList = Object.entries(dailyBalances).map(([date, balance]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      rawDate: date,
      balance,
    }));

    // Sort chronologically
    dailyList.sort((a, b) => a.rawDate.localeCompare(b.rawDate));

    if (dailyList.length <= 100) return dailyList;

    // Uniformly sample down to 100 points
    const step = dailyList.length / 100;
    const sampled = [];
    for (let i = 0; i < 100; i++) {
      const index = Math.min(Math.floor(i * step), dailyList.length - 1);
      sampled.push(dailyList[index]);
    }
    // Always include the absolute final balance point
    sampled[sampled.length - 1] = dailyList[dailyList.length - 1];
    return sampled;
  }, [transactions]);

  // Custom Dark Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 shadow-xl backdrop-blur-md">
          <p className="text-xs font-semibold text-slate-400 mb-1">{label}</p>
          {payload.map((item: any, idx: number) => (
            <p key={idx} className="text-xs font-bold" style={{ color: item.color || item.fill }}>
              {item.name}: {formatCurrency(item.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Monthly Cash Flow Chart */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col h-[350px]">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4">
          Monthly Cash Flow (Credits vs. Debits)
        </h3>
        <div className="flex-1 w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyAnalysis}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorCredits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="colorDebits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
              <XAxis dataKey="month" stroke="#64748b" tickLine={false} />
              <YAxis
                stroke="#64748b"
                tickLine={false}
                tickFormatter={(tick) => {
                  if (tick >= 100000) return `₹${(tick / 100000).toFixed(1)}L`;
                  if (tick >= 1000) return `₹${(tick / 1000).toFixed(0)}k`;
                  return `₹${tick}`;
                }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.05)" }} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar
                name="Credits (Inflow)"
                dataKey="credits"
                fill="url(#colorCredits)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                name="Debits (Outflow)"
                dataKey="debits"
                fill="url(#colorDebits)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Balance Trend Area Chart */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col h-[350px]">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4">
          Daily Running Balance Trend
        </h3>
        <div className="flex-1 w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={sampledBalanceData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
              <XAxis dataKey="date" stroke="#64748b" tickLine={false} />
              <YAxis
                stroke="#64748b"
                tickLine={false}
                tickFormatter={(tick) => {
                  if (tick >= 100000) return `₹${(tick / 100000).toFixed(1)}L`;
                  if (tick >= 1000) return `₹${(tick / 1000).toFixed(0)}k`;
                  return `₹${tick}`;
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                name="Balance"
                dataKey="balance"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorBalance)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
