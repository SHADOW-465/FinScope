"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PRODUCT_TYPE_LABELS, type ProductType } from "@/types/domain";

const PRODUCT_TYPES = Object.keys(PRODUCT_TYPE_LABELS) as ProductType[];

const DEFAULT_CONSENT =
  "The applicant has consented to their bank statements being uploaded and analyzed by FinScope " +
  "solely for the purpose of assessing this loan application.";

export default function NewCasePage() {
  const router = useRouter();
  const [applicantName, setApplicantName] = useState("");
  const [productType, setProductType] = useState<ProductType>("personal");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [tenureMonths, setTenureMonths] = useState("");
  const [interestRateAnnualPct, setInterestRateAnnualPct] = useState("");
  const [consentText, setConsentText] = useState(DEFAULT_CONSENT);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantName,
          productType,
          requestedAmount: Number(requestedAmount),
          tenureMonths: Number(tenureMonths),
          interestRateAnnualPct: interestRateAnnualPct ? Number(interestRateAnnualPct) : null,
          consentText,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create case");

      router.push(`/cases/${data.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create case");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">New Case</h2>
        <p className="text-sm text-slate-400 mt-1">
          Capture the applicant and the loan being underwritten. This drives the FOIR and policy checks —
          without it, eligibility math is meaningless.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6 space-y-5">
        <div>
          <label className="text-xs font-semibold text-slate-300">Applicant name</label>
          <input
            type="text"
            required
            value={applicantName}
            onChange={(e) => setApplicantName(e.target.value)}
            className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300">Product</label>
            <select
              value={productType}
              onChange={(e) => setProductType(e.target.value as ProductType)}
              className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {PRODUCT_TYPES.map((pt) => (
                <option key={pt} value={pt}>
                  {PRODUCT_TYPE_LABELS[pt]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-300">Requested amount (₹)</label>
            <input
              type="number"
              min={1}
              required
              value={requestedAmount}
              onChange={(e) => setRequestedAmount(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300">Tenure (months)</label>
            <input
              type="number"
              min={1}
              required
              value={tenureMonths}
              onChange={(e) => setTenureMonths(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-300">
              Interest rate (% p.a., optional)
            </label>
            <input
              type="number"
              min={0}
              step="0.1"
              value={interestRateAnnualPct}
              onChange={(e) => setInterestRateAnnualPct(e.target.value)}
              placeholder="Defaults to 14%"
              className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300">Borrower consent</label>
          <textarea
            required
            rows={3}
            value={consentText}
            onChange={(e) => setConsentText(e.target.value)}
            className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
          />
          <p className="text-[10px] text-slate-500 mt-1">
            Recorded with a timestamp for your compliance records.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/30 border border-red-500/30 text-red-400 rounded-xl text-xs">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Create case
        </button>
      </form>
    </div>
  );
}
