"use client";

import React, { useState, useMemo } from "react";
import { Search, Filter, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, Sparkles, BrainCircuit } from "lucide-react";

interface Transaction {
  date: string;
  originalDate?: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  transactionType: "DEBIT" | "CREDIT";
  category: string;
  counterparty: string;
  confidenceScore: number;
  fileOrigin?: string;
  /** True when the local ONNX model reclassified this transaction */
  aiEnhanced?: boolean;
}

interface TransactionTableProps {
  transactions: Transaction[];
  /** True while the local AI model is still running inference */
  aiEnhancing?: boolean;
}

export default function TransactionTable({ transactions, aiEnhancing = false }: TransactionTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const fmt = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Get unique categories for filter dropdown
  const categories = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach(t => {
      if (t.category) cats.add(t.category);
    });
    return ["All", ...Array.from(cats)];
  }, [transactions]);

  // Filtered & Searched transactions
  const filteredTransactions = useMemo(() => {
    setCurrentPage(1); // Reset page on filter change
    return transactions.filter(t => {
      const matchSearch =
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.counterparty.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.fileOrigin && t.fileOrigin.toLowerCase().includes(searchTerm.toLowerCase()));
        
      const matchCategory = categoryFilter === "All" || t.category === categoryFilter;
      const matchType =
        typeFilter === "All" ||
        (typeFilter === "CREDIT" && t.transactionType === "CREDIT") ||
        (typeFilter === "DEBIT" && t.transactionType === "DEBIT");

      return matchSearch && matchCategory && matchType;
    });
  }, [transactions, searchTerm, categoryFilter, typeFilter]);

  // Paginated transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(startIndex, startIndex + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));

  // Category Color Map
  const getCategoryClass = (cat: string) => {
    switch (cat) {
      case "Salary":
      case "Business Revenue":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      case "EMI Payment":
      case "Rent":
        return "bg-red-500/10 border-red-500/30 text-red-400";
      case "Utility":
      case "Vendor Payment":
        return "bg-blue-500/10 border-blue-500/30 text-blue-400";
      case "Investment":
        return "bg-purple-500/10 border-purple-500/30 text-purple-400";
      case "ATM Withdrawal":
      case "Cash Deposit":
        return "bg-amber-500/10 border-amber-500/30 text-amber-400";
      default:
        return "bg-slate-800 border-slate-700 text-slate-300";
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Transaction Ledger
        </h3>
        <div className="flex items-center gap-3">
          {aiEnhancing && (
            <span className="flex items-center gap-1.5 text-[10px] text-indigo-400 font-medium animate-pulse">
              <BrainCircuit className="w-3 h-3" />
              AI reclassifying…
            </span>
          )}
          <span className="text-xs text-slate-400 font-medium">
             Showing {filteredTransactions.length} of {transactions.length} items
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search details or file name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/60 border border-slate-800/80 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-500"
          />
        </div>

        {/* Category Filter */}
        <div className="relative flex items-center">
          <Filter className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/60 border border-slate-800/80 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer text-slate-300"
          >
            <option value="All">All Categories</option>
            {categories.filter(c => c !== "All").map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div className="relative flex items-center">
          <Filter className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/60 border border-slate-800/80 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer text-slate-300"
          >
            <option value="All">All Transactions</option>
            <option value="CREDIT">Credits Only</option>
            <option value="DEBIT">Debits Only</option>
          </select>
        </div>

        {/* Page Size Selection */}
        <div className="flex items-center justify-end gap-2 text-xs text-slate-400">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-900/60 border border-slate-800/80 rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800/80 text-slate-400 font-semibold">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Narration Details</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Counterparty</th>
              <th className="py-3 px-4 text-right">Debit (Dr)</th>
              <th className="py-3 px-4 text-right">Credit (Cr)</th>
              <th className="py-3 px-4 text-right">Running Balance</th>
              <th className="py-3 px-4 hidden sm:table-cell">Source File</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {paginatedTransactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No transactions match the selected filters.
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((t, idx) => {
                const isBounce = t.transactionType === "DEBIT" && (
                  t.category === "Bounce" || 
                  (/bounce|nsf|return chq|dishonour|ecs rt|chq return|cheque return|chq rtn/i.test(t.description) && !/transfer/i.test(t.description))
                );

                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      isBounce
                        ? "bg-rose-950/20 hover:bg-rose-950/30 text-rose-200"
                        : "hover:bg-slate-900/20"
                    }`}
                  >
                    <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">{t.originalDate || t.date}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-200 max-w-sm break-words">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className={isBounce ? "text-rose-200 font-semibold" : ""}>
                          {t.description}
                        </span>
                        {isBounce && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[9px] font-bold">
                            ⚠️ Bounce
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] whitespace-nowrap font-medium ${getCategoryClass(t.category)}`}>
                        {t.aiEnhanced && (
                          <span title="Reclassified by on-device AI">
                            <Sparkles className="w-2.5 h-2.5 opacity-70" />
                          </span>
                        )}
                        {t.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium whitespace-nowrap">
                      {t.counterparty}
                    </td>
                    <td className="py-3.5 px-4 text-right text-rose-400 font-semibold">
                      {t.debit > 0 ? (
                        <span className="flex items-center justify-end gap-1">
                          <ArrowDownRight className="w-3.5 h-3.5 text-rose-500/80" />
                          {fmt(t.debit)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-400 font-semibold">
                      {t.credit > 0 ? (
                        <span className="flex items-center justify-end gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500/80" />
                          {fmt(t.credit)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-100 font-bold whitespace-nowrap">
                      {fmt(t.balance)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap max-w-[150px] truncate hidden sm:table-cell" title={t.fileOrigin || "N/A"}>
                      {t.fileOrigin ? (
                        <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
                          {t.fileOrigin}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 text-xs text-slate-400">
        <div>
          Showing {(currentPage - 1) * pageSize + 1} to{" "}
          {Math.min(currentPage * pageSize, filteredTransactions.length)} of{" "}
          {filteredTransactions.length} entries
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="font-semibold text-slate-200">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
