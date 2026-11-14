import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "./clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "signal";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover active:scale-[0.98] shadow-sm",
  secondary: "bg-surface text-text border border-border hover:bg-neutral hover:border-border active:scale-[0.98]",
  ghost: "bg-transparent text-muted hover:text-text hover:bg-neutral",
  danger: "bg-danger text-danger-text hover:bg-danger/80",
  signal: "bg-primary text-white hover:bg-primary-hover active:scale-[0.98] shadow-sm",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm min-h-[36px]",
  md: "px-4 py-2.5 text-base min-h-[44px]",
  lg: "px-5 py-3 text-base min-h-[48px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-button font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 select-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
