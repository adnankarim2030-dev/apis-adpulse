import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { requireSession } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-utils";
import { updateTaskStatusSchema } from "@/lib/validators/task";
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
    const { status } = updateTaskStatusSchema.parse(body);

    const updated = await prisma.task.update({
      where: { id: params.id },
      data: {
        status,
        progressPercent: status === "COMPLETED" ? 100 : task.progressPercent,
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
    });

    await logActivity({
      entityType: "TASK",
      entityId: task.id,
      projectId: task.projectId,
      taskId: task.id,
      actorId: session.userId,
      action: "TASK_STATUS_CHANGED",
      metadata: { from: task.status, to: status },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
