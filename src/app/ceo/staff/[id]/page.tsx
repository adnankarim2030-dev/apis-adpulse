import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getStaffWorkloadDetail } from "@/lib/queries/staff";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { friendlyDate } from "@/lib/format";

export default async function StaffDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "CEO") redirect("/login");

  const detail = await getStaffWorkloadDetail(params.id);
  if (!detail) notFound();

  return (
    <AppShell role="CEO" activePath="/ceo/staff" name={session.name} userId={session.userId} title={detail.staff.name}>
      <div className="space-y-6">
        <Link
          href="/ceo/staff"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          ← Back to Team
        </Link>

        <Card>
          <CardBody className="flex items-center gap-4">
            <Avatar name={detail.staff.name} size={48} />
            <div>
              <h2 className="text-xl font-bold text-text">{detail.staff.name}</h2>
              <p className="text-sm text-muted">
                {detail.staff.jobTitle ?? "Team Member"}
                {detail.staff.department ? ` · ${detail.staff.department}` : ""} · {detail.staff.email}
              </p>
            </div>
          </CardBody>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Active Tasks" value={detail.summary.activeTasks} />
          <KpiCard
            label="Critical"
            value={detail.summary.criticalTasks}
            tone={detail.summary.criticalTasks > 0 ? "critical" : "default"}
          />
          <KpiCard
            label="Overdue"
            value={detail.summary.overdueTasks}
            tone={detail.summary.overdueTasks > 0 ? "critical" : "default"}
          />
          <KpiCard label="Completed" value={detail.summary.completedTasks} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <h2 className="text-base font-bold text-text">Active Tasks</h2>
            </CardHeader>
            <CardBody>
              {detail.tasks.length === 0 ? (
                <EmptyState
                  title="No active tasks"
                  description="This person has no open tasks right now."
                  icon="🎉"
                />
              ) : (
                <div className="divide-y divide-border">
                  {detail.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-base font-bold text-text truncate">{task.title}</p>
                        <p className="text-xs text-muted">
                          {task.project.name} • Due {friendlyDate(task.dueDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <PriorityBadge priority={task.priority} />
                        <StatusBadge status={task.status} />
                        <div className="w-20 hidden sm:block">
                          <ProgressBar value={task.progressPercent} />
                        </div>
                        <span className="text-xs font-semibold text-muted tabular sm:hidden">
                          {task.progressPercent}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-base font-bold text-text">
                Projects ({detail.projects.length})
              </h2>
            </CardHeader>
            <CardBody>
              {detail.projects.length === 0 ? (
                <p className="text-sm text-subtle">Not assigned to any project.</p>
              ) : (
                <ul className="space-y-3">
                  {detail.projects.map((project) => (
                    <li key={project.id} className="rounded-button bg-neutral/40 p-3 space-y-1.5">
                      <Link
                        href={`/ceo/projects/${project.id}`}
                        className="text-sm font-bold text-text hover:text-primary transition-colors block leading-snug"
                      >
                        {project.name}
                      </Link>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={project.status} />
                        <PriorityBadge priority={project.priority} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
