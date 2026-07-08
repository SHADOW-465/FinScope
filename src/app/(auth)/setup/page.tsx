"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Loader2 } from "lucide-react";

/**
 * Reached after a user confirms their email and logs in for the first time
 * (signup couldn't bootstrap the org because no session existed yet at
 * signup time — see /login and /signup).
 */
export default function SetupPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to set up your organization.");
      }
      router.push("/cases");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to set up your organization.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen px-4">
      <div className="glass-panel rounded-2xl p-8 w-full max-w-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <Landmark className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">One last step</h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
              Name your organization
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300">Organization name</label>
            <input
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. Chennai Credit Partners"
              className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-950/30 border border-red-500/30 text-red-400 rounded-xl text-xs">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
