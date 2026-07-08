/**
 * Supabase clients for server-side code (Route Handlers, Server Actions,
 * Server Components). Server-only module — never import this from a Client
 * Component.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * Session-bound client. Reads/writes go through the signed-in user's JWT, so
 * every query is filtered by the RLS org-isolation policies — this is the
 * client nearly all server code should use.
 */
export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component render — safe to ignore because
          // middleware.ts refreshes the session on every request.
        }
      },
    },
  });
}

// ponytail: no service-role client — RLS + the bootstrap_organization RPC
// cover everything the app does; add one only when a real admin path needs it.
