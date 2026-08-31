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
    <div className="rounded-xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm shadow-slate-200/40 transition-all hover:border-slate-300">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">{label}</p>
      <p
        className={clsx(
          "mt-1.5 font-display text-2xl font-bold tabular tracking-tight",
          tone === "signal" && "text-[#14B8A6]",
          tone === "critical" && "text-[#E31E24]",
          tone === "default" && "text-[#0F172A]"
        )}
      >
        {value}
      </p>
    </div>
  );
}
