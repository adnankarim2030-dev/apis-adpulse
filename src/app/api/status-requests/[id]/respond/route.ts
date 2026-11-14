import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { requireSession, ForbiddenError } from "@/lib/rbac";
import { handleApiError, NotFoundError } from "@/lib/api-utils";
import { logActivity } from "@/lib/activity";
import type { StatusResponseStatus, DeadlineOutlook, BlockerReason, TaskStatus } from "@/types";

interface Params {
  params: { id: string };
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = requireSession(await getSession());

    const statusReq = await prisma.statusRequest.findUnique({
      where: { id: params.id },
      include: { task: true },
    });

    if (!statusReq) {
      throw new NotFoundError("Status request not found");
    }

    // Only the addressee may respond (403 for anyone else)
    if (statusReq.requestedToId !== session.userId) {
      throw new ForbiddenError("Only the addressee may respond to this status request");
    }

    const body = await request.json();
    const {
      responseStatus,
      responseProgress,
      deadlineOutlook,
      responseNote,
      blockerReason,
    }: {
      responseStatus?: StatusResponseStatus;
      responseProgress?: number;
      deadlineOutlook?: DeadlineOutlook;
      responseNote?: string;
      blockerReason?: BlockerReason;
    } = body;

    // 1. Update the StatusRequest record
    const updatedRequest = await prisma.statusRequest.update({
      where: { id: params.id },
      data: {
        status: "RESPONDED",
        respondedAt: new Date(),
        responseStatus,
        responseProgress: typeof responseProgress === "number" ? responseProgress : undefined,
        deadlineOutlook,
        responseNote: responseNote ? String(responseNote).trim() : undefined,
      },
    });

    // 2. Update task status and progress if linked to a task
    if (statusReq.taskId && statusReq.task) {
      let targetStatus: TaskStatus = statusReq.task.status;
      let targetProgress = typeof responseProgress === "number" ? responseProgress : statusReq.task.progressPercent;

      if (responseStatus === "DONE") {
        targetStatus = "COMPLETED";
        targetProgress = 100;
      } else if (responseStatus === "STUCK") {
        targetStatus = "ON_HOLD";
        // Create blocker if reason provided
        if (blockerReason) {
          await prisma.blocker.create({
            data: {
              taskId: statusReq.taskId,
              reportedById: session.userId,
              reason: blockerReason,
              note: responseNote,
            },
          });
        }
      } else if (responseStatus === "ON_TRACK" || responseStatus === "SLIGHTLY_LATE") {
        if (statusReq.task.status === "NOT_STARTED" || statusReq.task.status === "ON_HOLD") {
          targetStatus = "IN_PROGRESS";
        }
      }

      await prisma.task.update({
        where: { id: statusReq.taskId },
        data: {
          status: targetStatus,
          progressPercent: targetProgress,
          completedAt: targetStatus === "COMPLETED" ? new Date() : undefined,
        },
      });

      // Log activity
      await logActivity({
        entityType: "TASK",
        entityId: statusReq.taskId,
        taskId: statusReq.taskId,
        projectId: statusReq.projectId || statusReq.task.projectId,
        actorId: session.userId,
        action: "STATUS_REQUEST_RESPONDED",
        metadata: {
          statusRequestId: statusReq.id,
          responseStatus,
          responseProgress: targetProgress,
          deadlineOutlook,
        },
      });
    }

    return NextResponse.json({ data: updatedRequest });
  } catch (error) {
    return handleApiError(error);
  }
}
