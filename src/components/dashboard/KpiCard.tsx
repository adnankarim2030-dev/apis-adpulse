import clsx from "@/components/ui/clsx";

export function KpiCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "signal" | "critical" | "warning";
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-soft transition-all duration-150">
      <p className="text-xs font-semibold text-muted tracking-tight">{label}</p>
      <p
        className={clsx(
          "mt-1.5 text-2xl font-bold tabular tracking-tight",
          tone === "signal" && "text-primary",
          tone === "critical" && "text-danger-text",
          tone === "warning" && "text-warning-text",
          tone === "default" && "text-text"
        )}
      >
        {value}
      </p>
    </div>
  );
}
