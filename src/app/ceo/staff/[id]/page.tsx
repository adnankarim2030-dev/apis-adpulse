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
import { formatDate } from "@/lib/format";

export default async function StaffDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "CEO") redirect("/login");

  const detail = await getStaffWorkloadDetail(params.id);
  if (!detail) notFound();

  return (
    <AppShell role="CEO" activePath="/ceo/staff" name={session.name} title={detail.staff.name}>
      <div className="space-y-6">
        <Card>
          <CardBody className="flex items-center gap-4">
            <Avatar name={detail.staff.name} size={44} />
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">{detail.staff.name}</h2>
              <p className="text-sm text-slate-soft">
                {detail.staff.jobTitle ?? "—"}
                {detail.staff.department ? ` · ${detail.staff.department}` : ""} · {detail.staff.email}
              </p>
            </div>
          </CardBody>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Active Tasks" value={detail.summary.activeTasks} />
          <KpiCard label="Critical" value={detail.summary.criticalTasks} tone={detail.summary.criticalTasks > 0 ? "signal" : "default"} />
          <KpiCard label="Overdue" value={detail.summary.overdueTasks} tone={detail.summary.overdueTasks > 0 ? "critical" : "default"} />
          <KpiCard label="Completed" value={detail.summary.completedTasks} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <h2 className="font-display text-base font-semibold text-ink">Active tasks</h2>
            </CardHeader>
            <CardBody>
              {detail.tasks.length === 0 ? (
                <EmptyState title="No active tasks" description="This person has no open tasks right now." />
              ) : (
                <div className="divide-y divide-line">
                  {detail.tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{task.title}</p>
                        <p className="mt-0.5 text-xs text-slate-soft">
                          {task.project.name}
                          {task.dueDate && ` · due ${formatDate(task.dueDate)}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <PriorityBadge priority={task.priority} />
                        <StatusBadge status={task.status} />
                        <div className="w-20">
                          <ProgressBar value={task.progressPercent} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-display text-base font-semibold text-ink">Projects ({detail.projects.length})</h2>
            </CardHeader>
            <CardBody>
              {detail.projects.length === 0 ? (
                <p className="text-sm text-slate-soft">Not assigned to any project.</p>
              ) : (
                <ul className="space-y-2.5">
                  {detail.projects.map((project) => (
                    <li key={project.id}>
                      <Link href={`/ceo/projects/${project.id}`} className="text-sm font-medium text-ink hover:underline">
                        {project.name}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-2">
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

        <Link href="/ceo/staff" className="block text-sm font-medium text-signal-700 hover:underline">
          ← Back to staff
        </Link>
      </div>
    </AppShell>
  );
}
