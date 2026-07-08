import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, FileText, Clock } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/db/server";
import { PRODUCT_TYPE_LABELS, type ProductType, type CaseStatus } from "@/types/domain";

const STATUS_STYLES: Record<CaseStatus, string> = {
  draft: "bg-slate-800 text-slate-300 border-slate-700",
  processing: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
  ready: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  declined: "bg-red-500/10 text-red-300 border-red-500/30",
  manual_review: "bg-amber-500/10 text-amber-300 border-amber-500/30",
};

interface CaseRow {
  id: string;
  applicant_name: string;
  product_type: ProductType;
  requested_amount: number;
  tenure_months: number;
  status: CaseStatus;
  created_at: string;
}

export default async function CasesListPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/setup");

  const { data: cases } = await supabase
    .from("applicant_cases")
    .select("id, applicant_name, product_type, requested_amount, tenure_months, status, created_at")
    .order("created_at", { ascending: false });

  const rows = (cases || []) as CaseRow[];

  const fmt = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Cases</h2>
          <p className="text-sm text-slate-400 mt-1">Applicant underwriting cases for your organization.</p>
        </div>
        <Link
          href="/cases/new"
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/15"
        >
          <Plus className="w-4 h-4" />
          New Case
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 flex flex-col items-center text-center gap-3">
          <FileText className="w-10 h-10 text-slate-600" />
          <h3 className="text-lg font-bold text-white">No cases yet</h3>
          <p className="text-sm text-slate-400 max-w-md">
            Create a case to capture the applicant and the loan they're requesting, then upload their bank
            statements to run the underwriting engine.
          </p>
          <Link
            href="/cases/new"
            className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all"
          >
            Create your first case
          </Link>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800/80 text-slate-400 text-xs uppercase tracking-wider">
                <th className="py-3 px-5">Applicant</th>
                <th className="py-3 px-5">Product</th>
                <th className="py-3 px-5 text-right">Requested</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-slate-900/30 transition-colors">
                  <td className="py-3 px-5">
                    <Link href={`/cases/${c.id}`} className="font-semibold text-slate-200 hover:text-indigo-300">
                      {c.applicant_name}
                    </Link>
                  </td>
                  <td className="py-3 px-5 text-slate-300">{PRODUCT_TYPE_LABELS[c.product_type]}</td>
                  <td className="py-3 px-5 text-right text-slate-300">
                    {fmt(c.requested_amount)} / {c.tenure_months}mo
                  </td>
                  <td className="py-3 px-5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[c.status]}`}>
                      {c.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right text-slate-400 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(c.created_at).toLocaleDateString("en-IN")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
