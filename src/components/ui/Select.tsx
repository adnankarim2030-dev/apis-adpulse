import { SelectHTMLAttributes, forwardRef } from "react";
import clsx from "./clsx";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={clsx(
        "w-full rounded-input border border-border bg-surface px-3.5 py-2.5 text-base text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px] transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
