import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { requireSession } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(await getSession());
    const { searchParams } = new URL(request.url);

    const sinceParam = searchParams.get("since");
    // Default to last 15 seconds if since not provided
    const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 15000);

    const newLogs = await prisma.activityLog.findMany({
      where: {
        createdAt: { gt: since },
        actorId: { not: session.userId }, // don't notify for own messages
        OR: [
          // 1. Direct message sent TO current user
          { action: "DIRECT_CHAT", entityId: session.userId },
          // 2. Company-wide general announcement
          { action: "GENERAL_CHAT" },
        ],
      },
      include: {
        actor: { select: { id: true, name: true, jobTitle: true, department: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const messages = newLogs.map((log) => ({
      id: log.id,
      senderId: log.actorId,
      senderName: log.actor.name,
      senderTitle: log.actor.jobTitle || log.actor.department || "Team Member",
      content: (log.metadata as any)?.message || "",
      channelType: log.action === "DIRECT_CHAT" ? "DIRECT" : "GENERAL",
      // For replying to a direct message, channelId is the sender's user ID
      channelId: log.action === "DIRECT_CHAT" ? log.actorId : "general",
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json({
      data: messages,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
