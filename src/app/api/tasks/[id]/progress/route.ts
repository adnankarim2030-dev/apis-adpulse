import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { requireSession } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-utils";
import { updateTaskProgressSchema } from "@/lib/validators/task";
import { getAuthorizedTask, assertCanUpdateTaskProgress } from "@/lib/authz";
import { logActivity } from "@/lib/activity";

interface Params {
  params: { id: string };
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = requireSession(await getSession());
    const task = await getAuthorizedTask(params.id, session);
    assertCanUpdateTaskProgress(task, session);

    const body = await request.json();
    const { progressPercent } = updateTaskProgressSchema.parse(body);
    const completing = progressPercent >= 100;

    const updated = await prisma.task.update({
      where: { id: params.id },
      data: {
        progressPercent,
        status: completing ? "COMPLETED" : task.status === "COMPLETED" ? "IN_PROGRESS" : task.status,
        completedAt: completing ? new Date() : null,
      },
    });

    await logActivity({
      entityType: "TASK",
      entityId: task.id,
      projectId: task.projectId,
      taskId: task.id,
      actorId: session.userId,
      action: "TASK_PROGRESS_UPDATED",
      metadata: { from: task.progressPercent, to: progressPercent },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
