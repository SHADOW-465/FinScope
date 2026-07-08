import React from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface DecisionBoxProps {
  title: string;
  verdict: "Strong" | "Moderate" | "Weak" | "Pass" | "Fail" | "Refer" | string;
  description: string;
  metricLabel: string;
  metricValue: string;
  confidence: number;
}

export default function DecisionBox({
  title,
  verdict,
  description,
  metricLabel,
  metricValue,
  confidence
}: DecisionBoxProps) {
  const isPass = ["strong", "pass", "approve"].includes(verdict.toLowerCase());
  const isFail = ["weak", "fail", "decline"].includes(verdict.toLowerCase());

  let icon = <AlertTriangle className="w-4 h-4 text-amber-400" />;
  let badgeCls = "bg-amber-950/20 text-amber-400 border-amber-800/55";
  if (isPass) {
    icon = <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    badgeCls = "bg-emerald-950/20 text-emerald-400 border-emerald-800/55";
  } else if (isFail) {
    icon = <XCircle className="w-4 h-4 text-red-400" />;
    badgeCls = "bg-red-950/20 text-red-400 border-red-800/55";
  }

  return (
    <div className="border border-slate-800 bg-slate-950/80 rounded-xl p-4 flex flex-col md:flex-row items-stretch justify-between gap-4 mt-6">
      <div className="space-y-1.5 max-w-xl">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{title}</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${badgeCls}`}>
            {icon}
            {verdict.toUpperCase()}
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed font-sans">{description}</p>
      </div>

      <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-6 min-w-[150px]">
        <div className="text-left md:text-right">
          <span className="text-[9px] font-bold text-slate-500 uppercase block leading-none">{metricLabel}</span>
          <span className="text-base font-black text-slate-100 font-mono tracking-tight mt-1 block">
            {metricValue}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-bold text-slate-500 uppercase block leading-none">Confidence</span>
          <span className="text-xs font-bold text-slate-400 font-mono block mt-1">
            {confidence}%
          </span>
        </div>
      </div>
    </div>
  );
}
