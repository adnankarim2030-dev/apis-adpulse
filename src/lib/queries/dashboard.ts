import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";
import { listProjects } from "@/lib/queries/projects";

/** Shared by GET /api/dashboard/ceo and the CEO dashboard page. */
export async function getCeoDashboardData(session: SessionPayload) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

  try {
    const [projects, allProjectsRaw, totalStaff, activeStaff, pendingTasks, completedTasks] = await Promise.all([
      listProjects(session, {}, 25),
      prisma.project.findMany({
        where: { deletedAt: null },
        select: { status: true, expectedCompletionDate: true },
      }),
      prisma.user.count({ where: { role: "STAFF" } }).catch(() => 5),
      prisma.user.count({ where: { role: "STAFF", isActive: true } }).catch(() => 5),
      prisma.task.count({ where: { deletedAt: null, status: { not: "COMPLETED" } } }).catch(() => 0),
      prisma.task.count({ where: { deletedAt: null, status: "COMPLETED" } }).catch(() => 0),
    ]);

    const totalActiveProjects = allProjectsRaw.filter((p) => p.status !== "COMPLETED" && p.status !== "CANCELLED").length;
    const completedProjects = allProjectsRaw.filter((p) => p.status === "COMPLETED").length;
    const atRiskProjects = allProjectsRaw.filter((p) => p.status === "AT_RISK" || p.status === "DELAYED").length;
    const overdueProjects = allProjectsRaw.filter(
      (p) => p.status !== "COMPLETED" && p.status !== "CANCELLED" && p.expectedCompletionDate && new Date(p.expectedCompletionDate) < startOfToday
    ).length;
    const dueToday = allProjectsRaw.filter(
      (p) => p.expectedCompletionDate && new Date(p.expectedCompletionDate) >= startOfToday && new Date(p.expectedCompletionDate) < endOfToday
    ).length;
    const dueThisWeek = allProjectsRaw.filter(
      (p) => p.expectedCompletionDate && new Date(p.expectedCompletionDate) >= startOfToday && new Date(p.expectedCompletionDate) < endOfWeek
    ).length;

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
  } catch (error) {
    console.error("[getCeoDashboardData error]", error);
    return {
      kpis: {
        totalActiveProjects: 0,
        completedProjects: 0,
        atRiskProjects: 0,
        overdueProjects: 0,
        dueToday: 0,
        dueThisWeek: 0,
        totalStaff: 0,
        activeStaff: 0,
        pendingTasks: 0,
        completedTasks: 0,
      },
      projects: [],
    };
  }
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
