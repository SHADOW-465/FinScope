import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/db/server";
import type { ProductType } from "@/types/domain";

const PRODUCT_TYPES: ProductType[] = [
  "personal",
  "vehicle",
  "gold",
  "msme",
  "lap",
  "working_capital",
];

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Your account has no organization yet. Please finish setup." },
        { status: 409 }
      );
    }

    const body = await req.json();
    const {
      applicantName,
      productType,
      requestedAmount,
      tenureMonths,
      interestRateAnnualPct,
      consentText,
    } = body;

    if (!applicantName || typeof applicantName !== "string" || !applicantName.trim()) {
      return NextResponse.json({ error: "applicantName is required" }, { status: 400 });
    }
    if (!PRODUCT_TYPES.includes(productType)) {
      return NextResponse.json({ error: "Invalid productType" }, { status: 400 });
    }
    const amount = Number(requestedAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "requestedAmount must be a positive number" }, { status: 400 });
    }
    const tenure = Number(tenureMonths);
    if (!Number.isInteger(tenure) || tenure <= 0) {
      return NextResponse.json({ error: "tenureMonths must be a positive integer" }, { status: 400 });
    }
    if (!consentText || typeof consentText !== "string" || !consentText.trim()) {
      return NextResponse.json({ error: "Borrower consent is required to create a case" }, { status: 400 });
    }

    const { data: newCase, error: caseError } = await supabase
      .from("applicant_cases")
      .insert({
        org_id: profile.org_id,
        created_by: user.id,
        applicant_name: applicantName.trim(),
        product_type: productType,
        requested_amount: amount,
        tenure_months: tenure,
        interest_rate_annual_pct:
          interestRateAnnualPct !== undefined && interestRateAnnualPct !== null && interestRateAnnualPct !== ""
            ? Number(interestRateAnnualPct)
            : null,
        status: "draft",
      })
      .select("id")
      .single();

    if (caseError || !newCase) {
      throw new Error(caseError?.message || "Failed to create case");
    }

    const { error: consentError } = await supabase.from("consents").insert({
      case_id: newCase.id,
      org_id: profile.org_id,
      consent_text: consentText.trim(),
      captured_by: user.id,
    });

    if (consentError) {
      throw new Error(consentError.message);
    }

    await supabase.from("audit_log").insert({
      org_id: profile.org_id,
      user_id: user.id,
      action: "case_created",
      target: newCase.id,
      metadata: { applicant_name: applicantName.trim(), product_type: productType },
    });

    return NextResponse.json({ id: newCase.id });
  } catch (error: any) {
    console.error("Case creation failed:", error);
    return NextResponse.json({ error: error.message || "Failed to create case" }, { status: 500 });
  }
}
