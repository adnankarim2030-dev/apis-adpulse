import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "./clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "signal";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary: "bg-[#E31E24] text-white hover:bg-[#C6151B] shadow-sm shadow-[#E31E24]/20 disabled:bg-[#E31E24]/50",
  secondary: "bg-white text-[#0F172A] border border-slate-200 hover:bg-slate-50 hover:border-slate-300",
  ghost: "bg-transparent text-[#5B6072] hover:text-[#0F172A] hover:bg-slate-100",
  danger: "bg-[#E31E24] text-white hover:bg-[#C6151B]",
  signal: "bg-[#E31E24] text-white hover:bg-[#C6151B] shadow-sm shadow-[#E31E24]/20 disabled:bg-[#E31E24]/50",
};

const sizes: Record<Size, string> = {
  sm: "px-3.5 py-1.5 text-xs rounded-lg font-medium",
  md: "px-4 py-2 text-sm rounded-xl font-medium",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(
        "inline-flex items-center justify-center gap-2 font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
