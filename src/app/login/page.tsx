import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0B132B] via-[#1C2541] to-[#0D9488] px-4 py-12 relative overflow-hidden">
      {/* Ambient gradient lighting */}
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm space-y-6">
        {/* Brand Header with Solid White Logo Container for 100% Crisp Visibility */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-white shadow-2xl border-2 border-white mb-2">
            <img src="/adpulse-logo.png" alt="AdPulse Logo" className="h-14 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-sm">APIS</h1>
          <p className="text-sm font-semibold text-slate-200 drop-shadow-xs">AdPulse Projects Intelligence System</p>
        </div>

        <div className="rounded-card border border-slate-200/80 bg-white p-7 shadow-2xl">
          <Suspense fallback={<div className="text-sm text-subtle text-center py-4">Loading form…</div>}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-xs font-semibold text-white/90 drop-shadow-xs">
          Internal system for AdPulse IMC Pvt Ltd staff.
        </p>
      </div>
    </div>
  );
}
