import clsx from "@/components/ui/clsx";

export function KpiCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "signal" | "critical";
}) {
  return (
    <div className="rounded-md border border-line bg-paper-card px-4 py-3.5">
      <p className="text-sm text-slate-soft">{label}</p>
      <p
        className={clsx(
          "mt-1 font-display text-2xl font-semibold tabular",
          tone === "signal" && "text-signal-700",
          tone === "critical" && "text-status-critical",
          tone === "default" && "text-ink"
        )}
      >
        {value}
      </p>
    </div>
  );
}
