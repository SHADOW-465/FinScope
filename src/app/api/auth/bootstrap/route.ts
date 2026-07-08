import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/db/server";
import { ensureOrgBootstrap } from "@/lib/db/bootstrap";

export async function POST(req: NextRequest) {
  try {
    const { orgName } = await req.json();
    if (!orgName || typeof orgName !== "string" || !orgName.trim()) {
      return NextResponse.json({ error: "orgName is required" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const result = await ensureOrgBootstrap(supabase, orgName.trim());

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Org bootstrap failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to bootstrap organization" },
      { status: 500 }
    );
  }
}
