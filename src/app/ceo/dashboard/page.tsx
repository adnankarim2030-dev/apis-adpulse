import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCeoDashboardData } from "@/lib/queries/dashboard";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { friendlyDate, daysUntil } from "@/lib/format";
import { formatBlockerReason } from "@/lib/labels";

export default async function CeoDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "CEO") redirect("/login");

  const [{ kpis, projects }, openBlockers, statusRequests] = await Promise.all([
    getCeoDashboardData(session),
    prisma.blocker.findMany({
      where: { resolvedAt: null },
      include: {
        task: { select: { id: true, title: true, projectId: true, project: { select: { name: true } } } },
        reportedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.statusRequest.findMany({
      include: {
        requestedTo: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const needsAttention = projects.filter(
    (p) =>
      p.status === "AT_RISK" ||
      p.status === "DELAYED" ||
      (p.expectedCompletionDate &&
        daysUntil(p.expectedCompletionDate) !== null &&
        (daysUntil(p.expectedCompletionDate) as number) < 0 &&
        p.status !== "COMPLETED")
  );

  // Status request stats: Asked / Replied / Waiting
  const askedCount = statusRequests.length;
  const repliedCount = statusRequests.filter((r) => r.status === "RESPONDED").length;
  const waitingRequests = statusRequests.filter((r) => r.status === "PENDING");
  const waitingCount = waitingRequests.length;
  const unrepliedNames = Array.from(new Set(waitingRequests.map((r) => r.requestedTo.name)));

  const lateOrNeedsAttentionCount = kpis.atRiskProjects + (kpis.overdueProjects > 0 ? kpis.overdueProjects : 0);

  return (
    <AppShell role="CEO" activePath="/ceo/dashboard" name={session.name} userId={session.userId} title="CEO Dashboard">
      <div className="space-y-8">
        {/* 1. "Needs your attention" FIRST (Projects + Open Blockers) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-danger-text animate-pulse" />
              <h2 className="text-lg font-bold text-text">Needs your attention</h2>
            </div>
            <div className="flex items-center gap-2">
              {openBlockers.length > 0 && (
                <span className="text-xs font-semibold rounded-chip bg-warning/20 text-warning-text px-2.5 py-0.5 border border-warning-text/30">
                  ⚠️ {openBlockers.length} Blocker{openBlockers.length === 1 ? "" : "s"}
                </span>
              )}
              <span className="text-xs font-semibold rounded-chip bg-danger/15 text-danger-text px-2.5 py-0.5 border border-danger/30">
                {needsAttention.length} Project{needsAttention.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {/* Open Blockers List */}
          {openBlockers.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-warning-text uppercase tracking-wider">
                Active Staff Blockers
              </h3>
              {openBlockers.map((b) => (
                <div
                  key={b.id}
                  className="rounded-card border-2 border-warning-text/40 bg-warning/10 p-4 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold rounded-chip bg-warning-text text-white px-2 py-0.5">
                        {formatBlockerReason(b.reason)}
                      </span>
                      <h4 className="text-sm font-bold text-text truncate max-w-sm">
                        {b.task.title}
                      </h4>
                    </div>
                    <p className="text-xs text-muted">
                      Reported by <strong className="text-text">{b.reportedBy.name}</strong> • Project:{" "}
                      {b.task.project?.name ?? "—"}
                      {b.note && <span className="italic"> — &ldquo;{b.note}&rdquo;</span>}
                    </p>
                  </div>

                  <Link
                    href={`/ceo/projects/${b.task.projectId}`}
                    className="inline-flex items-center justify-center rounded-button bg-primary hover:bg-primary-hover text-white text-xs font-bold px-3.5 py-2 min-h-[40px] shrink-0"
                  >
                    Open Project
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Needs Attention Projects */}
          {needsAttention.length === 0 && openBlockers.length === 0 ? (
            <EmptyState
              title="Nothing urgent right now"
              description="All active projects and tasks are on track. At-risk projects and blockers will surface here."
              icon="✅"
            />
          ) : (
            needsAttention.length > 0 && (
              <div className="space-y-3">
                {needsAttention.map((project) => (
                  <div
                    key={project.id}
                    className="rounded-card border border-danger/30 bg-surface p-4 md:p-5 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-text truncate max-w-sm">
                          {project.name}
                        </h3>
                        <StatusBadge status={project.status} />
                      </div>
                      <p className="text-xs font-medium text-muted">
                        {project.code} • {project.progressPercent}% complete • Due{" "}
                        <span className="font-bold text-danger-text">
                          {friendlyDate(project.expectedCompletionDate)}
                        </span>
                      </p>
                    </div>

                    <Link
                      href={`/ceo/projects/${project.id}`}
                      className="inline-flex items-center justify-center rounded-button bg-primary hover:bg-primary-hover text-white text-sm font-bold px-4 py-2 min-h-[44px] transition-colors shrink-0 shadow-xs"
                    >
                      Open project
                    </Link>
                  </div>
                ))}
              </div>
            )
          )}
        </section>

        {/* 2. Headline Numbers + "Waiting for replies" Card */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-text">Overview</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Active projects" value={kpis.totalActiveProjects} />
            <KpiCard
              label="Late or needs attention"
              value={lateOrNeedsAttentionCount}
              tone={lateOrNeedsAttentionCount > 0 ? "critical" : "default"}
            />
            <KpiCard
              label="Due this week"
              value={kpis.dueThisWeek}
              tone={kpis.dueThisWeek > 0 ? "signal" : "default"}
            />
            <KpiCard label="Open tasks" value={kpis.pendingTasks} />
          </div>

          {/* B2: CEO "Waiting for replies" Card */}
          <div className="rounded-card border border-border bg-surface p-5 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">💬</span>
                <h3 className="text-sm font-bold text-text">Status Requests (Waiting for replies)</h3>
              </div>
              <span className="text-xs font-semibold text-muted">
                {waitingCount > 0 ? `${waitingCount} waiting` : "All replied"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-button bg-neutral/50 p-2.5">
                <span className="text-xs text-muted block">Asked</span>
                <span className="text-lg font-bold text-text">{askedCount}</span>
              </div>
              <div className="rounded-button bg-success/20 p-2.5 text-success-text">
                <span className="text-xs block">Replied</span>
                <span className="text-lg font-bold">{repliedCount}</span>
              </div>
              <div className="rounded-button bg-warning/20 p-2.5 text-warning-text">
                <span className="text-xs block">Waiting</span>
                <span className="text-lg font-bold">{waitingCount}</span>
              </div>
            </div>

            {unrepliedNames.length > 0 && (
              <p className="text-xs text-muted pt-1 border-t border-border/60">
                Awaiting replies from:{" "}
                <span className="font-bold text-text">{unrepliedNames.join(", ")}</span>
              </p>
            )}
          </div>

          {/* Collapsible "More numbers" */}
          <details className="group rounded-card border border-border bg-surface p-4 shadow-soft">
            <summary className="cursor-pointer text-sm font-semibold text-primary select-none flex items-center justify-between">
              <span>More numbers</span>
              <span className="transition-transform group-open:rotate-180 text-xs">▼</span>
            </summary>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 pt-4 mt-3 border-t border-border">
              <KpiCard label="Completed projects" value={kpis.completedProjects} />
              <KpiCard label="Due today" value={kpis.dueToday} />
              <KpiCard label="Completed tasks" value={kpis.completedTasks} />
              <KpiCard label="Active staff" value={kpis.activeStaff} />
              <KpiCard label="Total staff" value={kpis.totalStaff} />
            </div>
          </details>
        </section>

        {/* 3. All projects list */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text">All projects</h2>
            <Link
              href="/ceo/projects"
              className="text-sm font-semibold text-primary hover:underline"
            >
              View all projects
            </Link>
          </div>

          {/* Mobile: Stacked Cards */}
          <div className="space-y-3 md:hidden">
            {projects.slice(0, 10).map((project) => (
              <div
                key={project.id}
                className="rounded-card border border-border bg-surface p-4 shadow-soft space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/ceo/projects/${project.id}`}
                      className="text-base font-bold text-text hover:text-primary transition-colors block leading-snug"
                    >
                      {project.name}
                    </Link>
                    <p className="text-xs text-subtle font-medium">{project.code}</p>
                  </div>
                  <StatusBadge status={project.status} />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Progress</span>
                    <span className="font-bold tabular">{project.progressPercent}%</span>
                  </div>
                  <ProgressBar value={project.progressPercent} />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs font-medium text-muted">
                  <span>Manager: {project.projectManager?.name ?? "—"}</span>
                  <span>Due: {friendlyDate(project.expectedCompletionDate)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (md+) */}
          <div className="hidden md:block overflow-hidden rounded-card border border-border bg-surface shadow-soft">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-neutral/50 text-xs font-semibold text-muted">
                  <th className="px-5 py-3">Project</th>
                  <th className="px-5 py-3">Manager</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Progress</th>
                  <th className="px-5 py-3">Deadline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.slice(0, 10).map((project) => (
                  <tr key={project.id} className="hover:bg-neutral/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/ceo/projects/${project.id}`}
                        className="font-bold text-text hover:text-primary transition-colors block"
                      >
                        {project.name}
                      </Link>
                      <p className="text-xs text-subtle">{project.code}</p>
                    </td>
                    <td className="px-5 py-3.5 text-muted font-medium">
                      {project.projectManager?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <PriorityBadge priority={project.priority} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={project.progressPercent} className="w-20" />
                        <span className="text-xs font-semibold text-muted tabular">
                          {project.progressPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-muted">
                      {friendlyDate(project.expectedCompletionDate)}
                    </td>
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
