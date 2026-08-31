import clsx from "./clsx";

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={clsx("h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/60", className)}>
      <div
        className={clsx(
          "h-full rounded-full transition-all duration-300",
          clamped >= 100 ? "bg-emerald-500" : clamped >= 50 ? "bg-[#14B8A6]" : "bg-[#E31E24]"
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
