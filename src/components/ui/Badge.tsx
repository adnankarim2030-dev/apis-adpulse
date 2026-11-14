import clsx from "./clsx";
import type { Priority, ProjectStatus, TaskStatus } from "@/types";
import { formatPriority, formatProjectStatus, formatTaskStatus } from "@/lib/labels";

const statusClasses: Record<ProjectStatus | TaskStatus, string> = {
  PLANNING: "bg-neutral text-neutral-text border-neutral-text/20",
  NOT_STARTED: "bg-neutral text-neutral-text border-neutral-text/20",
  IN_PROGRESS: "bg-info text-info-text border-info-text/20",
  ON_HOLD: "bg-warning text-warning-text border-warning-text/20",
  AT_RISK: "bg-warning text-warning-text border-warning-text/20",
  DELAYED: "bg-danger text-danger-text border-danger-text/20",
  COMPLETED: "bg-success text-success-text border-success-text/20",
  CANCELLED: "bg-neutral text-neutral-text line-through border-neutral-text/20",
};

const priorityClasses: Record<Priority, string> = {
  CRITICAL: "bg-danger text-danger-text border-danger-text/20",
  HIGH: "bg-warning text-warning-text border-warning-text/20",
  MEDIUM: "bg-neutral text-neutral-text border-neutral-text/20",
  LOW: "bg-neutral text-neutral-text border-neutral-text/20",
};

export function StatusBadge({ status }: { status: ProjectStatus | TaskStatus }) {
  const isTask = ["NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED"].includes(status);
  const label = isTask ? formatTaskStatus(status as TaskStatus) : formatProjectStatus(status as ProjectStatus);

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-chip border px-2.5 py-0.5 text-xs font-semibold select-none",
        statusClasses[status]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  // Show a priority badge only for Urgent and High
  if (priority !== "CRITICAL" && priority !== "HIGH") {
    return null;
  }

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-chip border px-2.5 py-0.5 text-xs font-semibold select-none",
        priorityClasses[priority]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {formatPriority(priority)}
    </span>
  );
}
