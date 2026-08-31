import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listTasks } from "@/lib/queries/tasks";
import { AppShell } from "@/components/layout/AppShell";
import { QuickTaskUpdate } from "@/components/tasks/QuickTaskUpdate";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface PageProps {
  searchParams: { status?: string; priority?: string };
}

export default async function MyTasksPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "CEO") redirect("/ceo/dashboard");

  const tasks = await listTasks(session, {
    status: searchParams.status || undefined,
    priority: searchParams.priority || undefined,
  });

  return (
    <AppShell role="STAFF" activePath="/staff/my-tasks" name={session.name} title="My Tasks">
      <form method="get" className="mb-5 flex flex-wrap items-center gap-2">
        <Select name="status" defaultValue={searchParams.status || ""} className="max-w-[170px]">
          <option value="">All statuses</option>
          <option value="NOT_STARTED">Not Started</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="COMPLETED">Completed</option>
        </Select>
        <Select name="priority" defaultValue={searchParams.priority || ""} className="max-w-[150px]">
          <option value="">All priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </Select>
        <Button type="submit" variant="secondary" size="sm">
          Filter
        </Button>
      </form>

      {tasks.length === 0 ? (
        <EmptyState title="No tasks match these filters" description="Try clearing filters — new work will show up here as soon as it's assigned." />
      ) : (
        <div className="space-y-2.5">
          {tasks.map((task) => (
            <QuickTaskUpdate key={task.id} task={task} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
