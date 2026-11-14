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
        <label htmlFor="email" className="block text-sm font-medium text-text">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-input border border-border bg-surface px-3.5 py-2.5 text-base text-text placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
          placeholder="you@adpulse.com"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-text">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-input border border-border bg-surface px-3.5 py-2.5 text-base text-text placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
          placeholder="••••••••"
        />
      </div>
      {error && (
        <div className="rounded-input bg-danger/15 border border-danger/30 p-3 text-sm text-danger-text">
          {error}
        </div>
      )}
      <Button type="submit" variant="primary" disabled={loading} className="w-full mt-2">
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
