import { prisma } from "@/lib/prisma";

export type WorkloadLevel = "Low" | "Balanced" | "High" | "Overloaded";

function workloadFromActiveCount(activeCount: number): WorkloadLevel {
  if (activeCount === 0) return "Low";
  if (activeCount <= 4) return "Balanced";
  if (activeCount <= 8) return "High";
  return "Overloaded";
}

/** Shared by GET /api/staff and the CEO "Staff" page. */
export async function listStaffWithWorkload() {
  const staff = await prisma.user.findMany({
    where: { role: "STAFF" },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      jobTitle: true,
      isActive: true,
      _count: {
        select: { assignedTasks: { where: { deletedAt: null, status: { not: "COMPLETED" } } } },
      },
      assignedTasks: {
        where: { deletedAt: null, status: { not: "COMPLETED" } },
        select: { priority: true, dueDate: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const now = new Date();
  return staff.map((member) => {
    const overdue = member.assignedTasks.filter((t) => t.dueDate && t.dueDate < now).length;
    const critical = member.assignedTasks.filter((t) => t.priority === "CRITICAL").length;
    const activeCount = member._count.assignedTasks;

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      department: member.department,
      jobTitle: member.jobTitle,
      isActive: member.isActive,
      activeTasks: activeCount,
      overdueTasks: overdue,
      criticalTasks: critical,
      workload: workloadFromActiveCount(activeCount),
    };
  });
}

/** Shared by GET /api/staff/:id/workload and the CEO staff detail page. */
export async function getStaffWorkloadDetail(staffId: string) {
  const staff = await prisma.user.findFirst({ where: { id: staffId, role: "STAFF" } });
  if (!staff) return null;

  const now = new Date();
  const [activeTasks, overdueTasks, completedTasks, projectMemberships] = await Promise.all([
    prisma.task.findMany({
      where: { assignedToId: staffId, deletedAt: null, status: { not: "COMPLETED" } },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        progressPercent: true,
        project: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
    }),
    prisma.task.count({
      where: { assignedToId: staffId, deletedAt: null, status: { not: "COMPLETED" }, dueDate: { lt: now } },
    }),
    prisma.task.count({ where: { assignedToId: staffId, deletedAt: null, status: "COMPLETED" } }),
    prisma.projectMember.findMany({
      where: { userId: staffId },
      select: { project: { select: { id: true, name: true, code: true, status: true, priority: true } } },
    }),
  ]);

  const criticalTasks = activeTasks.filter((t) => t.priority === "CRITICAL").length;
  const upcomingDeadlines = activeTasks.filter(
    (t) => t.dueDate && t.dueDate >= now && t.dueDate.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000
  ).length;

  return {
    staff: {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      department: staff.department,
      jobTitle: staff.jobTitle,
    },
    summary: {
      activeTasks: activeTasks.length,
      criticalTasks,
      overdueTasks,
      completedTasks,
      upcomingDeadlines,
      activeProjects: projectMemberships.length,
      workload: workloadFromActiveCount(activeTasks.length),
    },
    tasks: activeTasks,
    projects: projectMemberships.map((m) => m.project),
  };
}
