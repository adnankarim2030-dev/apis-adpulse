import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "./clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "signal";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink-700 disabled:bg-ink-600/50",
  secondary: "bg-white text-ink border border-line hover:border-ink-600",
  ghost: "bg-transparent text-slate hover:text-ink hover:bg-line-soft",
  danger: "bg-status-critical text-white hover:bg-status-critical/90",
  signal: "bg-signal text-ink hover:bg-signal-600 disabled:bg-signal/50",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
