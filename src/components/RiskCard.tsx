"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle } from "lucide-react";

interface RiskCardProps {
  score: number;
  level: string;
  breakdown: Record<string, number>;
  bouncesCount: number;
  emiBurden: number;
  negativeBalancesCount: number;
}

export default function RiskCard({
  score,
  level,
  breakdown,
  bouncesCount,
  emiBurden,
  negativeBalancesCount,
}: RiskCardProps) {
  // SVG Circular Gauge configurations
  const radius = 55;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Determine colors based on risk
  let riskColor = "text-emerald-500 stroke-emerald-500 bg-emerald-500/10 border-emerald-500/30";
  let alertIcon = <ShieldCheck className="w-5 h-5 text-emerald-400" />;
  
  if (score < 40) {
    riskColor = "text-red-500 stroke-red-500 bg-red-500/10 border-red-500/30";
    alertIcon = <ShieldAlert className="w-5 h-5 text-red-400" />;
  } else if (score < 60) {
    riskColor = "text-orange-500 stroke-orange-500 bg-orange-500/10 border-orange-500/30";
    alertIcon = <AlertTriangle className="w-5 h-5 text-orange-400" />;
  } else if (score < 80) {
    riskColor = "text-amber-500 stroke-amber-500 bg-amber-500/10 border-amber-500/30";
    alertIcon = <AlertTriangle className="w-5 h-5 text-amber-400" />;
  }

  // Compile risk highlights/factors
  const signals: Array<{ type: "warning" | "success"; text: string }> = [];

  if (bouncesCount > 0) {
    signals.push({
      type: "warning",
      text: `${bouncesCount} cheque return/ECS fail transaction(s) flagged.`,
    });
  } else {
    signals.push({ type: "success", text: "Zero cheque bounces or ECS returns detected." });
  }

  if (emiBurden > 40) {
    signals.push({
      type: "warning",
      text: `EMI burden is high (${emiBurden.toFixed(0)}% of monthly credits).`,
    });
  } else if (emiBurden > 0) {
    signals.push({
      type: "success",
      text: `EMI burden is low and manageable (${emiBurden.toFixed(0)}%).`,
    });
  } else {
    signals.push({ type: "success", text: "No active lending liabilities identified." });
  }

  if (negativeBalancesCount > 0) {
    signals.push({
      type: "warning",
      text: `${negativeBalancesCount} negative balance event(s) recorded.`,
    });
  } else {
    signals.push({ type: "success", text: "Account maintained positive balance throughout." });
  }

  // Check stability score
  const stability = breakdown["Income Stability"] || 0;
  if (stability < 75) {
    signals.push({
      type: "warning",
      text: `Income flow is inconsistent (stability index: ${stability.toFixed(0)}%).`,
    });
  } else {
    signals.push({
      type: "success",
      text: `Highly consistent monthly credit intervals (${stability.toFixed(0)}%).`,
    });
  }

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col items-center justify-start gap-6 h-auto">
      <div className="w-full flex items-center justify-between border-b border-slate-800/80 pb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Underwriting Score
        </h3>
        <span
          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${riskColor}`}
        >
          {alertIcon}
          {level}
        </span>
      </div>

      {/* SVG Score Circle */}
      <div className="relative flex items-center justify-center my-4">
        <svg className="w-36 h-36 transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="72"
            cy="72"
            r={radius}
            className="stroke-slate-800"
            strokeWidth="10"
            fill="transparent"
          />
          {/* Foreground circle */}
          <circle
            cx="72"
            cy="72"
            r={radius}
            className={`animate-gauge ${riskColor.split(" ")[1]}`}
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-4xl font-extrabold text-white tracking-tight">
            {score}
          </span>
          <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
            out of 100
          </span>
        </div>
      </div>

      {/* Highlights / Underwriting Signals */}
      <div className="w-full space-y-2 mt-2">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
          Underwriting Signals
        </h4>
        {signals.map((sig, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs ${
              sig.type === "warning"
                ? "bg-red-950/20 border-red-500/20 text-red-300"
                : "bg-emerald-950/20 border-emerald-500/20 text-emerald-300"
            }`}
          >
            {sig.type === "warning" ? (
              <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            )}
            <span>{sig.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
