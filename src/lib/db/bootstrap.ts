/**
 * First-run org bootstrap. A brand-new signup has no `public.users` row yet,
 * so nothing in the app is visible to them until one exists. This calls the
 * `bootstrap_organization` SECURITY DEFINER RPC (see the init migration),
 * which creates the organization + the caller's user row atomically, scoped
 * strictly to auth.uid().
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface BootstrapResult {
  alreadyBootstrapped: boolean;
  orgId: string | null;
}

export async function ensureOrgBootstrap(
  supabase: SupabaseClient,
  orgName: string
): Promise<BootstrapResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ensureOrgBootstrap requires an authenticated session");
  }

  const { data: existing } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    return { alreadyBootstrapped: true, orgId: existing.org_id };
  }

  const { data: newOrgId, error } = await supabase.rpc("bootstrap_organization", {
    org_name: orgName,
  });

  if (error) {
    throw new Error(`Failed to bootstrap organization: ${error.message}`);
  }

  return { alreadyBootstrapped: false, orgId: newOrgId as string };
}
