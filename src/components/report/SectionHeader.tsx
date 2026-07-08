import React from "react";

interface SectionHeaderProps {
  sectionNumber: string;
  title: string;
  bankName?: string;
  accountNumber?: string;
  statementPeriod?: string;
  pageNumber: number;
  totalPages?: number;
}

export default function SectionHeader({
  sectionNumber,
  title,
  bankName,
  accountNumber,
  statementPeriod,
  pageNumber,
  totalPages = 12
}: SectionHeaderProps) {
  return (
    <div className="border-b-2 border-slate-800 pb-3 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-2">
      <div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <span>CREDIT UNDERWRITING MEMORANDUM</span>
          {bankName && (
            <>
              <span>•</span>
              <span>{bankName} ({accountNumber})</span>
            </>
          )}
        </div>
        <h2 className="text-lg font-bold text-slate-200 tracking-tight mt-1 flex items-baseline gap-2">
          <span className="font-mono text-slate-500">{sectionNumber}</span>
          <span>{title}</span>
        </h2>
      </div>
      <div className="text-right font-mono text-[10px] text-slate-500 self-end">
        {statementPeriod && <div className="hidden md:block mb-0.5">{statementPeriod}</div>}
        <div>PAGE {pageNumber} / {totalPages}</div>
      </div>
    </div>
  );
}
