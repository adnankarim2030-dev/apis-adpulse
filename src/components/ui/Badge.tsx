import clsx from "./clsx";
import { titleCase } from "@/lib/format";
import type { Priority, ProjectStatus, TaskStatus } from "@/types";

const statusColor: Record<ProjectStatus | TaskStatus, string> = {
  PLANNING: "bg-slate-100 text-slate-700 border border-slate-200",
  NOT_STARTED: "bg-slate-100 text-slate-700 border border-slate-200",
  IN_PROGRESS: "bg-teal-50 text-teal-700 border border-teal-200/80",
  ON_HOLD: "bg-amber-50 text-amber-700 border border-amber-200/80",
  AT_RISK: "bg-rose-50 text-[#E31E24] border border-rose-200/80 font-semibold",
  DELAYED: "bg-rose-50 text-[#E31E24] border border-rose-200/80 font-semibold",
  COMPLETED: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
  CANCELLED: "bg-slate-100 text-slate-400 line-through border border-slate-200",
};

const priorityColor: Record<Priority, string> = {
  CRITICAL: "bg-rose-50 text-[#E31E24] border border-rose-200/80 font-semibold",
  HIGH: "bg-orange-50 text-orange-700 border border-orange-200/80",
  MEDIUM: "bg-amber-50 text-amber-700 border border-amber-200/80",
  LOW: "bg-slate-100 text-slate-600 border border-slate-200",
};

export function StatusBadge({ status }: { status: ProjectStatus | TaskStatus }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", statusColor[status])}>
      {titleCase(status)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", priorityColor[priority])}>
      {titleCase(priority)}
    </span>
  );
}
