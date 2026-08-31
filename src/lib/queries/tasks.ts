import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";

export interface TaskFilters {
  status?: string;
  priority?: string;
  projectId?: string;
  search?: string;
}

const taskListSelect = {
  id: true,
  title: true,
  status: true,
  priority: true,
  dueDate: true,
  progressPercent: true,
  projectId: true,
  project: { select: { id: true, name: true, code: true } },
  assignedTo: { select: { id: true, name: true } },
} as const;

/**
 * Shared by GET /api/tasks and the "My Day" / "My Tasks" staff pages.
 * Staff are always restricted to their own assignments here — object-level
 * authorization lives in one place, not duplicated per caller.
 */
export async function listTasks(session: SessionPayload, filters: TaskFilters = {}) {
  const where: Record<string, unknown> = { deletedAt: null };
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.search) where.title = { contains: filters.search, mode: "insensitive" };

  if (session.role === "STAFF") {
    where.assignedToId = session.userId;
  }

  return prisma.task.findMany({
    where,
    select: taskListSelect,
    orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
  });
}
