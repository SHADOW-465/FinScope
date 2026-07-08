import React from "react";

interface ReportCoverProps {
  caseInfo: {
    id: string;
    applicantName: string;
    productLabel: string;
    requestedAmount: number;
    tenureMonths: number;
  };
  overview: {
    bankName: string;
    accountNumber: string;
    statementPeriod: string;
  };
}

const fmt = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

export default function ReportCover({ caseInfo, overview }: ReportCoverProps) {
  return (
    <div className="min-h-[80vh] flex flex-col justify-between border-2 border-slate-800 bg-slate-950/20 rounded-2xl p-12 text-slate-300 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 border-l border-b border-slate-800 text-[10px] font-mono tracking-widest text-slate-500">
        SECURITY LEVEL: STRICTOR CONFIDENTIAL
      </div>

      <div className="space-y-4 pt-16">
        <div className="text-xs font-mono font-bold tracking-widest text-indigo-400 uppercase">
          CREDIT UNDERWRITING PLATFORM
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-100 uppercase">
          Credit Memorandum & Underwriting Opinion
        </h1>
        <div className="w-20 h-1 bg-slate-700 mt-4"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-12 border-t border-b border-slate-800 py-8">
        <div className="space-y-4">
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">BORROWER IDENTIFICATION</span>
            <span className="text-lg font-black text-slate-100 mt-1 block">{caseInfo.applicantName}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">REQUESTED FACILITY</span>
            <span className="text-sm font-bold text-slate-300 mt-1 block">
              {caseInfo.productLabel} ({fmt(caseInfo.requestedAmount)} over {caseInfo.tenureMonths} months)
            </span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">CASE REFERENCE ID</span>
            <span className="text-xs font-mono text-slate-400 mt-1 block">{caseInfo.id}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">SOURCE OF VERIFICATION</span>
            <span className="text-sm font-bold text-slate-300 mt-1 block">
              {overview.bankName} (A/C: {overview.accountNumber})
            </span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">STATEMENT ASSESSMENT PERIOD</span>
            <span className="text-xs font-mono text-slate-400 mt-1 block">{overview.statementPeriod}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">DATE OF REPORT ANALYSIS</span>
            <span className="text-xs font-mono text-slate-400 mt-1 block">{new Date().toLocaleDateString("en-IN")}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 border-t border-slate-900 pt-8 text-center text-[10px] font-mono tracking-wider text-slate-500 uppercase">
        <div className="space-y-8">
          <div className="border-b border-slate-800 pb-2">PREPARED BY</div>
          <div>FINANCIAL CREDIT ANALYST</div>
        </div>
        <div className="space-y-8">
          <div className="border-b border-slate-800 pb-2">REVIEWED BY</div>
          <div>CHIEF RISK OFFICER</div>
        </div>
        <div className="space-y-8">
          <div className="border-b border-slate-800 pb-2">APPROVED BY</div>
          <div>CREDIT COMMITTEE CHAIRMAN</div>
        </div>
      </div>
    </div>
  );
}
