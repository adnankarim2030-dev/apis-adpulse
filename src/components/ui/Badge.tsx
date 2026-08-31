import clsx from "./clsx";
import { titleCase } from "@/lib/format";
import type { Priority, ProjectStatus, TaskStatus } from "@/types";

const statusColor: Record<ProjectStatus | TaskStatus, string> = {
  PLANNING: "bg-line-soft text-slate",
  NOT_STARTED: "bg-line-soft text-slate",
  IN_PROGRESS: "bg-status-info/10 text-status-info",
  ON_HOLD: "bg-status-watch/10 text-status-watch",
  AT_RISK: "bg-status-risk/10 text-status-risk",
  DELAYED: "bg-status-risk/10 text-status-risk",
  COMPLETED: "bg-status-healthy/10 text-status-healthy",
  CANCELLED: "bg-line-soft text-slate line-through",
};

const priorityColor: Record<Priority, string> = {
  CRITICAL: "bg-status-critical/10 text-status-critical",
  HIGH: "bg-status-risk/10 text-status-risk",
  MEDIUM: "bg-status-watch/10 text-status-watch",
  LOW: "bg-line-soft text-slate",
};

export function StatusBadge({ status }: { status: ProjectStatus | TaskStatus }) {
  return (
    <span className={clsx("inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium", statusColor[status])}>
      {titleCase(status)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={clsx("inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium", priorityColor[priority])}>
      {titleCase(priority)}
    </span>
  );
}
