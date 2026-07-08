import React from "react";
import { Check } from "lucide-react";

interface EvidenceItem {
  text: string;
  confidence?: number;
}

interface EvidenceChipsProps {
  items: EvidenceItem[];
  title?: string;
}

export default function EvidenceChips({ items, title = "Supporting Evidence" }: EvidenceChipsProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2 mt-4">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{title}</span>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2.5 p-2 bg-slate-900/40 border border-slate-900 rounded-lg hover:border-slate-800 transition-colors"
          >
            <div className="p-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded mt-0.5 flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-300 leading-normal font-sans break-words">{item.text}</p>
              {item.confidence !== undefined && (
                <span className="text-[9px] font-bold font-mono text-slate-500 block mt-0.5">
                  VERIFIED CONFIDENCE: {item.confidence}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
