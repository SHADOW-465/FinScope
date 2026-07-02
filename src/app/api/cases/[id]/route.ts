import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/db/server";
import type { CaseStatus } from "@/types/domain";

// The lending decision is always a human action (PRD-v2 §B.3): this endpoint
// only records what the signed-in underwriter chose.
const DECISION_STATUSES: CaseStatus[] = ["approved", "declined", "manual_review"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { status } = await req.json();
    if (!DECISION_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${DECISION_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // RLS scopes the update to the caller's org; empty result = not found.
    const { data: updated, error } = await supabase
      .from("applicant_cases")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, org_id")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!updated) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    await supabase.from("audit_log").insert({
      org_id: updated.org_id,
      user_id: user.id,
      action: "decision_recorded",
      target: id,
      metadata: { status },
    });

    return NextResponse.json({ id, status });
  } catch (error: any) {
    console.error("Case decision failed:", error);
    return NextResponse.json({ error: error.message || "Failed to update case" }, { status: 500 });
  }
}
