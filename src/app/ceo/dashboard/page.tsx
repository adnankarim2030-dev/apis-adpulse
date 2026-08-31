import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCeoDashboardData } from "@/lib/queries/dashboard";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, daysUntil } from "@/lib/format";

export default async function CeoDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "CEO") redirect("/login");

  const { kpis, projects } = await getCeoDashboardData(session);

  const needsAttention = projects.filter(
    (p) =>
      p.status === "AT_RISK" ||
      p.status === "DELAYED" ||
      (p.expectedCompletionDate && daysUntil(p.expectedCompletionDate) !== null && (daysUntil(p.expectedCompletionDate) as number) < 0 && p.status !== "COMPLETED")
  );

  return (
    <AppShell role="CEO" activePath="/ceo/dashboard" name={session.name} title="Dashboard">
      <div className="space-y-8">
        <section>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <KpiCard label="Active Projects" value={kpis.totalActiveProjects} />
            <KpiCard label="Completed" value={kpis.completedProjects} />
            <KpiCard label="At Risk / Delayed" value={kpis.atRiskProjects} tone={kpis.atRiskProjects > 0 ? "critical" : "default"} />
            <KpiCard label="Overdue" value={kpis.overdueProjects} tone={kpis.overdueProjects > 0 ? "critical" : "default"} />
            <KpiCard label="Due This Week" value={kpis.dueThisWeek} tone="signal" />
            <KpiCard label="Due Today" value={kpis.dueToday} />
            <KpiCard label="Total Staff" value={kpis.totalStaff} />
            <KpiCard label="Active Staff" value={kpis.activeStaff} />
            <KpiCard label="Pending Tasks" value={kpis.pendingTasks} />
            <KpiCard label="Completed Tasks" value={kpis.completedTasks} />
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink">Needs your attention</h2>
            <span className="text-sm text-slate-soft">{needsAttention.length} project{needsAttention.length === 1 ? "" : "s"}</span>
          </div>
          {needsAttention.length === 0 ? (
            <EmptyState title="Nothing urgent right now" description="At-risk, delayed and overdue projects will surface here automatically." />
          ) : (
            <div className="divide-y divide-line rounded-md border border-line bg-paper-card">
              {needsAttention.map((project) => (
                <div key={project.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-ink">{project.name}</p>
                      <StatusBadge status={project.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-soft">
                      {project.code} · {project.progressPercent}% complete
                      {project.expectedCompletionDate && ` · due ${formatDate(project.expectedCompletionDate)}`}
                    </p>
                  </div>
                  <Link href={`/ceo/projects/${project.id}`} className="shrink-0 text-sm font-medium text-signal-700 hover:underline">
                    View project
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink">All projects</h2>
            <Link href="/ceo/projects" className="text-sm font-medium text-signal-700 hover:underline">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto rounded-md border border-line bg-paper-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-slate-soft">
                  <th className="px-4 py-2.5 font-medium">Project</th>
                  <th className="px-4 py-2.5 font-medium">Manager</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Priority</th>
                  <th className="px-4 py-2.5 font-medium">Progress</th>
                  <th className="px-4 py-2.5 font-medium">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {projects.slice(0, 10).map((project) => (
                  <tr key={project.id} className="border-b border-line last:border-0 hover:bg-paper">
                    <td className="px-4 py-3">
                      <Link href={`/ceo/projects/${project.id}`} className="font-medium text-ink hover:underline">
                        {project.name}
                      </Link>
                      <p className="text-xs text-slate-soft">{project.code}</p>
                    </td>
                    <td className="px-4 py-3 text-slate">{project.projectManager?.name ?? "Unassigned"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={project.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={project.progressPercent} className="w-20" />
                        <span className="tabular text-xs text-slate-soft">{project.progressPercent}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate">{formatDate(project.expectedCompletionDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
