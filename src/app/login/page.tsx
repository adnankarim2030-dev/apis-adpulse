import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-soft text-primary font-bold text-xl mb-2">
            A
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">APIS</h1>
          <p className="text-sm text-muted">AdPulse Projects Intelligence System</p>
        </div>

        <div className="rounded-card border border-border bg-surface p-7 shadow-soft">
          <Suspense fallback={<div className="text-sm text-subtle text-center py-4">Loading form…</div>}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-xs text-subtle">
          Internal system for AdPulse IMC Pvt Ltd staff.
        </p>
      </div>
    </div>
  );
}
