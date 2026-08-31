import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAuthorizedProject } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/api-utils";
import { ForbiddenError } from "@/lib/rbac";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import { AddTaskForm } from "./AddTaskForm";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "CEO") redirect("/login");

  let project;
  try {
    project = await getAuthorizedProject(params.id, session);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ForbiddenError) notFound();
    throw error;
  }

  const [tasks, recentActivity] = await Promise.all([
    prisma.task.findMany({
      where: { projectId: params.id, deletedAt: null },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        progressPercent: true,
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
    }),
    prisma.activityLog.findMany({
      where: { projectId: params.id },
      select: { id: true, action: true, createdAt: true, actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  return (
    <AppShell role="CEO" activePath="/ceo/projects" name={session.name} title={project.name}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-soft">{project.code}</p>
                <h2 className="font-display text-lg font-semibold text-ink">{project.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                <PriorityBadge priority={project.priority} />
                <StatusBadge status={project.status} />
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              {project.description && <p className="text-sm text-slate">{project.description}</p>}
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-soft">Client</p>
                  <p className="text-ink">{project.client?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-soft">Manager</p>
                  <p className="text-ink">{project.projectManager?.name ?? "Unassigned"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-soft">Department</p>
                  <p className="text-ink">{project.department ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-soft">Target completion</p>
                  <p className="text-ink">{formatDate(project.expectedCompletionDate)}</p>
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-soft">
                  <span>Progress</span>
                  <span className="tabular">{project.progressPercent}%</span>
                </div>
                <ProgressBar value={project.progressPercent} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-ink">Tasks ({tasks.length})</h2>
              <AddTaskForm projectId={project.id} members={project.members.map((m) => m.user)} />
            </CardHeader>
            <CardBody>
              {tasks.length === 0 ? (
                <EmptyState title="No tasks yet" description="Add the first task to start tracking progress on this project." />
              ) : (
                <div className="divide-y divide-line">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{task.title}</p>
                        <p className="mt-0.5 text-xs text-slate-soft">
                          {task.assignedTo ? task.assignedTo.name : "Unassigned"}
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
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="font-display text-base font-semibold text-ink">Team ({project.members.length})</h2>
            </CardHeader>
            <CardBody>
              {project.members.length === 0 ? (
                <p className="text-sm text-slate-soft">No staff assigned yet.</p>
              ) : (
                <ul className="space-y-3">
                  {project.members.map((member) => (
                    <li key={member.userId} className="flex items-center gap-2.5">
                      <Avatar name={member.user.name} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{member.user.name}</p>
                        <p className="truncate text-xs text-slate-soft">{member.user.jobTitle ?? member.user.email}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-display text-base font-semibold text-ink">Recent activity</h2>
            </CardHeader>
            <CardBody>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-slate-soft">No activity recorded yet.</p>
              ) : (
                <ul className="space-y-3">
                  {recentActivity.map((entry) => (
                    <li key={entry.id} className="text-sm">
                      <p className="text-ink">
                        <span className="font-medium">{entry.actor.name}</span> — {entry.action.replaceAll("_", " ").toLowerCase()}
                      </p>
                      <p className="text-xs text-slate-soft">{formatDate(entry.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Link href="/ceo/projects" className="block text-sm font-medium text-signal-700 hover:underline">
            ← Back to all projects
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
