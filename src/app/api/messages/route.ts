import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { requireSession } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(await getSession());
    const { searchParams } = new URL(request.url);

    const channelType = searchParams.get("channelType") || "GENERAL";
    const channelId = searchParams.get("channelId") || "general";

    let logs;
    if (channelType === "PROJECT") {
      logs = await prisma.activityLog.findMany({
        where: {
          entityType: "PROJECT",
          entityId: channelId,
          action: "PROJECT_CHAT",
        },
        include: {
          actor: { select: { id: true, name: true, jobTitle: true, department: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 100,
      });
    } else if (channelType === "DIRECT") {
      // Direct message between session.userId and channelId
      logs = await prisma.activityLog.findMany({
        where: {
          action: "DIRECT_CHAT",
          OR: [
            { actorId: session.userId, entityId: channelId },
            { actorId: channelId, entityId: session.userId },
          ],
        },
        include: {
          actor: { select: { id: true, name: true, jobTitle: true, department: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 100,
      });
    } else {
      // General Team Channel
      logs = await prisma.activityLog.findMany({
        where: {
          action: "GENERAL_CHAT",
        },
        include: {
          actor: { select: { id: true, name: true, jobTitle: true, department: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 100,
      });
    }

    const messages = logs.map((l) => ({
      id: l.id,
      senderId: l.actorId,
      senderName: l.actor.name,
      senderTitle: l.actor.jobTitle,
      content: (l.metadata as any)?.message || "",
      createdAt: l.createdAt.toISOString(),
      channelId: l.entityId,
    }));

    return NextResponse.json({ data: messages });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireSession(await getSession());
    const body = await request.json();

    const channelType = body.channelType || "GENERAL";
    const channelId = body.channelId || "general";
    const content = String(body.content || "").trim();

    if (!content) {
      return NextResponse.json({ error: "Message content cannot be empty" }, { status: 400 });
    }

    let entityType: "PROJECT" | "USER" = "PROJECT";
    let action = "GENERAL_CHAT";

    if (channelType === "PROJECT") {
      entityType = "PROJECT";
      action = "PROJECT_CHAT";
    } else if (channelType === "DIRECT") {
      entityType = "USER";
      action = "DIRECT_CHAT";
    }

    const newLog = await prisma.activityLog.create({
      data: {
        entityType,
        entityId: channelId,
        projectId: channelType === "PROJECT" ? channelId : undefined,
        actorId: session.userId,
        action,
        metadata: {
          message: content,
          senderName: session.name,
        },
      },
      include: {
        actor: { select: { id: true, name: true, jobTitle: true, department: true } },
      },
    });

    return NextResponse.json(
      {
        data: {
          id: newLog.id,
          senderId: newLog.actorId,
          senderName: newLog.actor.name,
          senderTitle: newLog.actor.jobTitle,
          content,
          createdAt: newLog.createdAt.toISOString(),
          channelId: newLog.entityId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = requireSession(await getSession());
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body?.id;
    }

    if (!id) {
      return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
    }

    const log = await prisma.activityLog.findUnique({
      where: { id },
    });

    if (!log) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Permission check: only the sender or a CEO/Executive can delete
    const isSender = log.actorId === session.userId;
    const isCEO = session.role === "CEO";

    if (!isSender && !isCEO) {
      return NextResponse.json(
        { error: "You are not authorized to delete this message" },
        { status: 403 }
      );
    }

    await prisma.activityLog.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: { id },
      message: "Message deleted successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

