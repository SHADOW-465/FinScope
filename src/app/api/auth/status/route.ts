import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/db/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ authenticated: false, hasOrg: false });
  }

  const { data: existing } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({ authenticated: true, hasOrg: !!existing });
}
