import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { formatWorkload, formatProjectStatus } from "@/lib/labels";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { friendlyDate } from "@/lib/format";
import clsx from "@/components/ui/clsx";

export default async function PerformancePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [staffUsers, allTasks, allProjects] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STAFF", isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        jobTitle: true,
        department: true,
        assignedTasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            status: true,
            priority: true,
            dueDate: true,
            completedAt: true,
            estimatedHours: true,
            actualHours: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        status: true,
        dueDate: true,
        completedAt: true,
      },
    }),
    prisma.project.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        priority: true,
        progressPercent: true,
        expectedCompletionDate: true,
        tasks: {
          where: { deletedAt: null },
          select: { id: true, status: true },
        },
      },
      orderBy: { priority: "asc" },
    }),
  ]);

  // Overall Company Metrics
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.status === "COMPLETED");
  const onTimeCompleted = completedTasks.filter((t) => {
    if (!t.completedAt || !t.dueDate) return true;
    return new Date(t.completedAt) <= new Date(t.dueDate);
  });
  const overallOnTimeRate =
    completedTasks.length > 0 ? Math.round((onTimeCompleted.length / completedTasks.length) * 100) : 100;
  const totalStuck = allTasks.filter((t) => t.status === "ON_HOLD").length;

  // Staff Performance Metrics
  const staffMetrics = staffUsers.map((staff) => {
    const tasks = staff.assignedTasks;
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "COMPLETED");
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS");
    const stuck = tasks.filter((t) => t.status === "ON_HOLD");

    const onTime = completed.filter((t) => {
      if (!t.completedAt || !t.dueDate) return true;
      return new Date(t.completedAt) <= new Date(t.dueDate);
    });

    const onTimeRate = completed.length > 0 ? Math.round((onTime.length / completed.length) * 100) : 100;
    const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

    // Workload calculation
    const activeTasksCount = inProgress.length + stuck.length;
    let workload: "LOW" | "BALANCED" | "HIGH" | "OVERLOADED" = "BALANCED";
    if (activeTasksCount <= 1) workload = "LOW";
    else if (activeTasksCount <= 3) workload = "BALANCED";
    else if (activeTasksCount <= 5) workload = "HIGH";
    else workload = "OVERLOADED";

    return {
      ...staff,
      total,
      completedCount: completed.length,
      inProgressCount: inProgress.length,
      stuckCount: stuck.length,
      onTimeRate,
      completionRate,
      workload,
    };
  });

  // Sort by completed tasks count (Leaderboard)
  const rankedStaff = [...staffMetrics].sort((a, b) => b.completedCount - a.completedCount);

  const workloadStyles = {
    LOW: "bg-neutral text-subtle border-border",
    BALANCED: "bg-success text-success-text border-success-text/20",
    HIGH: "bg-warning text-warning-text border-warning-text/20",
    OVERLOADED: "bg-danger text-danger-text border-danger-text/20",
  };

  return (
    <AppShell role={session.role} activePath="/performance" name={session.name} userId={session.userId} title="Performance Hub">
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-card border border-border bg-surface p-5 md:p-6 shadow-soft">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-text">
            Completion Performance 📈
          </h2>
          <p className="mt-1 text-sm text-muted">
            Live team completion rates, delivery speed, and workload distribution.
          </p>
        </div>

        {/* 4 Headline Company KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-card border border-border bg-surface p-4 shadow-soft">
            <p className="text-xs font-semibold text-muted">Overall On-Time Rate</p>
            <p className="mt-1 text-2xl font-extrabold text-success-text">{overallOnTimeRate}%</p>
            <p className="text-[11px] text-subtle">Tasks delivered by deadline</p>
          </div>

          <div className="rounded-card border border-border bg-surface p-4 shadow-soft">
            <p className="text-xs font-semibold text-muted">Total Tasks Delivered</p>
            <p className="mt-1 text-2xl font-extrabold text-primary">{completedTasks.length}</p>
            <p className="text-[11px] text-subtle">Completed across all projects</p>
          </div>

          <div className="rounded-card border border-border bg-surface p-4 shadow-soft">
            <p className="text-xs font-semibold text-warning-text">Stuck / Blockers</p>
            <p className="mt-1 text-2xl font-extrabold text-warning-text">{totalStuck}</p>
            <p className="text-[11px] text-subtle">Awaiting client / approval</p>
          </div>

          <div className="rounded-card border border-border bg-surface p-4 shadow-soft">
            <p className="text-xs font-semibold text-muted">Active Projects</p>
            <p className="mt-1 text-2xl font-extrabold text-text">{allProjects.length}</p>
            <p className="text-[11px] text-subtle">Monitored in AdPulse</p>
          </div>
        </div>

        {/* Section 1: Staff Performance Scorecard & Leaderboard */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-text flex items-center gap-2">
              <span>🏆 Staff Productivity & Performance</span>
            </h3>
            <span className="text-xs text-muted">{rankedStaff.length} Members Tracked</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rankedStaff.map((staff, index) => (
              <div
                key={staff.id}
                className="rounded-card border border-border bg-surface p-4 shadow-soft space-y-3 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <Avatar name={staff.name} size={42} />
                      {index < 3 && (
                        <span className="absolute -top-1 -left-1 text-xs">
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-text truncate">{staff.name}</h4>
                      <p className="text-xs text-subtle truncate">
                        {staff.jobTitle || "Team Member"} • {staff.department || "Operations"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={clsx(
                      "inline-flex items-center gap-1 rounded-chip border px-2.5 py-0.5 text-xs font-semibold shrink-0",
                      workloadStyles[staff.workload]
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
                    {formatWorkload(staff.workload)}
                  </span>
                </div>

                {/* Performance Progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted font-medium">
                    <span>Task Completion</span>
                    <span className="font-bold text-text">
                      {staff.completedCount} / {staff.total} ({staff.completionRate}%)
                    </span>
                  </div>
                  <ProgressBar value={staff.completionRate} />
                </div>

                {/* Score breakdown metrics */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-center text-xs">
                  <div className="p-1.5 rounded-button bg-background">
                    <p className="text-muted text-[10px]">On-Time Rate</p>
                    <p className="font-bold text-success-text">{staff.onTimeRate}%</p>
                  </div>
                  <div className="p-1.5 rounded-button bg-background">
                    <p className="text-muted text-[10px]">Working on it</p>
                    <p className="font-bold text-primary">{staff.inProgressCount}</p>
                  </div>
                  <div className="p-1.5 rounded-button bg-background">
                    <p className="text-muted text-[10px]">Stuck</p>
                    <p className="font-bold text-warning-text">{staff.stuckCount}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Project Delivery Progress */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-text">📁 Project Delivery Progress</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allProjects.map((p) => {
              const projectTotalTasks = p.tasks.length;
              const projectDoneTasks = p.tasks.filter((t) => t.status === "COMPLETED").length;
              const ratioPercent =
                projectTotalTasks > 0 ? Math.round((projectDoneTasks / projectTotalTasks) * 100) : 0;

              return (
                <div
                  key={p.id}
                  className="rounded-card border border-border bg-surface p-4 shadow-soft space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-text truncate">{p.name}</h4>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-chip bg-primary-soft text-primary border border-primary-border">
                      {p.code}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted">
                      <span>Tasks Done:</span>
                      <strong className="text-text">
                        {projectDoneTasks}/{projectTotalTasks} ({ratioPercent}%)
                      </strong>
                    </div>
                    <ProgressBar value={ratioPercent} />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border/60 text-muted">
                    <span>Due: {friendlyDate(p.expectedCompletionDate)}</span>
                    <span className="font-semibold text-text">{formatProjectStatus(p.status)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
