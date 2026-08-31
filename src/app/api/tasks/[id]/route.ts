import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { requireSession, requireRole } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-utils";
import { updateTaskSchema } from "@/lib/validators/task";
import { getAuthorizedTask } from "@/lib/authz";
import { logActivity } from "@/lib/activity";

interface Params {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = requireSession(await getSession());
    const task = await getAuthorizedTask(params.id, session);
    return NextResponse.json({ data: task });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = requireSession(await getSession());
    // Reassignment, retitling, rescheduling, and deadline changes are
    // management actions — only the CEO performs a full update in Phase 1.
    // Assignees update their own status/progress via the dedicated routes.
    requireRole(session, ["CEO"]);
    await getAuthorizedTask(params.id, session);

    const body = await request.json();
    const input = updateTaskSchema.parse(body);
    const { startDate, dueDate, ...rest } = input;

    const task = await prisma.task.update({
      where: { id: params.id },
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      },
    });

    await logActivity({
      entityType: "TASK",
      entityId: task.id,
      projectId: task.projectId,
      taskId: task.id,
      actorId: session.userId,
      action: "TASK_UPDATED",
      metadata: { changes: Object.keys(rest) },
    });

    return NextResponse.json({ data: task });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = requireSession(await getSession());
    requireRole(session, ["CEO"]);
    await getAuthorizedTask(params.id, session);

    await prisma.task.update({ where: { id: params.id }, data: { deletedAt: new Date() } });

    await logActivity({
      entityType: "TASK",
      entityId: params.id,
      taskId: params.id,
      actorId: session.userId,
      action: "TASK_ARCHIVED",
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
