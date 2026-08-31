import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-2xl font-semibold text-white">APIS</p>
          <p className="mt-1 text-sm text-white/50">AdPulse Projects Intelligence System</p>
        </div>
        <div className="rounded-md border border-white/10 bg-ink-800 p-6">
          <Suspense fallback={<div className="text-sm text-white/50">Loading...</div>}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-xs text-white/30">
          Internal system for AdPulse IMC Pvt Ltd staff.
        </p>
      </div>
    </div>
  );
}
