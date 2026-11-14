import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { QuickTaskUpdate } from "@/components/tasks/QuickTaskUpdate";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { Avatar } from "@/components/ui/Avatar";
import { friendlyDate } from "@/lib/format";
import type { TaskStatus, Priority } from "@/types";

interface TasksPageProps {
  searchParams: {
    status?: string;
    projectId?: string;
    assigneeId?: string;
    search?: string;
    view?: string;
  };
}

export default async function TotalTasksPage({ searchParams }: TasksPageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const currentStatus = searchParams.status || "ALL";
  const currentProject = searchParams.projectId || "";
  const currentAssignee = searchParams.assigneeId || "";
  const currentSearch = searchParams.search || "";
  const currentView = searchParams.view || "LIST"; // 'LIST' or 'BOARD'

  const [
    projects,
    staffList,
    totalCount,
    inProgressCount,
    onHoldCount,
    completedCount,
    notStartedCount,
    rawTasks,
  ] = await Promise.all([
    prisma.project.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "STAFF", isActive: true },
      select: { id: true, name: true, jobTitle: true, department: true },
      orderBy: { name: "asc" },
    }),
    prisma.task.count({ where: { deletedAt: null } }),
    prisma.task.count({ where: { deletedAt: null, status: "IN_PROGRESS" } }),
    prisma.task.count({ where: { deletedAt: null, status: "ON_HOLD" } }),
    prisma.task.count({ where: { deletedAt: null, status: "COMPLETED" } }),
    prisma.task.count({ where: { deletedAt: null, status: "NOT_STARTED" } }),
    prisma.task.findMany({
      where: {
        deletedAt: null,
        ...(currentStatus !== "ALL" ? { status: currentStatus as TaskStatus } : {}),
        ...(currentProject ? { projectId: currentProject } : {}),
        ...(currentAssignee ? { assignedToId: currentAssignee } : {}),
        ...(currentSearch
          ? {
              OR: [
                { title: { contains: currentSearch, mode: "insensitive" } },
                { description: { contains: currentSearch, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        assignedTo: { select: { id: true, name: true, jobTitle: true, department: true } },
        blockers: {
          where: { resolvedAt: null },
          select: { id: true, reason: true, note: true, createdAt: true, resolvedAt: true },
        },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const tasks = rawTasks.map((t) => ({
    ...t,
    startDate: t.startDate ? t.startDate.toISOString() : null,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    deletedAt: t.deletedAt ? t.deletedAt.toISOString() : null,
    blockers: t.blockers.map((b) => ({
      ...b,
      taskId: t.id,
      createdAt: b.createdAt.toISOString(),
      resolvedAt: b.resolvedAt ? b.resolvedAt.toISOString() : null,
    })),
  }));

  const statusChips = [
    { id: "ALL", label: `All (${totalCount})` },
    { id: "IN_PROGRESS", label: `Working on it (${inProgressCount})` },
    { id: "ON_HOLD", label: `Stuck (${onHoldCount})` },
    { id: "COMPLETED", label: `Done (${completedCount})` },
    { id: "NOT_STARTED", label: `Not started (${notStartedCount})` },
  ];

  return (
    <AppShell role={session.role} activePath="/tasks" name={session.name} title="Task Status Hub">
      <div className="space-y-6">
        {/* Header with Title and Add Task Modal */}
        <div className="rounded-card border border-border bg-surface p-5 md:p-6 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-text">
              Total Task Status 🗂️
            </h2>
            <p className="mt-1 text-sm text-muted">
              Overview of all tasks across projects, team workloads, and real-time statuses.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <CreateTaskModal
              projects={projects}
              staffList={staffList}
              currentUserId={session.userId}
              buttonLabel="+ Add Task"
            />
          </div>
        </div>

        {/* 4 Headline Status KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-card border border-border bg-surface p-4 shadow-soft">
            <p className="text-xs font-semibold text-muted">Working on it</p>
            <p className="mt-1 text-2xl font-extrabold text-primary">{inProgressCount}</p>
            <p className="text-[11px] text-subtle">Active in-flight tasks</p>
          </div>

          <div className="rounded-card border border-border bg-surface p-4 shadow-soft">
            <p className="text-xs font-semibold text-warning-text flex items-center gap-1">
              <span>⚠️ Stuck / Blockers</span>
            </p>
            <p className="mt-1 text-2xl font-extrabold text-warning-text">{onHoldCount}</p>
            <p className="text-[11px] text-subtle">Needs manager / client resolution</p>
          </div>

          <div className="rounded-card border border-border bg-surface p-4 shadow-soft">
            <p className="text-xs font-semibold text-success-text">Completed Tasks</p>
            <p className="mt-1 text-2xl font-extrabold text-success-text">{completedCount}</p>
            <p className="text-[11px] text-subtle">Done and delivered</p>
          </div>

          <div className="rounded-card border border-border bg-surface p-4 shadow-soft">
            <p className="text-xs font-semibold text-muted">Not Started</p>
            <p className="mt-1 text-2xl font-extrabold text-text">{notStartedCount}</p>
            <p className="text-[11px] text-subtle">Queued up in backlog</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="rounded-card border border-border bg-surface p-4 shadow-soft space-y-3">
          {/* Status Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {statusChips.map((chip) => {
              const active = currentStatus === chip.id;
              const params = new URLSearchParams();
              if (chip.id !== "ALL") params.set("status", chip.id);
              if (currentProject) params.set("projectId", currentProject);
              if (currentAssignee) params.set("assigneeId", currentAssignee);
              if (currentSearch) params.set("search", currentSearch);
              if (currentView !== "LIST") params.set("view", currentView);
              const href = `/tasks?${params.toString()}`;

              return (
                <Link
                  key={chip.id}
                  href={href}
                  className={`inline-flex items-center justify-center rounded-chip px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 min-h-[38px] select-none ${
                    active
                      ? "bg-primary text-white shadow-xs"
                      : "bg-background text-muted hover:bg-neutral hover:text-text border border-border"
                  }`}
                >
                  {chip.label}
                </Link>
              );
            })}
          </div>

          {/* Search & Dropdowns Row */}
          <form method="GET" action="/tasks" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input type="hidden" name="status" value={currentStatus} />
            <input type="hidden" name="view" value={currentView} />

            {/* Keyword Search */}
            <input
              type="text"
              name="search"
              defaultValue={currentSearch}
              placeholder="🔍 Search tasks..."
              className="w-full rounded-input border border-border bg-background px-3 py-2 text-xs text-text placeholder:text-subtle focus:border-primary focus:outline-none min-h-[40px]"
            />

            {/* Filter by Project */}
            <select
              name="projectId"
              defaultValue={currentProject}
              className="w-full rounded-input border border-border bg-background px-3 py-2 text-xs text-text focus:border-primary focus:outline-none min-h-[40px]"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Filter by Assignee */}
            <div className="flex gap-2">
              <select
                name="assigneeId"
                defaultValue={currentAssignee}
                className="w-full rounded-input border border-border bg-background px-3 py-2 text-xs text-text focus:border-primary focus:outline-none min-h-[40px]"
              >
                <option value="">All Team Members</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="rounded-button bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 shrink-0 min-h-[40px] transition-colors"
              >
                Filter
              </button>
            </div>
          </form>
        </div>

        {/* Task List / Board */}
        {tasks.length === 0 ? (
          <div className="rounded-card border border-border bg-surface p-12 text-center space-y-3 shadow-soft">
            <div className="text-4xl">📭</div>
            <h3 className="text-lg font-bold text-text">No tasks found</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              No tasks match your selected filter criteria. Try changing filters or add a new task.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="relative">
                <QuickTaskUpdate task={task as any} />
                {/* Assignee pill in corner if assigned */}
                {task.assignedTo && (
                  <div className="mt-1 flex items-center gap-1.5 px-4 text-xs text-muted">
                    <span>Assigned to:</span>
                    <strong className="text-text flex items-center gap-1">
                      <Avatar name={task.assignedTo.name} size={18} />
                      {task.assignedTo.name} ({task.assignedTo.jobTitle || "Staff"})
                    </strong>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
