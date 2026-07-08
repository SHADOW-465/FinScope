import React from "react";
import Link from "next/link";
import { Landmark } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/db/server";
import SignOutButton from "./SignOutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <header className="glass-panel sticky top-0 z-40 px-6 py-4 flex items-center justify-between gap-4 border-b border-slate-800/80 backdrop-blur-md no-print">
        <Link href="/cases" className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <Landmark className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
              FinScope
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
              Case Workspace
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {user?.email && <span className="text-xs text-slate-400 hidden sm:inline">{user.email}</span>}
          <SignOutButton />
        </div>
      </header>

      <main className="flex-grow max-w-[96%] xl:max-w-[98%] 2xl:max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        {children}
      </main>
    </div>
  );
}
