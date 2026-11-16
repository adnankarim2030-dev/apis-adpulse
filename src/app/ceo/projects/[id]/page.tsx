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
import { friendlyDate } from "@/lib/format";
import { AddTaskForm } from "./AddTaskForm";
import { AskForUpdateModal } from "@/components/tasks/AskForUpdateModal";

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

  const memberUsers = project.members.map((m) => m.user);

  return (
    <AppShell role="CEO" activePath="/ceo/projects" name={session.name} userId={session.userId} title={project.name}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/ceo/projects"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            ← Back to all projects
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Project Overview Card */}
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-subtle">{project.code}</p>
                  <h2 className="text-xl font-bold text-text leading-tight">{project.name}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <AskForUpdateModal
                    projectId={project.id}
                    taskTitle={project.name}
                    assigneeId={project.projectManagerId}
                    assigneeName={project.projectManager?.name}
                    availableStaff={memberUsers}
                  />
                  <PriorityBadge priority={project.priority} />
                  <StatusBadge status={project.status} />
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                {project.description && (
                  <p className="text-sm text-muted leading-relaxed">{project.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4 pt-2 border-t border-border/60">
                  <div>
                    <p className="text-xs font-semibold text-subtle uppercase tracking-wider">Client</p>
                    <p className="font-semibold text-text mt-0.5">{project.client?.name ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-subtle uppercase tracking-wider">Manager</p>
                    <p className="font-semibold text-text mt-0.5">{project.projectManager?.name ?? "Unassigned"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-subtle uppercase tracking-wider">Department</p>
                    <p className="font-semibold text-text mt-0.5">{project.department ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-subtle uppercase tracking-wider">Deadline</p>
                    <p className="font-semibold text-text mt-0.5">
                      {friendlyDate(project.expectedCompletionDate)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted">
                    <span>Overall Progress</span>
                    <span className="tabular">{project.progressPercent}%</span>
                  </div>
                  <ProgressBar value={project.progressPercent} />
                </div>
              </CardBody>
            </Card>

            {/* Tasks Card */}
            <Card>
              <CardHeader className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-text">Tasks ({tasks.length})</h2>
                  <p className="text-xs text-subtle">Work items linked to this project</p>
                </div>
                <AddTaskForm projectId={project.id} members={memberUsers} />
              </CardHeader>
              <CardBody>
                {tasks.length === 0 ? (
                  <EmptyState
                    title="No tasks yet"
                    description="Add the first task above to start tracking progress on this project."
                    icon="📝"
                  />
                ) : (
                  <div className="divide-y divide-border">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5"
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="text-base font-bold text-text truncate">{task.title}</p>
                          <p className="text-xs text-muted">
                            {task.assignedTo ? task.assignedTo.name : "Unassigned"} • Due{" "}
                            {friendlyDate(task.dueDate)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                          {/* CEO Ask For Update Button on every task row */}
                          <AskForUpdateModal
                            taskId={task.id}
                            projectId={project.id}
                            taskTitle={task.title}
                            assigneeId={task.assignedTo?.id}
                            assigneeName={task.assignedTo?.name}
                            availableStaff={memberUsers}
                          />
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
          </div>

          {/* Right Sidebar: Team & Activity */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-base font-bold text-text">Team ({project.members.length})</h2>
              </CardHeader>
              <CardBody>
                {project.members.length === 0 ? (
                  <p className="text-sm text-subtle">No staff assigned yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {project.members.map((member) => (
                      <li key={member.userId} className="flex items-center gap-3">
                        <Avatar name={member.user.name} size={32} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-text">{member.user.name}</p>
                          <p className="truncate text-xs text-subtle">
                            {member.user.jobTitle ?? member.user.email}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-base font-bold text-text">Recent Activity</h2>
              </CardHeader>
              <CardBody>
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-subtle">No activity recorded yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {recentActivity.map((entry) => (
                      <li key={entry.id} className="text-sm">
                        <p className="text-text">
                          <span className="font-bold">{entry.actor.name}</span> —{" "}
                          <span className="text-muted">
                            {entry.action.replaceAll("_", " ").toLowerCase()}
                          </span>
                        </p>
                        <p className="text-xs text-subtle mt-0.5">{friendlyDate(entry.createdAt)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
