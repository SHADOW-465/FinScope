import React from "react";
import SectionHeader from "./SectionHeader";
import BloombergTable from "./BloombergTable";

interface SupportingEvidenceProps {
  overview: {
    bankName: string;
    accountNumber: string;
    statementPeriod: string;
  };
  transactions: Array<{
    date: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
    category: string;
    counterparty: string;
  }>;
}

const fmt = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

export default function SupportingEvidence({
  overview,
  transactions
}: SupportingEvidenceProps) {
  // Extract and sort top 20 highest value transactions for audit evidence
  const topTransactions = [...transactions]
    .sort((a, b) => {
      const valA = Math.max(Number(a.credit) || 0, Number(a.debit) || 0);
      const valB = Math.max(Number(b.credit) || 0, Number(b.debit) || 0);
      return valB - valA;
    })
    .slice(0, 20);

  const tableRows = topTransactions.map((tx) => [
    tx.date,
    <div className="max-w-[250px] truncate" title={tx.description}>{tx.description}</div>,
    <span className="font-semibold text-slate-400">{tx.category}</span>,
    tx.debit > 0 ? <span className="text-red-400 font-bold">{fmt(tx.debit)}</span> : "-",
    tx.credit > 0 ? <span className="text-emerald-400 font-bold">{fmt(tx.credit)}</span> : "-",
    fmt(tx.balance)
  ]);

  return (
    <div className="space-y-6">
      <SectionHeader
        sectionNumber="10.0"
        title="Supporting Evidence Ledger"
        bankName={overview.bankName}
        accountNumber={overview.accountNumber}
        statementPeriod={overview.statementPeriod}
        pageNumber={10}
      />

      <div className="space-y-3">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
          TOP 20 KEY TRANSACTION EVENTS (BY VALUE)
        </span>
        <BloombergTable
          headers={["Transaction Date", "Ledger Narration", "Category", "Debit Outflow", "Credit Inflow", "Running Balance"]}
          rows={tableRows}
          alignments={["left", "left", "left", "right", "right", "right"]}
          emptyMessage="No ledger entries found"
        />
      </div>
    </div>
  );
}
