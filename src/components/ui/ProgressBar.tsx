import clsx from "./clsx";

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={clsx("h-2 w-full overflow-hidden rounded-full bg-neutral", className)}>
      <div
        className={clsx(
          "h-full rounded-full transition-all duration-300",
          clamped >= 100 ? "bg-success-text" : "bg-primary"
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
