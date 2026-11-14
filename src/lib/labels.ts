import type { Priority, ProjectStatus, TaskStatus, BlockerReason, StatusRequestKind, StatusResponseStatus, DeadlineOutlook } from "@/types";

export const taskStatusLabels: Record<TaskStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "Working on it",
  ON_HOLD: "Stuck",
  COMPLETED: "Done",
};

export const projectStatusLabels: Record<ProjectStatus, string> = {
  PLANNING: "Planning",
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  AT_RISK: "Needs attention",
  DELAYED: "Late",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const priorityLabels: Record<Priority, string> = {
  CRITICAL: "Urgent",
  HIGH: "High",
  MEDIUM: "Normal",
  LOW: "Low",
};

export const workloadLabels: Record<string, string> = {
  Low: "Light",
  Balanced: "Good",
  High: "Busy",
  Overloaded: "Too much",
};

export const blockerReasonLabels: Record<BlockerReason, string> = {
  WAITING_CLIENT: "Waiting on client",
  WAITING_APPROVAL: "Waiting for approval",
  WAITING_TEAMMATE: "Waiting on teammate",
  TECHNICAL_ISSUE: "Technical issue",
  NEED_INFORMATION: "Need information",
  OTHER: "Other reason",
};

export const statusResponseStatusLabels: Record<StatusResponseStatus, string> = {
  ON_TRACK: "On track",
  SLIGHTLY_LATE: "Slightly late",
  STUCK: "Stuck",
  DONE: "Done",
};

export const deadlineOutlookLabels: Record<DeadlineOutlook, string> = {
  WILL_MEET: "Will meet",
  MAY_NEED_EXTENSION: "May need extension",
  CANNOT_MEET: "Can't meet",
};

export function formatTaskStatus(status: TaskStatus): string {
  return taskStatusLabels[status] ?? status;
}

export function formatProjectStatus(status: ProjectStatus): string {
  return projectStatusLabels[status] ?? status;
}

export function formatPriority(priority: Priority): string {
  return priorityLabels[priority] ?? priority;
}

export function formatWorkload(workload: string): string {
  return workloadLabels[workload] ?? workload;
}

export function formatBlockerReason(reason: BlockerReason): string {
  return blockerReasonLabels[reason] ?? reason;
}
