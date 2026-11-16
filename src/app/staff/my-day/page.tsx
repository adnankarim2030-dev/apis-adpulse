import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getStaffDashboardData } from "@/lib/queries/dashboard";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { QuickTaskUpdate } from "@/components/tasks/QuickTaskUpdate";
import { StaffStatusResponseCard } from "@/components/tasks/StaffStatusResponseCard";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { daysUntil } from "@/lib/format";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function MyDayPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "CEO") redirect("/ceo/dashboard");

  const [{ tasks }, pendingRequests, blockers, userProjects, allStaff] = await Promise.all([
    getStaffDashboardData(session),
    prisma.statusRequest.findMany({
      where: { requestedToId: session.userId, status: "PENDING" },
      include: {
        task: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.blocker.findMany({
      where: { resolvedAt: null },
      select: { id: true, taskId: true, reason: true, note: true, createdAt: true, resolvedAt: true },
    }),
    prisma.project.findMany({
      where: {
        deletedAt: null,
        members: { some: { userId: session.userId } },
      },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, jobTitle: true, department: true },
      orderBy: { name: "asc" },
    }),
  ]);

  let availableProjects = userProjects;
  if (availableProjects.length === 0) {
    availableProjects = await prisma.project.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
  }

  const firstName = session.name.split(" ")[0];

  // Map blockers to tasks
  const tasksWithBlockers = tasks.map((t) => ({
    ...t,
    blockers: blockers.filter((b) => b.taskId === t.id),
  }));

  // Hide completed tasks in My Day
  const pendingTasks = tasksWithBlockers.filter((t) => t.status !== "COMPLETED");

  // Divide into 3 groups: Late, Due today, Coming up
  const lateTasks = pendingTasks.filter((t) => {
    const diff = daysUntil(t.dueDate);
    return diff !== null && diff < 0;
  });

  const dueTodayTasks = pendingTasks.filter((t) => {
    const diff = daysUntil(t.dueDate);
    return diff === 0;
  });

  const comingUpTasks = pendingTasks.filter((t) => {
    const diff = daysUntil(t.dueDate);
    return diff === null || diff > 0;
  });

  const totalPending = pendingTasks.length;

  return (
    <AppShell role="STAFF" activePath="/staff/my-day" name={session.name} title="My Day">
      <div className="space-y-6">
        {/* Friendly greeting line with prominent Add Task button */}
        <div className="rounded-card border border-border bg-surface p-5 md:p-6 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-text">
              {getGreeting()}, {firstName} 👋
            </h2>
            <p className="mt-1 text-sm text-muted">
              {lateTasks.length > 0
                ? `You have ${lateTasks.length} late task${lateTasks.length === 1 ? "" : "s"} that need your attention.`
                : dueTodayTasks.length > 0
                ? `You have ${dueTodayTasks.length} task${dueTodayTasks.length === 1 ? "" : "s"} due today.`
                : totalPending > 0
                ? `You have ${totalPending} upcoming task${totalPending === 1 ? "" : "s"} to work on.`
                : "You're completely on track — nothing pending right now."}
            </p>
          </div>

          <div className="shrink-0">
            <CreateTaskModal projects={availableProjects} staffList={allStaff} currentUserId={session.userId} />
          </div>
        </div>

        {/* Highlighted Card at TOP of My Day for Pending CEO Status Requests */}
        {pendingRequests.length > 0 && (
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <StaffStatusResponseCard
                key={req.id}
                request={{
                  id: req.id,
                  taskId: req.taskId,
                  taskTitle: req.task?.title,
                  projectName: req.project?.name,
                  requestedByName: req.requestedBy.name,
                  message: req.message,
                }}
                staffName={session.name}
              />
            ))}
          </div>
        )}

        {totalPending === 0 ? (
          <div className="rounded-card border border-border bg-surface p-8 text-center space-y-4 shadow-soft">
            <div className="text-4xl">🎉</div>
            <h3 className="text-lg font-bold text-text">You&apos;re all caught up!</h3>
            <p className="text-sm text-muted max-w-md mx-auto">
              No pending tasks assigned to you right now. Take a breather or create a new task to work on.
            </p>
            <div className="pt-2 flex justify-center">
              <CreateTaskModal projects={availableProjects} staffList={allStaff} currentUserId={session.userId} buttonLabel="+ Add New Task" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Group 1: Late (Danger tone) */}
            {lateTasks.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-danger-text animate-pulse" />
                  <h3 className="text-base font-bold text-danger-text">
                    Late ({lateTasks.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {lateTasks.map((task) => (
                    <QuickTaskUpdate key={task.id} task={task} />
                  ))}
                </div>
              </section>
            )}

            {/* Group 2: Due Today */}
            {dueTodayTasks.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                  <h3 className="text-base font-bold text-text">
                    Due today ({dueTodayTasks.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {dueTodayTasks.map((task) => (
                    <QuickTaskUpdate key={task.id} task={task} />
                  ))}
                </div>
              </section>
            )}

            {/* Group 3: Coming Up */}
            {comingUpTasks.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-base font-bold text-muted">
                  Coming up ({comingUpTasks.length})
                </h3>
                <div className="space-y-3">
                  {comingUpTasks.map((task) => (
                    <QuickTaskUpdate key={task.id} task={task} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
