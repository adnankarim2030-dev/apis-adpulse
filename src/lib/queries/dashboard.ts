import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";
import { listProjects } from "@/lib/queries/projects";

/** Shared by GET /api/dashboard/ceo and the CEO dashboard page. */
export async function getCeoDashboardData(session: SessionPayload) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalActiveProjects,
    completedProjects,
    atRiskProjects,
    overdueProjects,
    dueToday,
    dueThisWeek,
    totalStaff,
    activeStaff,
    pendingTasks,
    completedTasks,
    projects,
  ] = await Promise.all([
    prisma.project.count({ where: { deletedAt: null, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    prisma.project.count({ where: { deletedAt: null, status: "COMPLETED" } }),
    prisma.project.count({ where: { deletedAt: null, status: { in: ["AT_RISK", "DELAYED"] } } }),
    prisma.project.count({
      where: { deletedAt: null, status: { notIn: ["COMPLETED", "CANCELLED"] }, expectedCompletionDate: { lt: startOfToday } },
    }),
    prisma.project.count({ where: { deletedAt: null, expectedCompletionDate: { gte: startOfToday, lt: endOfToday } } }),
    prisma.project.count({ where: { deletedAt: null, expectedCompletionDate: { gte: startOfToday, lt: endOfWeek } } }),
    prisma.user.count({ where: { role: "STAFF" } }),
    prisma.user.count({ where: { role: "STAFF", isActive: true } }),
    prisma.task.count({ where: { deletedAt: null, status: { not: "COMPLETED" } } }),
    prisma.task.count({ where: { deletedAt: null, status: "COMPLETED" } }),
    listProjects(session, {}, 25),
  ]);

  return {
    kpis: {
      totalActiveProjects,
      completedProjects,
      atRiskProjects,
      overdueProjects,
      dueToday,
      dueThisWeek,
      totalStaff,
      activeStaff,
      pendingTasks,
      completedTasks,
    },
    projects,
  };
}

/** Shared by GET /api/dashboard/staff and the staff "My Day" page. */
export async function getStaffDashboardData(session: SessionPayload) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  const [dueToday, overdue, upcoming, completed, tasks] = await Promise.all([
    prisma.task.count({
      where: { assignedToId: session.userId, deletedAt: null, status: { not: "COMPLETED" }, dueDate: { gte: startOfToday, lt: endOfToday } },
    }),
    prisma.task.count({
      where: { assignedToId: session.userId, deletedAt: null, status: { not: "COMPLETED" }, dueDate: { lt: startOfToday } },
    }),
    prisma.task.count({
      where: { assignedToId: session.userId, deletedAt: null, status: { not: "COMPLETED" }, dueDate: { gte: endOfToday } },
    }),
    prisma.task.count({ where: { assignedToId: session.userId, deletedAt: null, status: "COMPLETED" } }),
    prisma.task.findMany({
      where: { assignedToId: session.userId, deletedAt: null, status: { not: "COMPLETED" } },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        progressPercent: true,
        projectId: true,
        project: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
    }),
  ]);

  return { counts: { dueToday, overdue, upcoming, completed }, tasks };
}
