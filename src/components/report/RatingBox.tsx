import React from "react";

interface RatingBoxProps {
  score: number;
  grade: "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "CCC" | "D" | string;
  description?: string;
}

export default function RatingBox({ score, grade, description }: RatingBoxProps) {
  const getColors = (g: string) => {
    const main = g.toUpperCase();
    if (["AAA", "AA", "A"].includes(main)) {
      return {
        bg: "bg-emerald-950/20",
        border: "border-emerald-800/55",
        text: "text-emerald-400"
      };
    }
    if (["BBB", "BB"].includes(main)) {
      return {
        bg: "bg-teal-950/20",
        border: "border-teal-800/55",
        text: "text-teal-400"
      };
    }
    if (["B", "CCC"].includes(main)) {
      return {
        bg: "bg-amber-950/20",
        border: "border-amber-800/55",
        text: "text-amber-400"
      };
    }
    return {
      bg: "bg-red-950/20",
      border: "border-red-800/55",
      text: "text-red-400"
    };
  };

  const style = getColors(grade);

  return (
    <div className="border border-slate-800 bg-slate-950/45 rounded-xl p-4 flex items-center justify-between gap-6">
      <div className="space-y-1">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">UNDERWRITING SCORE & RATING</span>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-black text-slate-100 font-mono tracking-tight">{score}</span>
          <span className="text-xs font-semibold text-slate-400">/ 100</span>
        </div>
        {description && <p className="text-xs text-slate-400 leading-normal">{description}</p>}
      </div>

      <div className={`w-16 h-16 rounded-xl border flex flex-col items-center justify-center font-mono ${style.bg} ${style.border} ${style.text}`}>
        <span className="text-[9px] font-bold opacity-60 leading-none">GRADE</span>
        <span className="text-2xl font-black tracking-tighter mt-1">{grade}</span>
      </div>
    </div>
  );
}
