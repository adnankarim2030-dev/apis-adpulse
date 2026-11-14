import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { requireSession, requireRole } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-utils";
import { logActivity } from "@/lib/activity";
import type { StatusRequestKind } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const session = requireSession(await getSession());
    // Only CEO can create a status request
    requireRole(session, ["CEO"]);

    const body = await request.json();
    const { taskId, projectId, requestedToId, kind = "STATUS", message } = body;

    if (!requestedToId) {
      return NextResponse.json({ error: "Assignee / recipient is required" }, { status: 400 });
    }

    const statusRequest = await prisma.statusRequest.create({
      data: {
        taskId: taskId || undefined,
        projectId: projectId || undefined,
        requestedById: session.userId,
        requestedToId,
        kind: kind as StatusRequestKind,
        message: message ? String(message).trim() : undefined,
      },
      include: {
        requestedTo: { select: { id: true, name: true, email: true } },
        task: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
      },
    });

    // Log activity
    if (taskId) {
      await logActivity({
        entityType: "TASK",
        entityId: taskId,
        taskId,
        projectId: projectId || undefined,
        actorId: session.userId,
        action: "STATUS_REQUEST_SENT",
        metadata: { requestedToId, kind },
      });
    }

    return NextResponse.json({ data: statusRequest });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(_request: NextRequest) {
  try {
    const session = requireSession(await getSession());

    // CEO sees all; staff sees only requests addressed to them
    const where = session.role === "CEO" ? {} : { requestedToId: session.userId };

    const requests = await prisma.statusRequest.findMany({
      where,
      include: {
        requestedBy: { select: { id: true, name: true } },
        requestedTo: { select: { id: true, name: true, email: true } },
        task: { select: { id: true, title: true, status: true, progressPercent: true } },
        project: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: requests });
  } catch (error) {
    return handleApiError(error);
  }
}
