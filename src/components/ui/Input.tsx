import { InputHTMLAttributes, forwardRef } from "react";
import clsx from "./clsx";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={clsx(
        "w-full rounded-input border border-border bg-surface px-3.5 py-2.5 text-base text-text placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px] transition-colors",
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
      <label htmlFor={htmlFor} className="block text-sm font-medium text-text">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-subtle">{hint}</p>}
      {error && <p className="text-xs text-danger-text">{error}</p>}
    </div>
  );
}
