import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#070D1E] via-[#0B132B] to-[#0A2540] px-4 py-12 relative overflow-hidden">
      {/* Ambient decorative glow */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-700/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm space-y-6">
        {/* Brand Header with Official AdPulse Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/10 backdrop-blur-md shadow-lg border border-white/10 mb-2">
            <img src="/adpulse-logo.png" alt="AdPulse Logo" className="h-14 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">APIS</h1>
          <p className="text-xs font-medium text-slate-300">AdPulse Projects Intelligence System</p>
        </div>

        <div className="rounded-card border border-border bg-surface p-7 shadow-2xl">
          <Suspense fallback={<div className="text-sm text-subtle text-center py-4">Loading form…</div>}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-xs text-slate-400">
          Internal system for AdPulse IMC Pvt Ltd staff.
        </p>
      </div>
    </div>
  );
}
