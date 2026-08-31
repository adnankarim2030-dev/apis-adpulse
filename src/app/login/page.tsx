import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090D16] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-[#E31E24] flex items-center justify-center font-display text-2xl font-bold text-white shadow-lg shadow-[#E31E24]/30">
            A
          </div>
          <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">APIS</h1>
          <p className="mt-1 text-sm text-[#94A3B8]">AdPulse Projects Intelligence System</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#1E293B] p-7 shadow-2xl shadow-black/60 ring-1 ring-[#E31E24]/20">
          <Suspense fallback={<div className="text-sm text-[#94A3B8]">Loading...</div>}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-xs text-[#94A3B8]/60">
          Internal system for AdPulse IMC Pvt Ltd staff.
        </p>
      </div>
    </div>
  );
}
