/**
 * Supabase client for Client Components. Uses the publishable/anon key —
 * every query it makes is subject to the RLS policies in
 * supabase/migrations/20260702000000_init.sql, scoped to the signed-in user's
 * organization.
 */
"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    );
  }

  return createBrowserClient<Database>(url, key);
}
