import React from "react";

interface BloombergTableProps {
  headers: string[];
  rows: React.ReactNode[][];
  alignments?: Array<"left" | "right" | "center">;
  emptyMessage?: string;
}

export default function BloombergTable({
  headers,
  rows,
  alignments,
  emptyMessage = "No ledger entries identified"
}: BloombergTableProps) {
  return (
    <div className="w-full overflow-x-auto border border-slate-900 bg-slate-950/20 rounded-xl">
      <table className="w-full border-collapse text-xs text-left">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/60 font-mono text-[9px] uppercase tracking-wider text-slate-500">
            {headers.map((h, idx) => {
              const align = alignments?.[idx] || "left";
              const alignCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
              return (
                <th key={idx} className={`px-3 py-2.5 font-bold ${alignCls}`}>
                  {h}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-900">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-6 text-center text-slate-500 font-mono italic">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-900/40 transition-colors">
                {row.map((cell, cIdx) => {
                  const align = alignments?.[cIdx] || "left";
                  const alignCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
                  return (
                    <td
                      key={cIdx}
                      className={`px-3 py-2.5 font-mono font-medium text-slate-300 ${alignCls}`}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
