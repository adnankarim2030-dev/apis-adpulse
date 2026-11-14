import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listTasks } from "@/lib/queries/tasks";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { QuickTaskUpdate } from "@/components/tasks/QuickTaskUpdate";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { EmptyState } from "@/components/ui/EmptyState";

interface PageProps {
  searchParams: { status?: string };
}

export default async function MyTasksPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "CEO") redirect("/ceo/dashboard");

  const currentFilter = searchParams.status || "ALL";

  const [tasks, userProjects] = await Promise.all([
    listTasks(session, {
      status: currentFilter === "ALL" ? undefined : currentFilter,
    }),
    prisma.project.findMany({
      where: {
        deletedAt: null,
        members: { some: { userId: session.userId } },
      },
      select: { id: true, name: true, code: true },
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

  const filterChips = [
    { id: "ALL", label: "All", href: "/staff/my-tasks" },
    { id: "IN_PROGRESS", label: "Working on it", href: "/staff/my-tasks?status=IN_PROGRESS" },
    { id: "ON_HOLD", label: "Stuck", href: "/staff/my-tasks?status=ON_HOLD" },
    { id: "COMPLETED", label: "Done", href: "/staff/my-tasks?status=COMPLETED" },
  ];

  return (
    <AppShell role="STAFF" activePath="/staff/my-tasks" name={session.name} title="My Tasks">
      <div className="space-y-6">
        {/* Header row with Filter Chips and Add Task Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {filterChips.map((chip) => {
              const active = currentFilter === chip.id;
              return (
                <Link
                  key={chip.id}
                  href={chip.href}
                  className={`inline-flex items-center justify-center rounded-chip px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all duration-150 min-h-[44px] select-none ${
                    active
                      ? "bg-primary text-white shadow-sm ring-1 ring-primary"
                      : "bg-surface text-muted hover:bg-neutral hover:text-text border border-border"
                  }`}
                >
                  {chip.label}
                </Link>
              );
            })}
          </div>

          <div className="shrink-0">
            <CreateTaskModal projects={availableProjects} />
          </div>
        </div>

        {/* Task Cards List */}
        {tasks.length === 0 ? (
          <div className="rounded-card border border-border bg-surface p-8 text-center space-y-4 shadow-soft">
            <div className="text-4xl">📋</div>
            <h3 className="text-lg font-bold text-text">No tasks found</h3>
            <p className="text-sm text-muted max-w-md mx-auto">
              Nothing matches your current filter. You can add a new task right now.
            </p>
            <div className="pt-2 flex justify-center">
              <CreateTaskModal projects={availableProjects} buttonLabel="+ Add Task" />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <QuickTaskUpdate key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
