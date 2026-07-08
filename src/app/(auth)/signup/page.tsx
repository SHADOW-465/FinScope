"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Loader2, MailCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/db/browser";

export default function SignupPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) throw signUpError;

      if (!data.session) {
        // Project has email confirmation enabled — org bootstrap happens on
        // first sign-in instead (see /login), since there's no session yet.
        setNeedsEmailConfirmation(true);
        return;
      }

      const bootstrapResponse = await fetch("/api/auth/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName }),
      });
      if (!bootstrapResponse.ok) {
        const body = await bootstrapResponse.json().catch(() => ({}));
        throw new Error(body.error || "Failed to set up your organization.");
      }

      router.push("/cases");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to sign up.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (needsEmailConfirmation) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen px-4">
        <div className="glass-panel rounded-2xl p-8 w-full max-w-sm text-center space-y-4">
          <MailCheck className="w-10 h-10 text-indigo-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Check your email</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            We sent a confirmation link to <strong>{email}</strong>. After confirming, sign in
            and we'll finish setting up your organization.
          </p>
          <a
            href="/login"
            className="inline-block mt-2 text-indigo-400 hover:text-indigo-300 text-xs font-semibold"
          >
            Go to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen px-4">
      <div className="glass-panel rounded-2xl p-8 w-full max-w-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <Landmark className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">FinScope</h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
              Create your account
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
          <div>
            <label className="text-xs font-semibold text-slate-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-300">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            Create account
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center">
          Already have an account?{" "}
          <a href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
