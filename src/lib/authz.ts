import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";
import { ForbiddenError } from "@/lib/rbac";
import { NotFoundError } from "@/lib/api-utils";

/**
 * Object-level authorization for projects. CEO can access every
 * non-deleted project; staff can only access projects they're a member of.
 * Always call this before returning or mutating project data — role checks
 * alone are not enough (see APIS spec section 3: "Staff must NOT be able to
 * access unauthorized staff data").
 */
export async function getAuthorizedProject(projectId: string, session: SessionPayload) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: {
      client: true,
      projectManager: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      members: { include: { user: { select: { id: true, name: true, email: true, jobTitle: true } } } },
    },
  });
  if (!project) throw new NotFoundError("Project not found");

  if (session.role === "STAFF") {
    const isMember = project.members.some((m) => m.userId === session.userId);
    if (!isMember) throw new ForbiddenError("You are not assigned to this project");
  }

  return project;
}

/**
 * Object-level authorization for tasks. CEO can access any task; staff can
 * only access tasks assigned to them or tasks within a project they belong
 * to (read access to project-mates' tasks; write access enforced separately
 * for the assignee-only mutations like status/progress).
 */
export async function getAuthorizedTask(taskId: string, session: SessionPayload) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
    include: {
      project: { select: { id: true, name: true, code: true, members: { select: { userId: true } } } },
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!task) throw new NotFoundError("Task not found");

  if (session.role === "STAFF") {
    const isProjectMember = task.project.members.some((m) => m.userId === session.userId);
    if (!isProjectMember) throw new ForbiddenError("You do not have access to this task");
  }

  return task;
}

/** Only the assignee (or the CEO) may update a task's own status/progress. */
export function assertCanUpdateTaskProgress(
  task: { assignedToId: string | null },
  session: SessionPayload
) {
  if (session.role === "CEO") return;
  if (task.assignedToId !== session.userId) {
    throw new ForbiddenError("Only the assigned staff member can update this task's progress");
  }
}
