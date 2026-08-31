import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getStaffDashboardData } from "@/lib/queries/dashboard";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { QuickTaskUpdate } from "@/components/tasks/QuickTaskUpdate";
import { EmptyState } from "@/components/ui/EmptyState";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function MyDayPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "CEO") redirect("/ceo/dashboard");

  const { counts, tasks } = await getStaffDashboardData(session);
  const firstName = session.name.split(" ")[0];

  return (
    <AppShell role="STAFF" activePath="/staff/my-day" name={session.name} title="My Day">
      <div className="space-y-7">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">
            {greeting()}, {firstName}
          </h2>
          <p className="mt-1 text-sm text-slate-soft">
            {counts.overdue > 0
              ? `You have ${counts.overdue} overdue task${counts.overdue === 1 ? "" : "s"} that needs attention.`
              : counts.dueToday > 0
              ? `You have ${counts.dueToday} task${counts.dueToday === 1 ? "" : "s"} due today.`
              : "You're on track — nothing urgent right now."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Overdue" value={counts.overdue} tone={counts.overdue > 0 ? "critical" : "default"} />
          <KpiCard label="Due Today" value={counts.dueToday} tone={counts.dueToday > 0 ? "signal" : "default"} />
          <KpiCard label="Upcoming" value={counts.upcoming} />
          <KpiCard label="Completed" value={counts.completed} />
        </div>

        <div>
          <h3 className="mb-3 font-display text-base font-semibold text-ink">My priorities</h3>
          {tasks.length === 0 ? (
            <EmptyState title="No active tasks" description="Nothing assigned to you right now. Check back later or ask your manager." />
          ) : (
            <div className="space-y-2.5">
              {tasks.map((task) => (
                <QuickTaskUpdate key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
