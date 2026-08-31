import { InputHTMLAttributes, forwardRef } from "react";
import clsx from "./clsx";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={clsx(
        "w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-soft focus:border-ink-600",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}

export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-soft">{hint}</p>}
      {error && <p className="text-xs text-status-critical">{error}</p>}
    </div>
  );
}
