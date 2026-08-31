import { SelectHTMLAttributes, forwardRef } from "react";
import clsx from "./clsx";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={clsx(
        "w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink focus:border-ink-600",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
