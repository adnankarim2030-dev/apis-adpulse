import clsx from "./clsx";

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={clsx("h-1.5 w-full overflow-hidden rounded-full bg-line-soft", className)}>
      <div
        className={clsx("h-full rounded-full", clamped >= 100 ? "bg-status-healthy" : "bg-signal")}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
