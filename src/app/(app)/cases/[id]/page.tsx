import React from "react";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/db/server";
import { rebuildCaseReport } from "@/lib/report/rebuild";
import { PRODUCT_TYPE_LABELS, type CaseStatus, type ProductType } from "@/types/domain";
import CaseWorkspace from "./CaseWorkspace";

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: caseRow } = await supabase
    .from("applicant_cases")
    .select("id, applicant_name, product_type, requested_amount, tenure_months, interest_rate_annual_pct, status")
    .eq("id", id)
    .maybeSingle();

  if (!caseRow) notFound();

  // Rebuild the dashboard from persisted transactions (null when nothing
  // has been uploaded yet). Metrics are recomputed by the same engines the
  // upload path uses — nothing numeric is served stale.
  const initialData = await rebuildCaseReport(supabase, id);

  return (
    <CaseWorkspace
      caseInfo={{
        id: caseRow.id,
        applicantName: caseRow.applicant_name,
        productType: caseRow.product_type as ProductType,
        productLabel: PRODUCT_TYPE_LABELS[caseRow.product_type as ProductType],
        requestedAmount: caseRow.requested_amount,
        tenureMonths: caseRow.tenure_months,
        status: caseRow.status as CaseStatus,
      }}
      initialData={initialData}
    />
  );
}
