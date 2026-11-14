import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";

export interface ProjectFilters {
  status?: string;
  priority?: string;
  department?: string;
  search?: string;
}

const projectListSelect = {
  id: true,
  name: true,
  code: true,
  status: true,
  priority: true,
  progressPercent: true,
  expectedCompletionDate: true,
  department: true,
  client: { select: { id: true, name: true, company: true } },
  projectManager: { select: { id: true, name: true } },
  _count: { select: { tasks: { where: { deletedAt: null } }, members: true } },
} as const;

/**
 * Shared by GET /api/projects and the CEO/staff project-list pages so the
 * list rendered in the UI can never drift from what the API returns.
 */
export async function listProjects(session: SessionPayload, filters: ProjectFilters = {}, take?: number) {
  const where: Record<string, unknown> = { deletedAt: null };
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.department) where.department = filters.department;
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { code: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (session.role === "STAFF") {
    where.members = { some: { userId: session.userId } };
  }

  return prisma.project.findMany({
    where,
    select: projectListSelect,
    orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
    take,
  });
}
