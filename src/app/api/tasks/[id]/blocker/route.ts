import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { requireSession } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-utils";
import { getAuthorizedTask, assertCanUpdateTaskProgress } from "@/lib/authz";
import { logActivity } from "@/lib/activity";
import type { BlockerReason } from "@/types";

interface Params {
  params: { id: string };
}

const VALID_REASONS: BlockerReason[] = [
  "WAITING_CLIENT",
  "WAITING_APPROVAL",
  "WAITING_TEAMMATE",
  "TECHNICAL_ISSUE",
  "NEED_INFORMATION",
  "OTHER",
];

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = requireSession(await getSession());
    const task = await getAuthorizedTask(params.id, session);
    assertCanUpdateTaskProgress(task, session);

    const body = await request.json();
    const reason = body.reason as BlockerReason;
    const note = body.note ? String(body.note).trim() : undefined;

    if (!reason || !VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: "Invalid blocker reason" }, { status: 400 });
    }

    // 1. Create blocker record
    const blocker = await prisma.blocker.create({
      data: {
        taskId: params.id,
        reportedById: session.userId,
        reason,
        note,
      },
      include: {
        reportedBy: { select: { id: true, name: true } },
      },
    });

    // 2. Set task to ON_HOLD
    await prisma.task.update({
      where: { id: params.id },
      data: { status: "ON_HOLD" },
    });

    // 3. Log activity
    await logActivity({
      entityType: "TASK",
      entityId: task.id,
      projectId: task.projectId,
      taskId: task.id,
      actorId: session.userId,
      action: "TASK_BLOCKED",
      metadata: { reason, note },
    });

    return NextResponse.json({ data: blocker });
  } catch (error) {
    return handleApiError(error);
  }
}

// "Back to work" - Clears/resolves blocker and sets task back to IN_PROGRESS
export async function PATCH(_request: NextRequest, { params }: Params) {
  try {
    const session = requireSession(await getSession());
    const task = await getAuthorizedTask(params.id, session);
    assertCanUpdateTaskProgress(task, session);

    // 1. Mark unresolved blockers as resolved
    await prisma.blocker.updateMany({
      where: { taskId: params.id, resolvedAt: null },
      data: { resolvedAt: new Date() },
    });

    // 2. Set task status back to IN_PROGRESS ("Working on it")
    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: { status: "IN_PROGRESS" },
    });

    // 3. Log activity
    await logActivity({
      entityType: "TASK",
      entityId: task.id,
      projectId: task.projectId,
      taskId: task.id,
      actorId: session.userId,
      action: "TASK_UNBLOCKED",
    });

    return NextResponse.json({ data: updatedTask });
  } catch (error) {
    return handleApiError(error);
  }
}
