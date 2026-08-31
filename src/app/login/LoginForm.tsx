"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error || "Unable to sign in");
        return;
      }
      const next = searchParams.get("next");
      const role = body.data.role;
      router.push(next || (role === "CEO" ? "/ceo/dashboard" : "/staff/my-day"));
      router.refresh();
    } catch {
      setError("Unable to reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-white/80">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-white/15 bg-[#090D16] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24] focus:outline-none transition-all"
          placeholder="you@adpulse.com"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-white/80">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-white/15 bg-[#090D16] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24] focus:outline-none transition-all"
          placeholder="••••••••"
        />
      </div>
      {error && <p className="text-sm font-medium text-[#E31E24]">{error}</p>}
      <Button type="submit" variant="primary" disabled={loading} className="w-full py-2.5 mt-2">
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
