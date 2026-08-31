import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { requireSession } from "@/lib/rbac";
import { handleApiError, NotFoundError } from "@/lib/api-utils";
import { ForbiddenError } from "@/lib/rbac";
import { createTaskSchema } from "@/lib/validators/task";
import { logActivity } from "@/lib/activity";
import { listTasks } from "@/lib/queries/tasks";

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(await getSession());
    const { searchParams } = new URL(request.url);

    // Object-level authorization (staff limited to their own assignments)
    // lives inside listTasks() so it can never be bypassed by a caller that
    // forgets to filter.
    const tasks = await listTasks(session, {
      status: searchParams.get("status") || undefined,
      priority: searchParams.get("priority") || undefined,
      projectId: searchParams.get("projectId") || undefined,
      search: searchParams.get("search") || undefined,
    });

    return NextResponse.json({ data: tasks });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireSession(await getSession());
    const body = await request.json();
    const input = createTaskSchema.parse(body);

    const project = await prisma.project.findFirst({
      where: { id: input.projectId, deletedAt: null },
      include: { members: true },
    });
    if (!project) throw new NotFoundError("Project not found");

    // CEO can create a task on any project. A staff member may only create
    // tasks on a project they belong to (e.g. breaking their own work down).
    if (session.role === "STAFF" && !project.members.some((m) => m.userId === session.userId)) {
      throw new ForbiddenError("You are not assigned to this project");
    }

    if (input.assignedToId) {
      const assigneeIsMember = project.members.some((m) => m.userId === input.assignedToId);
      if (!assigneeIsMember) {
        throw new ForbiddenError("The assignee must be a member of the project");
      }
    }

    const { startDate, dueDate, ...rest } = input;
    const task = await prisma.task.create({
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        createdById: session.userId,
      },
    });

    await logActivity({
      entityType: "TASK",
      entityId: task.id,
      projectId: task.projectId,
      taskId: task.id,
      actorId: session.userId,
      action: "TASK_CREATED",
      metadata: { title: task.title, assignedToId: task.assignedToId },
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
