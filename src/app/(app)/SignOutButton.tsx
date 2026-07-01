"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      className="px-3 py-2 border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
    >
      <LogOut className="w-3.5 h-3.5" />
      Sign out
    </button>
  );
}
